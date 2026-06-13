// Twilio Gather webhook — runs the orchestration pipeline and replies
// with TwiML. END_CALL intent issues a farewell and hangs up the call.
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

// Twilio <Say> voice + locale mapping. Polly.Aditi supports hi-IN; Kannada
// has limited support so we fall back to Polly.Aditi with en-IN diction.
function voiceFor(lang: string): { voice: string; locale: string } {
  switch (lang) {
    case "Hindi":
    case "Hinglish":
      return { voice: "Polly.Aditi", locale: "hi-IN" };
    case "Kannada":
      return { voice: "Polly.Aditi", locale: "en-IN" };
    default:
      return { voice: "Polly.Raveena", locale: "en-IN" };
  }
}

// Twilio speech recognition language hint. en-IN handles English + most
// Hinglish; we switch to hi-IN once the customer's first turn shows
// Devanagari/Hindi cues so subsequent recognition is more accurate.
function gatherLangHint(lang?: string): string {
  if (lang === "Hindi" || lang === "Hinglish") return "hi-IN";
  if (lang === "Kannada") return "kn-IN";
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

        const lastLang = call.language;

        if (!speech) {
          const v = voiceFor(lastLang ?? "English");
          return twiml(`
            <Gather input="speech" speechTimeout="auto" language="${gatherLangHint(lastLang)}"
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
          // Mark completed shortly after the farewell so the dashboard reflects it.
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

        const nextLangHint = gatherLangHint(result.commerce.language);

        return twiml(`
          <Say voice="${v.voice}" language="${v.locale}">${escapeXml(result.reply)}</Say>
          <Gather input="speech" speechTimeout="auto" language="${nextLangHint}"
                  action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}" method="POST"
                  speechModel="experimental_conversations">
            <Say voice="${v.voice}" language="${v.locale}">Aur kuch?</Say>
          </Gather>
          <Hangup/>
        `);
      },
    },
  },
});
