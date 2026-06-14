// Sarvam + Gemini voice-ordering loop — Quick-Voice-grade latency + multilingual replies.
//
// Per turn:
//   1. Fetch the recording from Twilio (.wav only, 1 quick retry, gateway fallback).
//   2. Sarvam STT-translate → English transcript + detected language.
//   3. If end-of-order intent → finalize cart → insert one `orders` row
//      (pending_credit_review, voice_call, financial-brain advisory) → hang up.
//   4. Else: Gemini extractor (1.2s cap) → fallback to deterministic catalog
//      matcher on miss. Append items to the per-call cart. Reply in the
//      caller's language and continue <Record>.
//   5. Miss counter: 1 miss with cart already non-empty auto-finalizes;
//      2 misses with empty cart hang up gracefully. No "I didn't catch"
//      ping-pong loop.

import { createFileRoute } from "@tanstack/react-router";
import {
  appendTurnServer, getCall, patchCall, putCall, setCart, getCart,
} from "@/lib/khataos/call-store.server";
import {
  isSarvamEnabled, sarvamTranslateSpeech, sarvamTranslateSpeechStreaming, sarvamTextToSpeech,
  type SarvamLangCode,
} from "@/lib/khataos/sarvam.server";
import { extractOrderFromTranscript, extractCatalogOrder } from "@/lib/khataos/order-extractor.server";
import { runFinancialBrain } from "@/lib/khataos/financial-brain.server";
import { SKU_NAMES_BY_LANG, UNIT_LABELS, type LangKey } from "@/lib/khataos/catalog";
import type { CartLine } from "@/lib/khataos/calls";

// ===== per-isolate miss counter & TTS cache =====
const g = globalThis as unknown as {
  __khataos_call_misses?: Map<string, number>;
  __khataos_tts_cache?: Map<string, string>; // key: `${lang}::${text}` → signed url
};
if (!g.__khataos_call_misses) g.__khataos_call_misses = new Map();
if (!g.__khataos_tts_cache) g.__khataos_tts_cache = new Map();
const MISSES = g.__khataos_call_misses!;
const TTS_CACHE = g.__khataos_tts_cache!;
const bumpMiss = (cid: string) => { const n = (MISSES.get(cid) ?? 0) + 1; MISSES.set(cid, n); return n; };
const resetMiss = (cid: string) => MISSES.delete(cid);

async function uploadTtsAndSign(cid: string, audio: Uint8Array): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const path = `${cid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.wav`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("twilio-tts")
    .upload(path, audio, { contentType: "audio/wav", upsert: false });
  if (upErr) throw new Error(`TTS upload failed: ${upErr.message}`);
  const { data, error: signErr } = await supabaseAdmin.storage
    .from("twilio-tts")
    .createSignedUrl(path, 600);
  if (signErr || !data?.signedUrl) throw new Error(`TTS sign failed: ${signErr?.message ?? "no url"}`);
  return data.signedUrl;
}

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}
function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function langToLabel(code: SarvamLangCode): "English" | "Hindi" | "Kannada" | "Tamil" | "Telugu" {
  return code === "hi-IN" ? "Hindi" : code === "kn-IN" ? "Kannada" : code === "ta-IN" ? "Tamil" : code === "te-IN" ? "Telugu" : "English";
}
function langToKey(code: SarvamLangCode): LangKey {
  return code === "hi-IN" ? "hi" : code === "kn-IN" ? "kn" : "en";
}
function langToTwilioVoice(code: SarvamLangCode): { voice: string; locale: string } {
  if (code === "hi-IN") return { voice: "Polly.Aditi", locale: "hi-IN" };
  if (code === "kn-IN") return { voice: "Google.kn-IN-Standard-A", locale: "kn-IN" };
  if (code === "ta-IN") return { voice: "Google.ta-IN-Standard-A", locale: "ta-IN" };
  if (code === "te-IN") return { voice: "Google.te-IN-Standard-A", locale: "te-IN" };
  return { voice: "Polly.Raveena", locale: "en-IN" };
}

function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /invalid_api_key|missing authentication|403|SARVAM_API_KEY/i.test(msg);
}

