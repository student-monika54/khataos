// Sarvam + Gemini voice-ordering loop.
//
// Per turn:
//   Twilio <Record> finishes → POST /api/public/twilio/record
//     1. Fetch the recording from Twilio.
//     2. Sarvam STT-translate → English transcript + detected language.
//     3. If transcript matches end-of-order phrases (no/done/bas/saaku/…):
//          finalize the accumulated cart → insert one row into `orders`
//          (pending_credit_review), TTS "Order confirmed for X. Goodbye." → <Hangup/>.
//        Else if cart empty: "Okay, no order placed. Goodbye." → <Hangup/>.
//     4. Else: Gemini Flash extracts items → append to per-call cart in
//        call-store, TTS "Added X, Y. Anything else?" → <Record>.
//     5. If no items detected: TTS "I didn't catch any items…" → <Record>.
//
// The legacy orchestrator/templates path is intentionally NOT used here —
// it was producing the "I can help with balances, credit requests…" loop.

import { createFileRoute } from "@tanstack/react-router";
import {
  appendTurnServer, getCall, patchCall, putCall, setCart, getCart,
} from "@/lib/khataos/call-store.server";
import {
  isSarvamEnabled, sarvamTranslateSpeech, sarvamTranslateSpeechStreaming, sarvamTextToSpeech,
  type SarvamLangCode,
} from "@/lib/khataos/sarvam.server";
import { extractOrderFromTranscript } from "@/lib/khataos/order-extractor.server";
import { runFinancialBrain } from "@/lib/khataos/financial-brain.server";
import type { CartLine } from "@/lib/khataos/calls";

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

// Multilingual end-of-order phrases. Sarvam translates to English so most
// matches happen against English, but we keep transliterated variants too
// because Sarvam sometimes returns native words verbatim.
const END_INTENT_RE =
  /(?:^|\b)(that'?s? all|that is all|nothing else|no more|no thanks|i'?m done|i am done|done|finish|finished|stop|end call|hang up|that's it|thats it|cut the call|no|nope|bas|bus|kuch nahi|aur kuch nahi|aur kuchh nahi|nahi chahiye|ho gaya|saaku|saakaagide|mugiyitu|mugisi|po(?:d|du)?u|podhum|chaalu|chalu|enough|thank you|thanks)(?:$|\b)/i;

function looksLikeEndOfOrder(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  // Very short utterances + end phrase = high confidence "done".
  return END_INTENT_RE.test(t);
}

async function fetchTwilioRecording(recordingUrl: string): Promise<{ bytes: Uint8Array; contentType: string; filename: string }> {
  const clean = recordingUrl.replace(/\.(mp3|wav)$/i, "");
  const wavUrl = `${clean}.wav`;
  const mp3Url = `${clean}.mp3`;
  const candidates = [wavUrl, mp3Url];

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token) {
    const auth = "Basic " + btoa(`${sid}:${token}`);
    for (const mediaUrl of candidates) {
      for (let i = 0; i < 3; i++) {
        const r = await fetch(mediaUrl, { headers: { Authorization: auth } });
        if (r.ok) {
          const isWav = mediaUrl.endsWith(".wav");
          return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") ?? (isWav ? "audio/wav" : "audio/mpeg"), filename: isWav ? "audio.wav" : "audio.mp3" };
        }
        if (r.status !== 404) throw new Error(`Twilio recording fetch ${r.status}`);
        await new Promise((res) => setTimeout(res, 600));
      }
    }
  }

  const lovKey = process.env.LOVABLE_API_KEY;
  const twKey = process.env.TWILIO_API_KEY;
  if (lovKey && twKey) {
    const m = recordingUrl.match(/Recordings\/(RE[a-zA-Z0-9]+)/);
    if (m) {
      for (const ext of ["wav", "mp3"] as const) {
        const gwUrl = `https://connector-gateway.lovable.dev/twilio/Recordings/${m[1]}.${ext}`;
        for (let i = 0; i < 3; i++) {
          const r = await fetch(gwUrl, {
            headers: {
              "Authorization": `Bearer ${lovKey}`,
              "X-Connection-Api-Key": twKey,
            },
          });
          if (r.ok) return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") ?? (ext === "wav" ? "audio/wav" : "audio/mpeg"), filename: `audio.${ext}` };
          if (r.status !== 404) throw new Error(`Twilio gateway recording fetch ${r.status}`);
          await new Promise((res) => setTimeout(res, 600));
        }
      }
    }
  }
  throw new Error("Could not fetch Twilio recording (no credentials)");
}

function recordTwiml(base: string, cid: string): string {
  return `
    <Record action="${base}/api/public/twilio/record?cid=${encodeURIComponent(cid)}"
            method="POST"
            maxLength="20"
            timeout="3"
            playBeep="false"
            trim="trim-silence"
            finishOnKey="#" />
  `;
}

function fallbackSayTwiml(text: string, code: SarvamLangCode): string {
  const v = langToTwilioVoice(code);
  return `<Say voice="${v.voice}" language="${v.locale}">${escapeXml(text)}</Say>`;
}

