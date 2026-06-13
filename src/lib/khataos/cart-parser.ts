// Deterministic cart-command parser. NO LLM, NO model calls.
// Maps a single utterance to one of:
//   { action: "add"    | "remove" | "update", sku, qty }
//   { action: "view"   }   — show cart
//   { action: "checkout" } — finalize
//   { action: "endcall" }  — hangup signal
//   { action: "amount", amount }  — for credit-request mode
//   { action: "commit",  text }   — for payment-commitment mode
//   null                          — unrecognised
//
// Designed to handle short voice phrases like:
//   "2 kilo atta"
//   "add sugar"
//   "1 litre oil"
//   "remove atta"
//   "change atta to 5 kg"
//   "show cart" / "done" / "checkout" / "bye"

import { findSku, type Sku } from "./catalog";

export type CartCommand =
  | { action: "add"; sku: Sku; qty: number }
  | { action: "remove"; sku: Sku }
  | { action: "update"; sku: Sku; qty: number }
  | { action: "view" }
  | { action: "checkout" }
  | { action: "endcall" }
  | { action: "amount"; amount: number }
  | { action: "commit"; days: number; text: string };

const NUM_WORDS: Record<string, number> = {
  "one":1,"two":2,"three":3,"four":4,"five":5,"six":6,"seven":7,"eight":8,"nine":9,"ten":10,
  "ek":1,"do":2,"teen":3,"char":4,"chaar":4,"paanch":5,"panch":5,"chhe":6,"saat":7,"aath":8,"nau":9,"das":10,
  "ondu":1,"eradu":2,"mooru":3,"naalku":4,"aidu":5,
  "a":1,"an":1,"some":1,
};

const REMOVE_VERBS = /\b(remove|delete|cancel|hatao|hata\s?do|nikalo|nikal\s?do|tegidi|tegiyiri|tegeyiri)\b/i;
const UPDATE_VERBS = /\b(change|update|make|kar\s?do|badal\s?do|maadi)\b/i;
const ADD_VERBS    = /\b(add|order|i\s+need|i\s+want|chahiye|chaiye|daal\s?do|de\s?do|dijiye|beku|kodi)\b/i;
const VIEW_CMDS    = /\b(show\s+cart|view\s+cart|order\s+summary|cart\s+dikhao|saaman\s+dikhao|samaan\s+dikhao|cart\s+todi|cart\s+todidu|what'?s?\s+in\s+(my\s+)?cart)\b/i;
const CHECKOUT_CMDS = /\b(checkout|check\s?out|done|finish|finalize|proceed|that'?s?\s+all|that'?s?\s+it|bas|bas\s?ho\s?gaya|bas\s?itna|order\s+place|place\s+order|sufficient|enough|saaku|saku|mugiyitu|order\s+confirm)\b/i;
const END_CMDS     = /\b(bye|goodbye|good\s?bye|end\s+call|hang\s?up|hangup|alvida|dhanyavaad|dhanyavad|shukriya|phone\s?rakho|rakho|namaskaara|namaskara|dhanyavada|saaku)\b/i;

function parseQty(text: string): number | null {
  // Numeric: "2", "2.5"
  const m = text.match(/(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);
  // Word: "two", "do", "eradu"
  for (const [w, n] of Object.entries(NUM_WORDS)) {
    if (new RegExp(`\\b${w}\\b`, "i").test(text)) return n;
  }
  return null;
}

function findSkuInText(text: string) {
  const lower = text.toLowerCase();
  // Try each catalog entry's aliases
  // Re-use findSku via tokenisation for robustness.
  for (const alias of ALL_ALIASES) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(lower)) {
      const sku = findSku(alias);
      if (sku) return sku;
    }
  }
  return undefined;
}

import { CATALOG } from "./catalog";
const ALL_ALIASES = CATALOG.flatMap((s) => s.aliases).sort((a, b) => b.length - a.length);

export function parseCartCommand(input: string): CartCommand | null {
  const text = (input ?? "").trim();
  if (!text) return null;

  // End call has highest priority
  if (END_CMDS.test(text)) return { action: "endcall" };

  // View cart
  if (VIEW_CMDS.test(text)) return { action: "view" };

  // Checkout
  if (CHECKOUT_CMDS.test(text)) return { action: "checkout" };

  const sku = findSkuInText(text);

  // Remove
  if (REMOVE_VERBS.test(text)) {
    if (sku) return { action: "remove", sku };
    return null;
  }

  // Update / Change ("change atta to 5 kg", "make oil 2 litre")
  if (UPDATE_VERBS.test(text)) {
    const qty = parseQty(text);
    if (sku && qty != null) return { action: "update", sku, qty };
  }

  // Add (explicit verb or implicit "2 kg atta")
  if (sku) {
    const qty = parseQty(text) ?? sku.defaultQty;
    return { action: "add", sku, qty };
  }

  return null;
}

// Parse a credit-request amount: "500 rupees", "500 rupaye", "five hundred"
export function parseAmount(input: string): number | null {
  const t = (input ?? "").toLowerCase();
  const m = t.match(/(\d{2,6})/);
  if (m) return parseInt(m[1], 10);
  if (/\bfive\s+hundred\b|\bpaanch\s?sau\b/.test(t)) return 500;
  if (/\bthousand\b|\bhazaar\b|\bsaavira\b/.test(t)) {
    const k = t.match(/(\d+)\s*(thousand|hazaar|saavira)/);
    return k ? parseInt(k[1], 10) * 1000 : 1000;
  }
  if (/\btwo\s+hundred\b|\bdo\s?sau\b/.test(t)) return 200;
  if (/\bhundred\b|\bsau\b/.test(t)) return 100;
  return null;
}

// Parse a payment commitment: "tomorrow / 3 days / next week"
export function parseCommitment(input: string): { days: number; text: string } | null {
  const t = (input ?? "").toLowerCase();
  if (/\btomorrow\b|\bkal\b|\bnaale\b/.test(t)) return { days: 1, text: "tomorrow" };
  if (/\bnext\s+week\b|\bagle\s+hafte\b|\bmundina\s+vaara\b/.test(t)) return { days: 7, text: "next week" };
  const m = t.match(/(\d+)\s*(day|days|din|dina)/);
  if (m) return { days: parseInt(m[1], 10), text: `${m[1]} days` };
  if (/\btoday\b|\baaj\b|\bivattu\b/.test(t)) return { days: 0, text: "today" };
  return null;
}