const END_INTENT_RE =
  /(?:^|\b)(that'?s? all|that is all|nothing else|no more|no thanks|i'?m done|i am done|done|finish|finished|stop|end call|hang up|that's it|thats it|cut the call|no|nope|bas|bus|kuch nahi|aur kuch nahi|aur kuchh nahi|nahi chahiye|ho gaya|saaku|saakaagide|mugiyitu|mugisi|po(?:d|du)?u|podhum|chaalu|chalu|enough|thank you|thanks)(?:$|\b)/i;

function looksLikeEndOfOrder(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return END_INTENT_RE.test(t);
}

// ===== Localized phrases =====
function phrasesAdded(items: string, code: SarvamLangCode): string {
  switch (code) {
    case "hi-IN": return `${items} जोड़ दिया। और कुछ चाहिए?`;
    case "kn-IN": return `${items} ಸೇರಿಸಲಾಗಿದೆ. ಇನ್ನೇನಾದರೂ ಬೇಕೆ?`;
    case "ta-IN": return `${items} சேர்க்கப்பட்டது. வேறு ஏதாவது வேண்டுமா?`;
    case "te-IN": return `${items} జోడించబడింది. ఇంకేమైనా కావాలా?`;
    default:      return `Added ${items}. Anything else?`;
  }
}
function phrasesConfirmed(items: string, code: SarvamLangCode): string {
  switch (code) {
    case "hi-IN": return `आपका ${items} का ऑर्डर मंज़ूरी के लिए भेज दिया गया है। धन्यवाद।`;
    case "kn-IN": return `ನಿಮ್ಮ ${items} ಆರ್ಡರ್ ಅನುಮೋದನೆಗಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ. ಧನ್ಯವಾದಗಳು.`;
    case "ta-IN": return `உங்கள் ${items} ஆர்டர் அனுமதிக்காக அனுப்பப்பட்டது. நன்றி.`;
    case "te-IN": return `మీ ${items} ఆర్డర్ ఆమోదం కోసం పంపబడింది. ధన్యవాదాలు.`;
    default:      return `Your order for ${items} has been sent for approval. Thank you.`;
  }
}
function phrasesGoodbyeEmpty(code: SarvamLangCode): string {
  switch (code) {
    case "hi-IN": return "ठीक है, कोई ऑर्डर नहीं। धन्यवाद।";
    case "kn-IN": return "ಸರಿ, ಯಾವುದೇ ಆರ್ಡರ್ ಇಲ್ಲ. ಧನ್ಯವಾದಗಳು.";
    case "ta-IN": return "சரி, ஆர்டர் இல்லை. நன்றி.";
    case "te-IN": return "సరే, ఆర్డర్ లేదు. ధన్యవాదాలు.";
    default:      return "Okay, no order placed. Thank you.";
  }
}
function phrasesGiveUp(code: SarvamLangCode): string {
  switch (code) {
    case "hi-IN": return "माफ़ कीजिए, समझ नहीं आया। कृपया दोबारा कॉल करें।";
    case "kn-IN": return "ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಕರೆ ಮಾಡಿ.";
    case "ta-IN": return "மன்னிக்கவும், புரியவில்லை. மீண்டும் அழைக்கவும்.";
    case "te-IN": return "క్షమించండి, అర్థం కాలేదు. దయచేసి మళ్ళీ కాల్ చేయండి.";
    default:      return "Sorry, I couldn't understand. Please call back.";
  }
}

function localizeItem(name: string, unit: string, code: SarvamLangCode): { name: string; unit: string } {
  const key = langToKey(code);
  const skuId = name.toLowerCase().replace(/\s+/g, "_");
  const locName = SKU_NAMES_BY_LANG[skuId]?.[key] ?? name;
  const locUnit = UNIT_LABELS[key]?.[unit] ?? unit;
  return { name: locName, unit: locUnit };
}
function localizedCartSummary(cart: CartLine[], code: SarvamLangCode): string {
  return cart.map((l) => {
    const { name, unit } = localizeItem(l.name, l.unit, code);
    return `${l.qty} ${unit} ${name}`;
  }).join(", ");
}

async function fetchTwilioRecording(recordingUrl: string): Promise<{ bytes: Uint8Array; contentType: string; filename: string }> {
  const clean = recordingUrl.replace(/\.(mp3|wav)$/i, "");
  const wavUrl = `${clean}.wav`;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token) {
    const auth = "Basic " + btoa(`${sid}:${token}`);
    for (let i = 0; i < 2; i++) {
      const r = await fetch(wavUrl, { headers: { Authorization: auth } });
      if (r.ok) {
        return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") ?? "audio/wav", filename: "audio.wav" };
      }
      if (r.status !== 404) throw new Error(`Twilio recording fetch ${r.status}`);
      await new Promise((res) => setTimeout(res, 300));
    }
  }

  const lovKey = process.env.LOVABLE_API_KEY;
  const twKey = process.env.TWILIO_API_KEY;
  if (lovKey && twKey) {
    const m = recordingUrl.match(/Recordings\/(RE[a-zA-Z0-9]+)/);
    if (m) {
      const gwUrl = `https://connector-gateway.lovable.dev/twilio/Recordings/${m[1]}.wav`;
      for (let i = 0; i < 2; i++) {
        const r = await fetch(gwUrl, {
          headers: { "Authorization": `Bearer ${lovKey}`, "X-Connection-Api-Key": twKey },
        });
        if (r.ok) return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") ?? "audio/wav", filename: "audio.wav" };
        if (r.status !== 404) throw new Error(`Twilio gateway recording fetch ${r.status}`);
        await new Promise((res) => setTimeout(res, 300));
      }
    }
  }
  throw new Error("Could not fetch Twilio recording (no credentials)");
}