async function speakTwiml(cid: string, text: string, code: SarvamLangCode): Promise<string> {
  try {
    const tts = await sarvamTextToSpeech(text, code);
    const signedUrl = await uploadTtsAndSign(cid, tts.audio);
    return `<Play>${escapeXml(signedUrl)}</Play>`;
  } catch (err) {
    console.error("[Sarvam pipeline] TTS error, falling back to <Say>", err);
    return fallbackSayTwiml(text, code);
  }
}

function summarizeCart(cart: CartLine[]): string {
  return cart.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(", ");
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

        if (!recordingUrl || recordingDuration < 1) {
          return twiml(`
            ${fallbackSayTwiml("I didn't catch that. Please speak after the tone.", "en-IN")}
            ${recordTwiml(base, cid)}
          `);
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
          return twiml(`
            ${fallbackSayTwiml(isAuthError(err) ? "KhataOS speech needs a valid Sarvam key." : "Sorry, I couldn't hear that. Please say the items again.", "en-IN")}
            ${recordTwiml(base, cid)}
          `);
        }

        if (!transcript) {
          return twiml(`
            ${fallbackSayTwiml("I didn't catch that. Please repeat your order.", detectedLang)}
            ${recordTwiml(base, cid)}
          `);
        }

        appendTurnServer(cid, {
          role: "customer", at: Date.now(), text: transcript, rawTranscript: transcript,
          language: langToLabel(detectedLang),
          pipelineStage: "stt", sttProvider: "sarvam", deepgramModel: `sarvam:saaras-v3:translate:${sttTransport}`,
          deepgramDetectedLanguage: detectedLang, deepgramLatencyMs: sttLatency,
        });

        const cart = (getCart(cid) ?? []).slice();
        const isEnd = looksLikeEndOfOrder(transcript);

        // ===== END OF ORDER → finalize and hang up =====
        if (isEnd) {
          if (cart.length === 0) {
            const goodbye = "Okay, no order placed. Thank you. Goodbye.";
            const play = await speakTwiml(cid, goodbye, detectedLang);
            appendTurnServer(cid, { role: "agent", at: Date.now(), text: goodbye, templateId: "END_CALL_EMPTY", language: langToLabel(detectedLang) });
            patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - call.startedAt) / 1000), outcome: "info", summary: goodbye });
            return twiml(`${play}<Hangup/>`);
          }

          const total = cart.reduce((s, l) => s + l.qty * l.price, 0);
          const summary = summarizeCart(cart);

          // Financial brain (advisory) for retailer.
          let trustScore: number | null = 82;
          let creditRecommendation: string | null = null;
          let decisionReason: string | null = null;
          try {
            const brain = await runFinancialBrain({
              intent: "KHATA_ORDER",
              customerName: call.customerName || "Customer",
              trustScore: 82, outstanding: 1850, creditLimit: 5000, reliability: 91,
              requestedAmount: total,
            });
            creditRecommendation = brain.decision === "approve" ? "approve"
              : brain.decision === "reject" ? "reject" : "review";
            decisionReason = brain.reasoning;
          } catch (e) {
            console.error("[twilio.record] financial brain failed", e);
          }

          // Insert one consolidated order row.
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { error: insErr } = await supabaseAdmin.from("orders").insert({
              source: "voice_call",
              call_id: cid,
              customer_id: call.customerId,
              customer_name: call.customerName,
              phone: call.phone,
              retailer_id: "shop_default",
              items: cart.map((l) => ({ name: l.name, quantity: l.qty, unit: l.unit, estimatedPrice: l.price })),
              amount: total,
              language: langToLabel(detectedLang),
              transcript,
              status: "pending_credit_review",
              reasoning: summary,
              trust_score: trustScore,
              credit_recommendation: creditRecommendation,
              decision_reason: decisionReason,
            });
            if (insErr) console.error("[twilio.record] orders insert", insErr);
          } catch (e) {
            console.error("[twilio.record] orders insert threw", e);
          }

          setCart(cid, []);
          const confirm = `Your order for ${summary} has been confirmed and sent for approval. Thank you. Goodbye.`;
          const play = await speakTwiml(cid, confirm, detectedLang);
          appendTurnServer(cid, { role: "agent", at: Date.now(), text: confirm, templateId: "ORDER_CONFIRMED", language: langToLabel(detectedLang) });
          patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - call.startedAt) / 1000), outcome: "credit_approved", summary: confirm });
          return twiml(`${play}<Hangup/>`);
        }

        // ===== NEW ITEMS — Gemini extractor =====
        const extracted = await extractOrderFromTranscript(transcript);
        const newItems = (extracted?.items ?? []).filter((i) => i.name);

        if (newItems.length === 0) {
          const prompt = cart.length > 0
            ? "I didn't catch any items. Anything else to add, or say 'done' to confirm."
            : "I didn't catch any items. Please tell me what you'd like to order.";
          const play = await speakTwiml(cid, prompt, detectedLang);
          appendTurnServer(cid, { role: "agent", at: Date.now(), text: prompt, templateId: "REPROMPT", language: langToLabel(detectedLang), pipelineStage: "commerce" });
          return twiml(`${play}${recordTwiml(base, cid)}`);
        }

        // Append to per-call cart.
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

        const addedText = newItems.map((it) => `${it.quantity} ${it.unit ?? "pcs"} ${it.name}`).join(", ");
        const reply = `Added ${addedText}. Anything else?`;
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
