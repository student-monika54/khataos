// Twilio Gather webhook — locked-language speech loop.
//
// Architecture:
//   * Language is LOCKED for the entire call (selected via DTMF menu).
//   * No automatic language detection. The `lang` query param + the
//     call record's `language` field are the single source of truth.
//   * Pressing 9 at any time redirects to /menu so the caller can
//     re-select a language.
//   * All replies are rendered in the locked template language and
//     spoken with the matching Twilio voice.
//   * END_CALL intent plays the localised farewell and hangs up.

import { createFileRoute } from "@tanstack/react-router";
import { appendTurnServer, getCall, patchCall, putCall } from "@/lib/khataos/call-store.server";
import { processTurn } from "@/lib/khataos/orchestrator.server";
import {
  codeToLanguage, codeToTemplateLang, isLangCode, voiceForCode,
  sttLocaleForCode, sttModelForCode, changeLangHint, languageToCode, type LangCode,
} from "@/lib/khataos/ivr";

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

export const Route = createFileRoute("/api/public/twilio/gather")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const url = new URL(request.url);
        const base = url.origin;
        const cid = url.searchParams.get("cid") ?? "";
        const speech = String(form.get("SpeechResult") ?? "").trim();
        const digits = String(form.get("Digits") ?? "").trim();
        const speechConfidenceRaw = String(form.get("Confidence") ?? "");
        const speechConfidence = speechConfidenceRaw ? parseFloat(speechConfidenceRaw) : undefined;

        // ===== Resolve locked language =====
        // Priority: URL param → call record → fallback "en"
        let call = getCall(cid);
        if (!call) {
          putCall({
            id: cid, customerId: "unknown", customerName: "Inbound caller",
            phone: String(form.get("From") ?? ""), state: "listening",
            startedAt: Date.now(), transcript: [], source: "twilio",
          });
          call = getCall(cid)!;
        }
        const urlCode = url.searchParams.get("lang");
        const code: LangCode = isLangCode(urlCode)
          ? urlCode
          : languageToCode(call.language);
        const tplLang = codeToTemplateLang(code);
        const v = voiceForCode(code);
        const stt = sttLocaleForCode(code);
        const sttModel = sttModelForCode(code);
        const hint = changeLangHint(code);
        const expectedStt = code === "hi" ? "hi-IN" : code === "kn" ? "kn-IN" : "en-IN";

        // ===== STT debug log =====
        console.log("[KhataOS STT]", JSON.stringify({
          cid, lockedLang: code, expectedSttLocale: expectedStt,
          actualSttLocale: stt, sttModel,
          rawTranscript: speech, transcriptLength: speech.length,
          speechConfidence, digits,
        }));


        // ===== "Press 9" → change language =====
        if (digits === "9") {
          appendTurnServer(cid, {
            role: "system", at: Date.now(),
            text: "Caller pressed 9 — returning to language menu.",
          });
          return twiml(`<Redirect method="POST">${base}/api/public/twilio/voice</Redirect>`);
        }

        // ===== No speech captured =====
        if (!speech) {
          const reprompt = code === "hi" ? "Maaf kijiye, samajh nahi aaya. Kripya dohraayein."
            : code === "kn" ? "Kshamisi, kelisalilla. Dayavittu punah heli."
            : "Sorry, I didn't catch that. Could you repeat?";
          return twiml(`
            <Gather input="speech dtmf" numDigits="1" speechTimeout="auto" language="${stt}"
                    action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}&amp;lang=${code}"
                    method="POST" speechModel="${sttModel}">
              <Say voice="${v.voice}" language="${v.locale}">${escapeXml(reprompt)}</Say>
              <Say voice="${v.voice}" language="${v.locale}">${escapeXml(hint)}</Say>
            </Gather>
            <Hangup/>
          `);
        }

        // ===== Run orchestrator with LOCKED language =====
        patchCall(cid, { state: "thinking", language: codeToLanguage(code) });
        const result = await processTurn(speech, {
          customerId: call.customerId,
          customerName: call.customerName,
          trustScore: 75,
          outstanding: 1500,
          creditLimit: 5000,
          reliability: 80,
          forcedLanguage: codeToLanguage(code),
          forcedTemplateLang: tplLang,
        });

        result.turns.forEach((t) => appendTurnServer(cid, t));

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
          <Gather input="speech dtmf" numDigits="1" speechTimeout="auto" language="${stt}"
                  action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}&amp;lang=${code}"
                  method="POST" speechModel="${sttModel}">
            <Say voice="${v.voice}" language="${v.locale}">${escapeXml(hint)}</Say>
          </Gather>
          <Hangup/>
        `);
      },
    },
  },
});