function recordTwiml(base: string, cid: string): string {
  return `
    <Record action="${base}/api/public/twilio/record?cid=${encodeURIComponent(cid)}"
            method="POST"
            maxLength="15"
            timeout="2"
            playBeep="false"
            trim="trim-silence"
            finishOnKey="#" />
  `;
}

function fallbackSayTwiml(text: string, code: SarvamLangCode): string {
  const v = langToTwilioVoice(code);
  return `<Say voice="${v.voice}" language="${v.locale}">${escapeXml(text)}</Say>`;
}

async function speakTwiml(cid: string, text: string, code: SarvamLangCode, cacheable = false): Promise<string> {
  const cacheKey = `${code}::${text}`;
  if (cacheable) {
    const cached = TTS_CACHE.get(cacheKey);
    if (cached) return `<Play>${escapeXml(cached)}</Play>`;
  }
  try {
    const tts = await sarvamTextToSpeech(text, code);
    const signedUrl = await uploadTtsAndSign(cid, tts.audio);
    if (cacheable) TTS_CACHE.set(cacheKey, signedUrl);
    return `<Play>${escapeXml(signedUrl)}</Play>`;
  } catch (err) {
    console.error("[Sarvam pipeline] TTS error, falling back to <Say>", err);
    return fallbackSayTwiml(text, code);
  }
}

// Race Gemini extractor vs a hard timeout; on miss, deterministic catalog fallback.
async function fastExtract(transcript: string): Promise<{ items: { name: string; quantity: number; unit?: string; estimatedPrice?: number }[] }> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
  try {
    const result = await Promise.race([extractOrderFromTranscript(transcript), timeout]);
    if (result && result.items && result.items.length > 0) return { items: result.items };
  } catch (e) {
    console.warn("[fastExtract] gemini failed, using catalog fallback", e);
  }
  const fb = extractCatalogOrder(transcript);
  return { items: fb?.items ?? [] };
}

