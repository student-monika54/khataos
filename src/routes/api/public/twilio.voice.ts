// Twilio Voice webhook — answers an inbound call and starts a Gather loop.
import { createFileRoute } from "@tanstack/react-router";
import { putCall } from "@/lib/khataos/call-store.server";

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

const GREETING_EN = "Namaste. This is KhataOS, your AI khata assistant. How can I help today?";

export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const sid = String(form.get("CallSid") ?? "");
        const from = String(form.get("From") ?? "Unknown");
        const id = `twilio_${sid || Date.now()}`;

        putCall({
          id, twilioSid: sid, customerId: from, customerName: "Inbound caller",
          phone: from, state: "listening", startedAt: Date.now(),
          transcript: [{ role: "agent", text: GREETING_EN, at: Date.now(), templateId: "GREETING", agent: "InsightsAgent" }],
          source: "twilio",
        });

        const base = new URL(request.url).origin;
        return twiml(`
          <Say voice="Polly.Aditi" language="en-IN">${GREETING_EN}</Say>
          <Gather input="speech" speechTimeout="auto" language="en-IN"
                  action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(id)}"
                  method="POST" speechModel="experimental_conversations">
            <Say voice="Polly.Aditi" language="en-IN">I'm listening.</Say>
          </Gather>
          <Redirect method="POST">${base}/api/public/twilio/voice</Redirect>
        `);
      },
      GET: async () => twiml(`<Say>KhataOS Twilio webhook ready. POST only.</Say>`),
    },
  },
});
