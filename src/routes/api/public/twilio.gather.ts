// Twilio Gather webhook — runs the pipeline and replies with TwiML.
import { createFileRoute } from "@tanstack/react-router";
import { appendTurnServer, getCall, patchCall, putCall } from "@/lib/khataos/call-store.server";
import { processTurn } from "@/lib/khataos/orchestrator.server";

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "amp;", '"': "&quot;", "'": "&apos;" }[c]!));
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
        const cid = url.searchParams.get("cid") ?? "";
        const speech = String(form.get("SpeechResult") ?? "").trim();
        const base = url.origin;

        let call = getCall(cid);
        if (!call) {
          // Recover gracefully — synthesize a record.
          putCall({
            id: cid, customerId: "unknown", customerName: "Inbound caller",
            phone: String(form.get("From") ?? ""), state: "listening",
            startedAt: Date.now(), transcript: [], source: "twilio",
          });
          call = getCall(cid)!;
        }

        if (!speech) {
          return twiml(`
            <Gather input="speech" speechTimeout="auto" language="en-IN"
                    action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}" method="POST">
              <Say voice="Polly.Aditi" language="en-IN">Sorry, I didn't catch that. Could you repeat?</Say>
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
        patchCall(cid, {
          state: "responding",
          currentIntent: result.commerce.intent,
          currentAgent: result.financial.agent,
          language: result.commerce.language,
          recommendation: result.financial.reasoning,
        });

        return twiml(`
          <Say voice="Polly.Aditi" language="${result.commerce.language === "Hindi" ? "hi-IN" : "en-IN"}">${escapeXml(result.reply)}</Say>
          <Gather input="speech" speechTimeout="auto" language="en-IN"
                  action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}" method="POST">
            <Say voice="Polly.Aditi" language="en-IN">Anything else?</Say>
          </Gather>
          <Hangup/>
        `);
      },
    },
  },
});
