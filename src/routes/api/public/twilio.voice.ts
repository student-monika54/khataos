// Twilio Voice webhook — entry point for inbound calls.
//
// Two-mode entry:
//   * SARVAM_API_KEY configured → brief greeting then <Record>. The
//     /api/public/twilio/record handler does Sarvam STT-translate →
//     existing brains → Sarvam TTS, looping until END_CALL.
//   * Otherwise → falls back to the legacy DTMF language-selection menu
//     (?legacy=1 forces this path even when Sarvam is available, used by
//     the record handler when something goes wrong).

import { createFileRoute } from "@tanstack/react-router";
import { putCall } from "@/lib/khataos/call-store.server";
import { isSarvamEnabled } from "@/lib/khataos/sarvam.server";

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

function legacyMenuXml(base: string, cid: string): string {
  return `
    <Say voice="Polly.Raveena" language="en-IN">Welcome to KhataOS, your AI financial assistant.</Say>
    <Say voice="Polly.Aditi" language="hi-IN">KhataOS mein aapka swagat hai.</Say>
    <Say voice="Google.kn-IN-Standard-A" language="kn-IN">KhataOS ge swagatha.</Say>
    <Gather input="dtmf" numDigits="1" timeout="6"
            action="${base}/api/public/twilio/menu?cid=${encodeURIComponent(cid)}" method="POST">
      <Say voice="Polly.Raveena" language="en-IN">Press 1 for English.</Say>
      <Say voice="Polly.Aditi" language="hi-IN">Hindi ke liye 2 dabaayein.</Say>
      <Say voice="Google.kn-IN-Standard-A" language="kn-IN">Kannada baashege moorane sankhye ottirisi.</Say>
    </Gather>
    <Redirect method="POST">${base}/api/public/twilio/voice?legacy=1</Redirect>
  `;
}

function sarvamGreetingXml(base: string, cid: string): string {
  // Trilingual greeting — Sarvam handles whatever the caller responds in.
  return `
    <Say voice="Polly.Raveena" language="en-IN">Welcome to KhataOS. Please speak after the tone — in any language.</Say>
    <Say voice="Polly.Aditi" language="hi-IN">Aap koi bhi bhasha mein bol sakte hain.</Say>
    <Record action="${base}/api/public/twilio/record?cid=${encodeURIComponent(cid)}"
            method="POST"
            maxLength="15"
            timeout="2"
            playBeep="true"
            trim="trim-silence"
            finishOnKey="#" />
  `;
}

export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const sid = String(form.get("CallSid") ?? "");
        const from = String(form.get("From") ?? "Unknown");
        const id = `twilio_${sid || Date.now()}`;
        const url = new URL(request.url);
        const base = url.origin;
        const legacy = url.searchParams.get("legacy") === "1";

        putCall({
          id, twilioSid: sid, customerId: from, customerName: "Inbound caller",
          phone: from, state: "listening", startedAt: Date.now(),
          transcript: [], source: "twilio",
        });

        if (isSarvamEnabled() && !legacy) {
          return twiml(sarvamGreetingXml(base, id));
        }
        return twiml(legacyMenuXml(base, id));
      },
      GET: async () => twiml(`<Say>KhataOS Twilio webhook ready. POST only.</Say>`),
    },
  },
});