export const Route = createFileRoute("/api/public/twilio/record")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSarvamEnabled()) {
          const url = new URL(request.url);
          return twiml(`<Redirect method="POST">${url.origin}/api/public/twilio/voice?legacy=1</Redirect>`);
        }

        const form = await request.formData();
        const url = new URL(request.url);
        const base = url.origin;
        const cid = url.searchParams.get("cid") ?? `twilio_${Date.now()}`;
        const recordingUrl = String(form.get("RecordingUrl") ?? "");
        const recordingDuration = Number(form.get("RecordingDuration") ?? 0);
        const from = String(form.get("From") ?? "");

        let call = getCall(cid);
        if (!call) {
          putCall({
            id: cid, customerId: "c_me", customerName: "Ramesh Kumar",
            phone: from || "+91-unknown", state: "listening",
            startedAt: Date.now(), transcript: [], source: "twilio",
            cart: [], menuState: "menu",
          });
          call = getCall(cid)!;
        }

        // Empty / zero-duration recording → silently re-record (no nagging reprompt).
        if (!recordingUrl || recordingDuration < 1) {
          return twiml(recordTwiml(base, cid));
        }

        // ===== STT =====
        let transcript = "";
        let detectedLang: SarvamLangCode = "en-IN";
        let sttLatency = 0;
        let sttTransport: "streaming" | "rest" = "rest";
        try {
          const audio = await fetchTwilioRecording(recordingUrl);
          const stt = audio.contentType.toLowerCase().includes("wav")
            ? await sarvamTranslateSpeechStreaming(audio.bytes, 8000)
            : await sarvamTranslateSpeech(audio.bytes, audio.filename, audio.contentType);
          transcript = stt.transcript;
          detectedLang = stt.languageCode;
          sttLatency = stt.latencyMs;
          sttTransport = stt.transport ?? sttTransport;
        } catch (err) {
          console.error("[Sarvam pipeline] STT error", err);
          if (isAuthError(err)) {
            patchCall(cid, { state: "failed", summary: "Sarvam API key rejected authentication." });
          }
          // Don't loop forever on STT failures either.
          const n = bumpMiss(cid);
          if (n >= 2) {
            resetMiss(cid);
            const play = await speakTwiml(cid, phrasesGiveUp("en-IN"), "en-IN", true);
            patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - call.startedAt) / 1000), outcome: "info", summary: "STT failed twice" });
            return twiml(`${play}<Hangup/>`);
          }
          return twiml(recordTwiml(base, cid));
        }

        if (!transcript) {
          const cart0 = getCart(cid) ?? [];
          const n = bumpMiss(cid);
          if (cart0.length > 0 && n >= 1) {
            // Auto-finalize what we already have rather than asking again.
            return await finalizeAndHangup(cid, call.startedAt, detectedLang, base);
          }
          if (n >= 2) {
            resetMiss(cid);
            const play = await speakTwiml(cid, phrasesGiveUp(detectedLang), detectedLang, true);
            patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - call.startedAt) / 1000), outcome: "info", summary: "Empty transcript twice" });
            return twiml(`${play}<Hangup/>`);
          }
          return twiml(recordTwiml(base, cid));
        }

        appendTurnServer(cid, {
          role: "customer", at: Date.now(), text: transcript, rawTranscript: transcript,
          language: langToLabel(detectedLang),
          pipelineStage: "stt", sttProvider: "sarvam", deepgramModel: `sarvam:saaras-v3:translate:${sttTransport}`,
          deepgramDetectedLanguage: detectedLang, deepgramLatencyMs: sttLatency,
        });

        const isEnd = looksLikeEndOfOrder(transcript);

        // ===== END OF ORDER → finalize and hang up =====
        if (isEnd) {
          return await finalizeAndHangup(cid, call.startedAt, detectedLang, base);
        }

        // ===== NEW ITEMS — Gemini extractor + catalog fallback =====
        const { items: newItems } = await fastExtract(transcript);

        if (newItems.length === 0) {
          const cart0 = getCart(cid) ?? [];
          const n = bumpMiss(cid);
          // 1 miss with non-empty cart → finalize (caller may be done, trailing "umm").
          if (cart0.length > 0) {
            return await finalizeAndHangup(cid, call.startedAt, detectedLang, base);
          }
          // 2 misses with empty cart → give up gracefully.
          if (n >= 2) {
            resetMiss(cid);
            const play = await speakTwiml(cid, phrasesGiveUp(detectedLang), detectedLang, true);
            patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - call.startedAt) / 1000), outcome: "info", summary: "No items parsed twice" });
            return twiml(`${play}<Hangup/>`);
          }
          // 1st miss with empty cart → silently re-record.
          return twiml(recordTwiml(base, cid));
        }

        resetMiss(cid);

        // Append to per-call cart.
        const cart = (getCart(cid) ?? []).slice();
        for (const it of newItems) {
          const name = it.name.trim();
          const qty = Number(it.quantity) || 1;
          const unit = (it.unit ?? "pcs").trim() || "pcs";
          const price = Number(it.estimatedPrice) || 0;
          const skuId = name.toLowerCase().replace(/\s+/g, "_");
          const idx = cart.findIndex((l) => l.skuId === skuId);
          if (idx >= 0) cart[idx] = { ...cart[idx], qty: cart[idx].qty + qty };
          else cart.push({ skuId, name, qty, unit, price });
        }
        setCart(cid, cart);

        const addedLocal = newItems.map((it) => {
          const { name, unit } = localizeItem(it.name, it.unit ?? "pcs", detectedLang);
          return `${it.quantity} ${unit} ${name}`;
        }).join(", ");
        const reply = phrasesAdded(addedLocal, detectedLang);
        const play = await speakTwiml(cid, reply, detectedLang);

        appendTurnServer(cid, {
          role: "agent", at: Date.now(), text: reply,
          templateId: "ITEMS_ADDED", language: langToLabel(detectedLang),
          pipelineStage: "commerce",
        });

        console.log("[Sarvam pipeline]", JSON.stringify({
          cid, language: detectedLang, transcript, sttTransport,
          newItems, cartSize: cart.length, sttLatency,
        }));

        return twiml(`${play}${recordTwiml(base, cid)}`);
      },
    },
  },
});

