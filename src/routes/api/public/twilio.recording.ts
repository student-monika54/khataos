// Twilio Recording → Deepgram pipeline.
//
// Flow per turn:
//   1. <Record> in TwiML captures the caller's utterance and POSTs here
//      with RecordingUrl + RecordingDuration.
//   2. We download the WAV from Twilio (basic auth) and stream it to
//      Deepgram /v1/listen with the locked language.
//   3. Deepgram transcript is the single source of truth for intent
//      detection — Twilio's native STT is no longer consulted on the
//      primary path.
//   4. Orchestrator runs with the locked language; reply is spoken via
//      Twilio TTS; next <Record> starts immediately.
//
// Failover:
//   * If Deepgram errors (down, key missing, audio fetch fails), the
//     turn is still appended with sttProvider="twilio" + deepgramError,
//     and we Redirect to /api/public/twilio/gather as a graceful
//     fallback so the call never breaks.
//
// Caller can press 9 mid-recording (finishOnKey) to switch language;
// we detect that via the Digits field and Redirect to /voice.

import { createFileRoute } from "@tanstack/react-router";
import { appendTurnServer, getCall, patchCall, putCall } from "@/lib/khataos/call-store.server";
import { processTurn } from "@/lib/khataos/orchestrator.server";
import {
  codeToLanguage, codeToTemplateLang, isLangCode, voiceForCode,
  changeLangHint, languageToCode, type LangCode,
} from "@/lib/khataos/ivr";
import { transcribeTwilioRecording, deepgramConfigForCode } from "@/lib/khataos/deepgram.server";

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

// Standard "record next utterance" block. Used after every agent reply.
function recordBlock(base: string, cid: string, code: LangCode): string {
  return `
    <Record
      action="${base}/api/public/twilio/recording?cid=${encodeURIComponent(cid)}&amp;lang=${code}"
      method="POST"
      maxLength="20"
      timeout="3"
      trim="trim-silence"
      playBeep="false"
      finishOnKey="9#" />
    <Redirect method="POST">${base}/api/public/twilio/recording?cid=${encodeURIComponent(cid)}&amp;lang=${code}</Redirect>
  `;
}

