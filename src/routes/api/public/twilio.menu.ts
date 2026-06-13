// Twilio DTMF menu handler.
//
// Two responsibilities:
//   1. First hit (no `pick=1` query): caller pressed 1/2/3 to LOCK language.
//      We persist the language on the call record and immediately speak the
//      guided main menu (6 options), then Gather a single DTMF digit and
//      forward to /gather?mode=menu for state-machine dispatch.
//   2. Re-prompt path: invalid digit → re-play the language menu.

import { createFileRoute } from "@tanstack/react-router";
import { getCall, patchCall, putCall, appendTurnServer, setMenuState } from "@/lib/khataos/call-store.server";
import { codeToLanguage, codeToTemplateLang, isLangCode, voiceForCode, type LangCode } from "@/lib/khataos/ivr";
import { voiceMenu } from "@/lib/khataos/voice-menu";

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

function safeTwiml(base: string) {
  return twiml(`
    <Say voice="Polly.Raveena" language="en-IN">Sorry, KhataOS had trouble reading that option. Let us try again.</Say>
    <Redirect method="POST">${base}/api/public/twilio/voice</Redirect>
  `);
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

function langMenuXml(base: string, cid: string): string {
  return `
    <Gather input="dtmf" numDigits="1" timeout="6"
            action="${base}/api/public/twilio/menu?cid=${encodeURIComponent(cid)}" method="POST">
      <Say voice="Polly.Raveena" language="en-IN">Please press 1 for English.</Say>
      <Say voice="Polly.Aditi" language="hi-IN">Hindi ke liye 2 dabaayein.</Say>
      <Say voice="Polly.Aditi" language="hi-IN">Kannada ke liye 3 dabaayein.</Say>
    </Gather>
    <Redirect method="POST">${base}/api/public/twilio/voice</Redirect>
  `;
}

export const Route = createFileRoute("/api/public/twilio/menu")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const base = url.origin;
        try {
          const form = await request.formData();
          const cid = url.searchParams.get("cid") ?? "";
          const digits = String(form.get("Digits") ?? "").trim();
          const code = digitToCode(digits);

          if (!getCall(cid)) {
            putCall({
              id: cid, customerId: String(form.get("From") ?? "unknown"),
              customerName: "Inbound caller", phone: String(form.get("From") ?? ""),
              state: "listening", startedAt: Date.now(), transcript: [], source: "twilio",
              cart: [], menuState: "menu",
            });
          }

        if (!isLangCode(code)) {
          return twiml(langMenuXml(base, cid));
        }

        const language = codeToLanguage(code);
        patchCall(cid, { language, state: "listening", currentAgent: "InsightsAgent", cart: [] });
        setMenuState(cid, "menu");

        const tplLang = codeToTemplateLang(code);
        const v = voiceForCode(code);
        const m = voiceMenu(code);

        appendTurnServer(cid, {
          role: "system", at: Date.now(),
          text: `Language locked: ${language}`,
          language, templateLang: tplLang,
        });
        appendTurnServer(cid, {
          role: "agent", at: Date.now(),
          text: m.mainMenu, templateId: "MAIN_MENU", templateLang: tplLang,
          language, agent: "InsightsAgent",
        });

          return twiml(`
            <Gather input="dtmf" numDigits="1" timeout="8"
                    action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}&amp;lang=${code}&amp;mode=menu"
                    method="POST">
              <Say voice="${v.voice}" language="${v.locale}">${escapeXml(m.mainMenu)}</Say>
            </Gather>
            <Redirect method="POST">${base}/api/public/twilio/menu?cid=${encodeURIComponent(cid)}</Redirect>
          `);
        } catch (error) {
          console.error("Twilio menu webhook failed", error);
          return safeTwiml(base);
        }
      },
    },
  },
});
