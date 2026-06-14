// Sarvam-powered voice loop.
//
// Flow per turn:
//   Twilio <Record> finishes ─▶ POST /api/public/twilio/record
//     1. Fetch the recording audio from Twilio (basic auth via env or
//        the Lovable Twilio connector gateway).
//     2. Sarvam saaras:v3 STT-translate ─▶ English transcript + detected
//        source language (en-IN | hi-IN | kn-IN | ta-IN | te-IN).
//     3. Existing Commerce Brain + Financial Brain (orchestrator.processTurn)
//        produces the reply text. UI / order pipeline unchanged.
//     4. Sarvam TTS synthesises the reply in the customer's language.
//     5. Return TwiML: <Play>{cached-tts-url}</Play><Record .../> to
//        continue the conversation. <Hangup/> on END_CALL.
//
// Observability: every stage logs latency + decision under "[Sarvam pipeline]".

import { createFileRoute } from "@tanstack/react-router";
import {
  appendTurnServer, getCall, patchCall, putCall,
} from "@/lib/khataos/call-store.server";
import {
  isSarvamEnabled, sarvamTranslateSpeech, sarvamTranslateSpeechStreaming, sarvamTextToSpeech,
  type SarvamLangCode,
} from "@/lib/khataos/sarvam.server";
import { processTurn } from "@/lib/khataos/orchestrator.server";
import { patchLiveOrder, publishLiveOrder } from "@/lib/khataos/live-orders.server";

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

function langToTemplate(code: SarvamLangCode): "en" | "hi" | "kn" | "ta" | "te" {
  return code === "hi-IN" ? "hi" : code === "kn-IN" ? "kn" : code === "ta-IN" ? "ta" : code === "te-IN" ? "te" : "en";
}
function langToLabel(code: SarvamLangCode): "English" | "Hindi" | "Kannada" | "Tamil" | "Telugu" {
  return code === "hi-IN" ? "Hindi" : code === "kn-IN" ? "Kannada" : code === "ta-IN" ? "Tamil" : code === "te-IN" ? "Telugu" : "English";
}
function langToTwilioVoice(code: SarvamLangCode): { voice: string; locale: string } {
  // Fallback only when Sarvam TTS itself fails.
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

// Fetch the Twilio recording bytes. Tries direct basic-auth first
// (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN), falls back to the Lovable
// Twilio connector gateway.
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
    // RecordingUrl looks like: https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RE...
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

export const Route = createFileRoute("/api/public/twilio/record")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSarvamEnabled()) {
          // Sarvam not configured — fall back to the legacy DTMF menu.
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
          });
          call = getCall(cid)!;
        }

        // No speech captured (silence) — re-prompt once.
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
            ${fallbackSayTwiml(isAuthError(err) ? "KhataOS speech needs a valid Sarvam key from the Sarvam dashboard." : "Sorry, I could not hear that clearly. Please say the items again.", "en-IN")}
            ${recordTwiml(base, cid)}
          `);
        }

        if (!transcript) {
          return twiml(`
            ${fallbackSayTwiml("I didn't catch that. Please repeat.", detectedLang)}
            ${recordTwiml(base, cid)}
          `);
        }

        appendTurnServer(cid, {
          role: "customer", at: Date.now(), text: transcript, rawTranscript: transcript,
          language: langToLabel(detectedLang),
          pipelineStage: "stt", sttProvider: "sarvam", deepgramModel: `sarvam:saaras-v3:translate:${sttTransport}`,
          deepgramDetectedLanguage: detectedLang, deepgramLatencyMs: sttLatency,
        });

        // ===== Brain (UNCHANGED) =====
        const ctxOut = await processTurn(transcript, {
          customerId: call.customerId,
          customerName: call.customerName || "Customer",
          trustScore: 82,
          outstanding: 1850,
          creditLimit: 5000,
          reliability: 91,
          forcedLanguage: langToLabel(detectedLang),
          forcedTemplateLang: langToTemplate(detectedLang),
        });

        // Persist agent + customer enriched turns.
        for (const t of ctxOut.turns) appendTurnServer(cid, t);
        patchCall(cid, { language: ctxOut.commerce.language, currentIntent: ctxOut.commerce.intent, currentAgent: ctxOut.financial.agent });

        // Side-effect: KHATA_ORDER → publish to live-orders pipeline so the
        // shopkeeper dashboard updates immediately, before the call ends.
        if (ctxOut.commerce.intent === "KHATA_ORDER" && ctxOut.commerce.items.length > 0) {
          const orderId = `lo_${cid}_${Date.now()}`;
          publishLiveOrder({
            id: orderId, callId: cid,
            customerId: call.customerId, customerName: call.customerName, phone: call.phone,
            items: ctxOut.commerce.items,
            amount: ctxOut.amount ?? 0,
            trustScore: 82, outstanding: 1850, creditLimit: 5000,
            stage: "processing",
            language: ctxOut.commerce.language,
            createdAt: Date.now(), updatedAt: Date.now(),
          });
          const stage = ctxOut.financial.decision === "approve" ? "ready_for_fulfillment"
            : ctxOut.financial.decision === "reject" ? "rejected"
            : ctxOut.financial.decision === "conditional" ? "conditional"
            : "checking_credit";
          patchLiveOrder(orderId, {
            stage,
            decision: ctxOut.financial.decision === "info" ? undefined : ctxOut.financial.decision,
            reasoning: ctxOut.financial.reasoning,
            language: ctxOut.commerce.language,
          });
        }

        // ===== TTS =====
        let playFragment = "";
        try {
          const tts = await sarvamTextToSpeech(ctxOut.reply, detectedLang);
          const ttsId = `${cid}_${Date.now()}`;
          putTts(ttsId, tts.audio, tts.contentType);
          playFragment = `<Play>${base}/api/public/twilio/tts/${encodeURIComponent(ttsId)}</Play>`;
          console.log("[Sarvam pipeline]", JSON.stringify({
            cid, language: detectedLang, transcript, sttTransport, intent: ctxOut.commerce.intent,
            items: ctxOut.commerce.items, decision: ctxOut.financial.decision,
            sttLatency, ttsLatency: tts.latencyMs,
          }));
        } catch (err) {
          console.error("[Sarvam pipeline] TTS error, falling back to <Say>", err);
          playFragment = fallbackSayTwiml(ctxOut.reply, detectedLang);
        }

        if (ctxOut.endCall) {
          patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - call.startedAt) / 1000), outcome: "info" });
          return twiml(`${playFragment}<Hangup/>`);
        }

        return twiml(`${playFragment}${recordTwiml(base, cid)}`);
      },
    },
  },
});
