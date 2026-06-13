// Twilio guided voice-commerce state machine.
//
// Modes (query param `mode`):
//   menu     — caller pressed a digit on the main menu; route to sub-flow.
//   cart     — caller is inside Place Order; parse cart commands (speech).
//   credit   — caller is inside Request Credit; parse amount (speech/DTMF).
//   payment  — caller is inside Payment Commitment; parse a date phrase.
//
// Every branch:
//   * Produces a TTS reply in the LOCKED language.
//   * Re-Gathers if more input is needed, else returns to the main menu
//     or hangs up.
//   * Runs in <2s — no LLM calls in the hot path.
//
// Pressing 0 anywhere returns to the main menu; pressing 9 returns to
// language selection.

import { createFileRoute } from "@tanstack/react-router";
import {
  appendTurnServer, getCall, patchCall, putCall, setCart, setMenuState,
} from "@/lib/khataos/call-store.server";
import {
  codeToLanguage, codeToTemplateLang, isLangCode, voiceForCode,
  sttLocaleForCode, sttModelForCode, languageToCode, type LangCode,
} from "@/lib/khataos/ivr";
import { voiceMenu } from "@/lib/khataos/voice-menu";
import { parseCartCommand, parseAmount, parseCommitment } from "@/lib/khataos/cart-parser";
import type { CartLine } from "@/lib/khataos/calls";
import { runFinancialBrain } from "@/lib/khataos/financial-brain.server";
import { publishLiveOrder, listLiveOrders } from "@/lib/khataos/live-orders.server";

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}
function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

// Resolve a customer profile from caller phone. Falls back to demo defaults.
function resolveCustomer(phone: string) {
  // Single hardcoded demo customer — matches src/lib/khataos/data.ts seed.
  return {
    id: "c_me",
    name: "Ramesh Kumar",
    phone,
    trustScore: 82,
    outstanding: 1850,
    creditLimit: 5000,
    reliability: 91,
  };
}

function cartTotal(cart: CartLine[]) {
  return cart.reduce((s, l) => s + l.qty * l.price, 0);
}
function cartLinesText(cart: CartLine[]) {
  return cart.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(", ");
}

function mainMenuTwiml(base: string, cid: string, code: LangCode, prefix?: string): string {
  const v = voiceForCode(code);
  const m = voiceMenu(code);
  const intro = prefix ? `<Say voice="${v.voice}" language="${v.locale}">${escapeXml(prefix)}</Say>` : "";
  return `
    ${intro}
    <Gather input="dtmf" numDigits="1" timeout="8"
            action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}&amp;lang=${code}&amp;mode=menu"
            method="POST">
      <Say voice="${v.voice}" language="${v.locale}">${escapeXml(m.mainMenu)}</Say>
    </Gather>
    <Redirect method="POST">${base}/api/public/twilio/menu?cid=${encodeURIComponent(cid)}</Redirect>
  `;
}

function speechGatherTwiml(
  base: string, cid: string, code: LangCode, mode: "cart" | "credit" | "payment",
  prompt: string,
): string {
  const v = voiceForCode(code);
  const stt = sttLocaleForCode(code);
  const sttModel = sttModelForCode(code);
  return `
    <Gather input="speech dtmf" numDigits="1" speechTimeout="auto" language="${stt}"
            action="${base}/api/public/twilio/gather?cid=${encodeURIComponent(cid)}&amp;lang=${code}&amp;mode=${mode}"
            method="POST" speechModel="${sttModel}">
      <Say voice="${v.voice}" language="${v.locale}">${escapeXml(prompt)}</Say>
    </Gather>
    <Redirect method="POST">${base}/api/public/twilio/menu?cid=${encodeURIComponent(cid)}</Redirect>
  `;
}

