// Twilio DTMF menu handler — receives the language selection digit,
// locks it on the call record, plays the localised greeting and starts
// the speech-gather loop. Subsequent gathers stay locked to this
// language until the caller presses 9 (which routes back here).

import { createFileRoute } from "@tanstack/react-router";
import { getCall, patchCall, putCall, appendTurnServer } from "@/lib/khataos/call-store.server";
import { renderTemplate } from "@/lib/khataos/templates";
import {
  codeToLanguage, codeToTemplateLang, isLangCode, voiceForCode,
  sttLocaleForCode, changeLangHint, type LangCode,
} from "@/lib/khataos/ivr";

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function digitToCode(d: string): LangCode | null {
  if (d === "1") return "en";
  if (d === "2") return "hi";
  if (d === "3") return "kn";
  return null;
}

// Re-prompt the DTMF menu (when the caller pressed something other than 1/2/3).
function menuRepromptXml(base: string, cid: string): string {
  return `
    <Gather input="dtmf" numDigits="1" timeout="6"
            action="${base}/api/public/twilio/menu?cid=${encodeURIComponent(cid)}" method="POST">
      <Say voice="Polly.Raveena" language="en-IN">Please press 1 for English.</Say>
      <Say voice="Polly.Aditi" language="hi-IN">Hindi ke liye 2 dabaayein.</Say>
      <Say voice="Google.kn-IN-Standard-A" language="kn-IN">Kannada baashege moorane sankhye ottirisi.</Say>
    </Gather>
    <Redirect method="POST">${base}/api/public/twilio/voice</Redirect>
  `;
}

export const Route = createFileRoute("/api/public/twilio/menu")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const url = new URL(request.url);
        const base = url.origin;
        const cid = url.searchParams.get("cid") ?? "";
        const digits = String(form.get("Digits") ?? "").trim();
        const code = digitToCode(digits);

        // Ensure the call record exists (defensive — voice handler should have created it)
        if (!getCall(cid)) {
          putCall({
            id: cid, customerId: String(form.get("From") ?? "unknown"),
            customerName: "Inbound caller", phone: String(form.get("From") ?? ""),
            state: "listening", startedAt: Date.now(), transcript: [], source: "twilio",
          });
        }

        // Invalid digit → re-prompt
        if (!isLangCode(code)) {
          return twiml(menuRepromptXml(base, cid));
        }

        // ===== Lock the language on the call =====
        const language = codeToLanguage(code);
        patchCall(cid, { language, state: "listening", currentAgent: "InsightsAgent" });

        const tplLang = codeToTemplateLang(code);
        const v = voiceForCode(code);
        const stt = sttLocaleForCode(code);
        const greeting = renderTemplate("GREETING", {}, tplLang);
        const hint = changeLangHint(code);

        // Log the language-locked system turn so the dashboard reflects it.
        appendTurnServer(cid, {
          role: "system", at: Date.now(),
          text: `Language locked: ${language} (press 9 to change)`,
          language, templateLang: tplLang,
        });
        appendTurnServer(cid, {
          role: "agent", at: Date.now(),
          text: greeting, templateId: "GREETING", templateLang: tplLang,
          language, agent: "InsightsAgent",
        });

        // First speech gather. dtmf+speech so caller can press 9 to switch language.
        return twiml(`
          <Say voice="${v.voice}" language="${v.locale}">${escapeXml(greeting)}</Say>
          <Gather input="speech dtmf" numDigits="1" speechTimeout="auto" language="${stt}"
                  action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}&amp;lang=${code}"
                  method="POST" speechModel="${sttModelForCode(code)}">
            <Say voice="${v.voice}" language="${v.locale}">${escapeXml(hint)}</Say>
          </Gather>
          <Redirect method="POST">${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}&amp;lang=${code}</Redirect>
        `);
      },
    },
  },
});