export const Route = createFileRoute("/api/public/twilio/recording")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const url = new URL(request.url);
        const base = url.origin;
        const cid = url.searchParams.get("cid") ?? "";
        const recordingUrl = String(form.get("RecordingUrl") ?? "");
        const recordingDur = Number(form.get("RecordingDuration") ?? "0");
        const digits = String(form.get("Digits") ?? "").trim();

        // Ensure call record
        let call = getCall(cid);
        if (!call) {
          putCall({
            id: cid, customerId: "unknown", customerName: "Inbound caller",
            phone: String(form.get("From") ?? ""), state: "listening",
            startedAt: Date.now(), transcript: [], source: "twilio",
          });
          call = getCall(cid)!;
        }

        // Resolve locked language
        const urlCode = url.searchParams.get("lang");
        const code: LangCode = isLangCode(urlCode) ? urlCode : languageToCode(call.language);
        const tplLang = codeToTemplateLang(code);
        const v = voiceForCode(code);
        const hint = changeLangHint(code);
        const dgCfg = deepgramConfigForCode(code);

        // ===== Press 9 → change language =====
        if (digits === "9") {
          appendTurnServer(cid, {
            role: "system", at: Date.now(),
            text: "Caller pressed 9 — returning to language menu.",
          });
          return twiml(`<Redirect method="POST">${base}/api/public/twilio/voice</Redirect>`);
        }

        // ===== No recording / too short → reprompt =====
        if (!recordingUrl || recordingDur < 1) {
          const reprompt = code === "hi" ? "Maaf kijiye, kuch sunaai nahi diya. Kripya dohraayein."
            : code === "kn" ? "Kshamisi, enu kelisalilla. Dayavittu punah heli."
            : "Sorry, I didn't catch that. Please try again.";
          return twiml(`
            <Say voice="${v.voice}" language="${v.locale}">${escapeXml(reprompt)}</Say>
            ${recordBlock(base, cid, code)}
          `);
        }

        // ===== Deepgram STT =====
        const dg = await transcribeTwilioRecording(recordingUrl, code);

        console.log("[KhataOS Deepgram]", JSON.stringify({
          cid, lockedLang: code, dgModel: dgCfg.model, dgLanguage: dgCfg.language,
          ok: dg.ok, transcript: dg.transcript, confidence: dg.confidence,
          detectedLanguage: dg.detectedLanguage, latencyMs: dg.latencyMs,
          error: dg.error, recordingDur,
        }));

        // ===== Deepgram failover → redirect to Twilio Gather =====
        if (!dg.ok || !dg.transcript) {
          appendTurnServer(cid, {
            role: "system", at: Date.now(),
            text: `Deepgram unavailable (${dg.error ?? "empty transcript"}) — falling back to Twilio STT.`,
            sttProvider: "twilio", deepgramError: dg.error,
          });
          // Failover: use Twilio Gather route (legacy speech recognition).
          return twiml(`
            <Say voice="${v.voice}" language="${v.locale}">${escapeXml(hint)}</Say>
            <Gather input="speech dtmf" numDigits="1" speechTimeout="auto"
                    language="${code === "hi" ? "hi-IN" : code === "kn" ? "kn-IN" : "en-IN"}"
                    action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}&amp;lang=${code}"
                    method="POST" speechModel="default">
              <Say voice="${v.voice}" language="${v.locale}">${escapeXml(hint)}</Say>
            </Gather>
            <Hangup/>
          `);
        }

        // ===== Run orchestrator with Deepgram transcript =====
        patchCall(cid, { state: "thinking", language: codeToLanguage(code) });
        const result = await processTurn(dg.transcript, {
          customerId: call.customerId,
          customerName: call.customerName,
          trustScore: 75,
          outstanding: 1500,
          creditLimit: 5000,
          reliability: 80,
          forcedLanguage: codeToLanguage(code),
          forcedTemplateLang: tplLang,
        });

        // Attach Deepgram debug to customer turn
        result.turns.forEach((t) => {
          if (t.role === "customer") {
            t.sttProvider = "deepgram";
            t.deepgramModel = dg.model;
            t.deepgramLanguage = dg.language;
            t.deepgramDetectedLanguage = dg.detectedLanguage;
            t.deepgramLatencyMs = dg.latencyMs;
            t.speechConfidence = dg.confidence;
            t.transcriptLength = dg.transcript.length;
            t.rawTranscript = dg.transcript;
            t.expectedSttLocale = code === "hi" ? "hi-IN" : code === "kn" ? "kn-IN" : "en-IN";
            t.sttLocale = dg.language;
            t.sttModel = `Deepgram:${dg.model}`;
          }
          appendTurnServer(cid, t);
        });

        // ===== END_CALL → graceful farewell + hangup =====
        if (result.endCall) {
          patchCall(cid, {
            state: "ending", currentIntent: "END_CALL", currentAgent: "InsightsAgent",
            language: codeToLanguage(code), recommendation: "Customer ended the call.",
          });
          setTimeout(() => {
            const c = getCall(cid);
            if (!c) return;
            const dur = Math.round((Date.now() - c.startedAt) / 1000);
            patchCall(cid, {
              state: "completed", endedAt: Date.now(), durationSec: dur, outcome: "info",
              summary: c.transcript.filter((t) => t.role === "agent").slice(-2).map((t) => t.text).join(" ").slice(0, 200),
            });
          }, 1500);
          return twiml(`
            <Say voice="${v.voice}" language="${v.locale}">${escapeXml(result.reply)}</Say>
            <Pause length="1"/>
            <Hangup/>
          `);
        }

        patchCall(cid, {
          state: "responding",
          currentIntent: result.commerce.intent,
          currentAgent: result.financial.agent,
          language: codeToLanguage(code),
          recommendation: result.financial.reasoning,
        });

        return twiml(`
          <Say voice="${v.voice}" language="${v.locale}">${escapeXml(result.reply)}</Say>
          ${recordBlock(base, cid, code)}
        `);
      },
    },
  },
});