export const Route = createFileRoute("/api/public/twilio/gather")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const url = new URL(request.url);
        const base = url.origin;
        const cid = url.searchParams.get("cid") ?? "";
        const urlCode = url.searchParams.get("lang");
        const mode = (url.searchParams.get("mode") ?? "menu") as "menu" | "cart" | "credit" | "payment";
        const speech = String(form.get("SpeechResult") ?? "").trim();
        const digits = String(form.get("Digits") ?? "").trim();

        // Resolve call + language
        let call = getCall(cid);
        if (!call) {
          putCall({
            id: cid, customerId: "unknown", customerName: "Inbound caller",
            phone: String(form.get("From") ?? ""), state: "listening",
            startedAt: Date.now(), transcript: [], source: "twilio",
            cart: [], menuState: "menu",
          });
          call = getCall(cid)!;
        }
        const code: LangCode = isLangCode(urlCode) ? urlCode : languageToCode(call.language);
        const tplLang = codeToTemplateLang(code);
        const v = voiceForCode(code);
        const m = voiceMenu(code);

        // Universal: press 9 → change language
        if (digits === "9") {
          return twiml(`<Redirect method="POST">${base}/api/public/twilio/voice</Redirect>`);
        }
        // Universal: press 0 → main menu
        if (digits === "0") {
          setMenuState(cid, "menu");
          return twiml(mainMenuTwiml(base, cid, code));
        }

        if (speech) {
          appendTurnServer(cid, {
            role: "customer", at: Date.now(), text: speech, rawTranscript: speech,
            language: codeToLanguage(code), pipelineStage: "stt",
          });
        }

        // ===== MAIN MENU dispatch =====
        if (mode === "menu") {
          setMenuState(cid, "menu");
          switch (digits) {
            case "1": {
              setMenuState(cid, "cart");
              setCart(cid, []);
              return twiml(speechGatherTwiml(base, cid, code, "cart", m.whatOrder));
            }
            case "2": {
              const cust = resolveCustomer(call.phone);
              const reply = m.balance(cust.outstanding, Math.max(0, cust.creditLimit - cust.outstanding));
              appendTurnServer(cid, { role: "agent", at: Date.now(), text: reply, templateId: "BALANCE_INQUIRY", templateLang: tplLang, language: codeToLanguage(code) });
              return twiml(mainMenuTwiml(base, cid, code, reply));
            }
            case "3": {
              setMenuState(cid, "credit");
              return twiml(speechGatherTwiml(base, cid, code, "credit", m.askCreditAmount));
            }
            case "4": {
              const orders = listLiveOrders().filter((o) => o.callId.startsWith(cid) || o.phone === call.phone);
              const reply = orders[0]
                ? m.orderStatus(orders[0].stage.replace(/_/g, " "))
                : m.noOrders;
              appendTurnServer(cid, { role: "agent", at: Date.now(), text: reply, templateId: "ORDER_STATUS", templateLang: tplLang, language: codeToLanguage(code) });
              return twiml(mainMenuTwiml(base, cid, code, reply));
            }
            case "5": {
              setMenuState(cid, "payment");
              return twiml(speechGatherTwiml(base, cid, code, "payment", m.askCommitment));
            }
            case "6": {
              appendTurnServer(cid, { role: "agent", at: Date.now(), text: m.farewell, templateId: "END_CALL", templateLang: tplLang, language: codeToLanguage(code) });
              patchCall(cid, { state: "completed", endedAt: Date.now(), durationSec: Math.round((Date.now() - call.startedAt) / 1000), outcome: "info", summary: m.farewell });
              return twiml(`<Say voice="${v.voice}" language="${v.locale}">${escapeXml(m.farewell)}</Say><Hangup/>`);
            }
            default:
              return twiml(mainMenuTwiml(base, cid, code, m.invalidMenu));
          }
        }

        // ===== CART mode =====
        if (mode === "cart") {
          const cmd = parseCartCommand(speech);
          const cart = (getCall(cid)?.cart ?? []).slice();

          if (!cmd) {
            return twiml(speechGatherTwiml(base, cid, code, "cart", m.notUnderstood));
          }
          if (cmd.action === "endcall") {
            patchCall(cid, { state: "completed", endedAt: Date.now() });
            return twiml(`<Say voice="${v.voice}" language="${v.locale}">${escapeXml(m.farewell)}</Say><Hangup/>`);
          }
          if (cmd.action === "view") {
            const reply = cart.length === 0 ? m.cartEmpty : m.cartSummary(cartLinesText(cart), cartTotal(cart));
            appendTurnServer(cid, { role: "agent", at: Date.now(), text: reply, templateId: "VIEW_CART", templateLang: tplLang, language: codeToLanguage(code) });
            return twiml(speechGatherTwiml(base, cid, code, "cart", reply + " " + m.whatOrder));
          }
          if (cmd.action === "add") {
            const existing = cart.findIndex((l) => l.skuId === cmd.sku.id);
            if (existing >= 0) cart[existing].qty += cmd.qty;
            else cart.push({ skuId: cmd.sku.id, name: cmd.sku.name, qty: cmd.qty, unit: cmd.sku.unit, price: cmd.sku.pricePerUnit });
            setCart(cid, cart);
            const reply = m.itemAdded(cmd.sku.name, cmd.qty, cmd.sku.unit);
            appendTurnServer(cid, { role: "agent", at: Date.now(), text: reply, templateId: "ITEM_ADDED", templateLang: tplLang, language: codeToLanguage(code) });
            return twiml(speechGatherTwiml(base, cid, code, "cart", reply));
          }
          if (cmd.action === "remove") {
            const next = cart.filter((l) => l.skuId !== cmd.sku.id);
            setCart(cid, next);
            const reply = m.itemRemoved(cmd.sku.name);
            appendTurnServer(cid, { role: "agent", at: Date.now(), text: reply, templateId: "ITEM_REMOVED", templateLang: tplLang, language: codeToLanguage(code) });
            return twiml(speechGatherTwiml(base, cid, code, "cart", reply));
          }
          if (cmd.action === "update") {
            const idx = cart.findIndex((l) => l.skuId === cmd.sku.id);
            if (idx >= 0) cart[idx].qty = cmd.qty;
            else cart.push({ skuId: cmd.sku.id, name: cmd.sku.name, qty: cmd.qty, unit: cmd.sku.unit, price: cmd.sku.pricePerUnit });
            setCart(cid, cart);
            const reply = m.itemUpdated(cmd.sku.name, cmd.qty, cmd.sku.unit);
            return twiml(speechGatherTwiml(base, cid, code, "cart", reply));
          }
          if (cmd.action === "checkout") {
            if (cart.length === 0) {
              return twiml(speechGatherTwiml(base, cid, code, "cart", m.cartEmpty + " " + m.whatOrder));
            }
            const cust = resolveCustomer(call.phone);
            const total = cartTotal(cart);
            const orderId = `lo_${cid}_${Date.now()}`;
            // Stage 1: publish PENDING credit review
            publishLiveOrder({
              id: orderId, callId: cid,
              customerId: cust.id, customerName: cust.name, phone: cust.phone,
              items: cart.map((l) => ({ name: l.name, quantity: `${l.qty} ${l.unit}` })),
              amount: total, trustScore: cust.trustScore, outstanding: cust.outstanding,
              creditLimit: cust.creditLimit, stage: "checking_credit",
              language: codeToLanguage(code),
              createdAt: Date.now(), updatedAt: Date.now(),
            });
            // Stage 2: financial brain (kept off the hot path so reply stays snappy)
            const fin = await runFinancialBrain({
              intent: "KHATA_ORDER", customerName: cust.name, trustScore: cust.trustScore,
              outstanding: cust.outstanding, creditLimit: cust.creditLimit,
              reliability: cust.reliability, requestedAmount: total,
            });
            const stage = fin.decision === "approve" ? "ready_for_fulfillment"
              : fin.decision === "reject" ? "rejected"
              : fin.decision === "conditional" ? "conditional"
              : "ready_for_fulfillment";
            publishLiveOrder({
              id: orderId, callId: cid, customerId: cust.id, customerName: cust.name,
              phone: cust.phone,
              items: cart.map((l) => ({ name: l.name, quantity: `${l.qty} ${l.unit}` })),
              amount: total, trustScore: cust.trustScore, outstanding: cust.outstanding,
              creditLimit: cust.creditLimit, stage,
              decision: fin.decision === "info" ? undefined : fin.decision,
              reasoning: fin.reasoning, language: codeToLanguage(code),
              createdAt: Date.now(), updatedAt: Date.now(),
            });

            const reply = stage === "ready_for_fulfillment" ? m.orderApproved
              : stage === "conditional" ? m.orderConditional(fin.recommendedAmount ?? total)
              : m.orderRejected(fin.reasoning);

            appendTurnServer(cid, {
              role: "agent", at: Date.now(), text: m.checkoutReview(cartLinesText(cart), total),
              templateId: "CHECKOUT_REVIEW", templateLang: tplLang, language: codeToLanguage(code),
            });
            appendTurnServer(cid, {
              role: "agent", at: Date.now(), text: reply, templateId: "ORDER_DECISION",
              templateLang: tplLang, language: codeToLanguage(code),
              decision: fin.decision === "info" ? undefined : fin.decision,
              reasoning: fin.reasoning,
            });
            setCart(cid, []);
            setMenuState(cid, "menu");
            return twiml(`
              <Say voice="${v.voice}" language="${v.locale}">${escapeXml(m.checkoutReview(cartLinesText(cart), total))}</Say>
              <Say voice="${v.voice}" language="${v.locale}">${escapeXml(reply)}</Say>
              ${mainMenuTwiml(base, cid, code)}
            `);
          }
        }

        // ===== CREDIT mode =====
        if (mode === "credit") {
          const amount = parseAmount(speech);
          if (!amount) {
            return twiml(speechGatherTwiml(base, cid, code, "credit", m.notUnderstood + " " + m.askCreditAmount));
          }
          const cust = resolveCustomer(call.phone);
          const fin = await runFinancialBrain({
            intent: "CREDIT_REQUEST", customerName: cust.name, trustScore: cust.trustScore,
            outstanding: cust.outstanding, creditLimit: cust.creditLimit,
            reliability: cust.reliability, requestedAmount: amount,
          });
          const reply = fin.decision === "approve" ? m.creditApproved(amount)
            : fin.decision === "conditional" ? m.creditConditional(fin.recommendedAmount ?? amount)
            : m.creditRejected;
          appendTurnServer(cid, { role: "agent", at: Date.now(), text: reply, templateId: "CREDIT_DECISION", templateLang: tplLang, language: codeToLanguage(code), decision: fin.decision === "info" ? undefined : fin.decision, reasoning: fin.reasoning });
          setMenuState(cid, "menu");
          return twiml(mainMenuTwiml(base, cid, code, reply));
        }

        // ===== PAYMENT mode =====
        if (mode === "payment") {
          const c = parseCommitment(speech);
          if (!c) {
            return twiml(speechGatherTwiml(base, cid, code, "payment", m.notUnderstood + " " + m.askCommitment));
          }
          const reply = m.commitmentSaved(c.text);
          appendTurnServer(cid, { role: "agent", at: Date.now(), text: reply, templateId: "PAYMENT_COMMITMENT", templateLang: tplLang, language: codeToLanguage(code) });
          setMenuState(cid, "menu");
          return twiml(mainMenuTwiml(base, cid, code, reply));
        }

        // Default — back to menu
        return twiml(mainMenuTwiml(base, cid, code));
      },
    },
  },
});
