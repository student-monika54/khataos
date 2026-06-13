// Twilio Voice webhook — entry point for inbound calls.
// Plays a multilingual welcome and immediately presents the DTMF
// language-selection menu. Language is NEVER auto-detected; the caller
// explicitly selects English / Hindi / Kannada by pressing 1 / 2 / 3.
//
// Flow:
//   /voice   → welcome (en, hi, kn) → Gather DTMF → /menu
//   /menu    → store call.language → speak greeting → Gather speech → /gather
//   /gather  → orchestrator (forced language) → reply → Gather speech → /gather
//              Caller may press 9 at any time during a Gather to return to /menu.

import { createFileRoute } from "@tanstack/react-router";
import { putCall } from "@/lib/khataos/call-store.server";

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

// Multilingual welcome — three short lines so every caller hears their
// language confirmed before the menu starts.
function welcomeXml(): string {
  return `
    <Say voice="Polly.Raveena" language="en-IN">Welcome to KhataOS, your AI financial assistant.</Say>
    <Say voice="Polly.Aditi" language="hi-IN">KhataOS mein aapka swagat hai.</Say>
    <Say voice="Google.kn-IN-Standard-A" language="kn-IN">KhataOS ge swagatha.</Say>
  `;
}

// DTMF language menu — 1 English, 2 Hindi, 3 Kannada.
function menuPromptXml(base: string, cid: string): string {
  return `
    <Gather input="dtmf" numDigits="1" timeout="6"
            action="${base}/api/public/twilio/menu?cid=${encodeURIComponent(cid)}" method="POST">
      <Say voice="Polly.Raveena" language="en-IN">Press 1 for English.</Say>
      <Say voice="Polly.Aditi" language="hi-IN">Hindi ke liye 2 dabaayein.</Say>
      <Say voice="Google.kn-IN-Standard-A" language="kn-IN">Kannada baashege moorane sankhye ottirisi.</Say>
    </Gather>
    <Redirect method="POST">${base}/api/public/twilio/voice</Redirect>
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

        putCall({
          id, twilioSid: sid, customerId: from, customerName: "Inbound caller",
          phone: from, state: "listening", startedAt: Date.now(),
          transcript: [], source: "twilio",
        });

        const url = new URL(request.url);
        const base = url.origin;

        return twiml(`${welcomeXml()}${menuPromptXml(base, id)}`);
      },
      GET: async () => twiml(`<Say>KhataOS Twilio webhook ready. POST only.</Say>`),
    },
  },
});
