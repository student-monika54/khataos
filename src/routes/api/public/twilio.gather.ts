// Twilio Gather webhook — runs the orchestration pipeline and replies
// with TwiML. END_CALL intent issues a farewell and hangs up the call.
//
// CRITICAL: response language is selected PER TURN from the *current*
// transcript (commerce.language), never locked to a conversation default.
// The Twilio <Gather> language hint also adapts, but defaults to en-IN
// because en-IN STT reliably captures both English and romanised
// Hinglish — using hi-IN would force Devanagari transcription on
// English speech and trap the agent in Hindi.
import { createFileRoute } from "@tanstack/react-router";
import { appendTurnServer, getCall, patchCall, putCall } from "@/lib/khataos/call-store.server";
import { processTurn } from "@/lib/khataos/orchestrator.server";

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

// Twilio <Say> voice + locale mapping. Polly.Aditi (hi-IN) for Hindi,
// Polly.Aditi (en-IN) for Hinglish/Kannada fallback, Polly.Raveena
// (en-IN) for English.
function voiceFor(lang: string): { voice: string; locale: string } {
  switch (lang) {
    case "Hindi":
      return { voice: "Polly.Aditi", locale: "hi-IN" };
    case "Hinglish":
      return { voice: "Polly.Aditi", locale: "en-IN" };
    case "Kannada":
      return { voice: "Polly.Aditi", locale: "en-IN" };
    default:
      return { voice: "Polly.Raveena", locale: "en-IN" };
  }
}

// Localised continuation prompt ("anything else?").
function continuationPrompt(lang: string): string {
  switch (lang) {
    case "Hindi": return "Aur kuch chahiye?";
    case "Hinglish": return "Aur kuch chahiye?";
    case "Kannada": return "Innenaadru beku?";
    default: return "Anything else?";
  }
}

// Smart STT hint:
//  - en-IN by default (covers English + romanised Hinglish)
//  - hi-IN only when the *last customer turn* contained Devanagari script
//  - kn-IN only when the last customer turn contained Kannada script
// We never lock to hi-IN after a single Hindi turn — the next turn could
// be English again.
function gatherLangHint(lastCustomerText?: string): string {
  if (!lastCustomerText) return "en-IN";
  if (/[\u0900-\u097F]/.test(lastCustomerText)) return "hi-IN";
  if (/[\u0C80-\u0CFF]/.test(lastCustomerText)) return "kn-IN";
  return "en-IN";
}

export const Route = createFileRoute("/api/public/twilio/gather")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const url = new URL(request.url);
        const cid = url.searchParams.get("cid") ?? "";
        const speech = String(form.get("SpeechResult") ?? "").trim();
        const base = url.origin;

        let call = getCall(cid);
        if (!call) {
          putCall({
            id: cid, customerId: "unknown", customerName: "Inbound caller",
            phone: String(form.get("From") ?? ""), state: "listening",
            startedAt: Date.now(), transcript: [], source: "twilio",
          });
          call = getCall(cid)!;
        }

        if (!speech) {
          const v = voiceFor("English");
          return twiml(`
            <Gather input="speech" speechTimeout="auto" language="en-IN"
                    action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}" method="POST">
              <Say voice="${v.voice}" language="${v.locale}">Sorry, I didn't catch that. Could you repeat?</Say>
            </Gather>
            <Hangup/>
          `);
        }

        patchCall(cid, { state: "thinking" });
        const result = await processTurn(speech, {
          customerId: call.customerId,
          customerName: call.customerName,
          trustScore: 75,
          outstanding: 1500,
          creditLimit: 5000,
          reliability: 80,
        });

        result.turns.forEach((t) => appendTurnServer(cid, t));

        // Per-turn voice — driven by THIS utterance's detected language.
        const v = voiceFor(result.commerce.language);

        // ====== END_CALL → graceful hangup ======
        if (result.endCall) {
          patchCall(cid, {
            state: "ending",
            currentIntent: "END_CALL",
            currentAgent: "InsightsAgent",
            language: result.commerce.language,
            recommendation: "Customer ended the call.",
          });
          setTimeout(() => {
            const c = getCall(cid);
            if (!c) return;
            const dur = Math.round((Date.now() - c.startedAt) / 1000);
            patchCall(cid, {
              state: "completed",
              endedAt: Date.now(),
              durationSec: dur,
              outcome: "info",
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
          language: result.commerce.language,
          recommendation: result.financial.reasoning,
        });

        // STT hint follows script of the latest customer utterance only.
        const nextLangHint = gatherLangHint(speech);
        const followUp = continuationPrompt(result.commerce.language);

        return twiml(`
          <Say voice="${v.voice}" language="${v.locale}">${escapeXml(result.reply)}</Say>
          <Gather input="speech" speechTimeout="auto" language="${nextLangHint}"
                  action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}" method="POST"
                  speechModel="experimental_conversations">
            <Say voice="${v.voice}" language="${v.locale}">${escapeXml(followUp)}</Say>
          </Gather>
          <Hangup/>
        `);
      },
    },
  },
});