async function finalizeAndHangup(cid: string, startedAt: number, detectedLang: SarvamLangCode, _base: string): Promise<Response> {
  const call = getCall(cid);
  const cart = (getCart(cid) ?? []).slice();
  resetMiss(cid);

  if (cart.length === 0) {
    const goodbye = phrasesGoodbyeEmpty(detectedLang);
    const play = await speakTwiml(cid, goodbye, detectedLang, true);
    appendTurnServer(cid, { role: "agent", at: Date.now(), text: goodbye, templateId: "END_CALL_EMPTY", language: langToLabel(detectedLang) });
    if (call) patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - startedAt) / 1000), outcome: "info", summary: goodbye });
    return twiml(`${play}<Hangup/>`);
  }

  const total = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const summaryLocal = localizedCartSummary(cart, detectedLang);
  const summaryEn = cart.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(", ");

  let trustScore: number | null = 82;
  let creditRecommendation: string | null = null;
  let decisionReason: string | null = null;
  try {
    const brain = await runFinancialBrain({
      intent: "KHATA_ORDER",
      customerName: call?.customerName || "Customer",
      trustScore: 82, outstanding: 1850, creditLimit: 5000, reliability: 91,
      requestedAmount: total,
    });
    creditRecommendation = brain.decision === "approve" ? "approve"
      : brain.decision === "reject" ? "reject" : "review";
    decisionReason = brain.reasoning;
  } catch (e) {
    console.error("[twilio.record] financial brain failed", e);
  }

  // Localized items stored on the order so customer + retailer pages render in the caller's language.
  const localizedItems = cart.map((l) => {
    const { name, unit } = localizeItem(l.name, l.unit, detectedLang);
    return { name, quantity: l.qty, unit, estimatedPrice: l.price };
  });

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insErr } = await supabaseAdmin.from("orders").insert({
      source: "voice_call",
      call_id: cid,
      customer_id: call?.customerId ?? "c_me",
      customer_name: call?.customerName ?? "Customer",
      phone: call?.phone ?? "",
      retailer_id: "shop_default",
      items: localizedItems,
      amount: total,
      language: langToLabel(detectedLang),
      transcript: summaryEn,
      status: "pending_credit_review",
      reasoning: summaryLocal,
      trust_score: trustScore,
      credit_recommendation: creditRecommendation,
      decision_reason: decisionReason,
    });
    if (insErr) console.error("[twilio.record] orders insert", insErr);
  } catch (e) {
    console.error("[twilio.record] orders insert threw", e);
  }

  setCart(cid, []);
  const confirm = phrasesConfirmed(summaryLocal, detectedLang);
  const play = await speakTwiml(cid, confirm, detectedLang);
  appendTurnServer(cid, { role: "agent", at: Date.now(), text: confirm, templateId: "ORDER_CONFIRMED", language: langToLabel(detectedLang) });
  if (call) patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - startedAt) / 1000), outcome: "credit_approved", summary: confirm });
  return twiml(`${play}<Hangup/>`);
}
