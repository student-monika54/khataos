// Deterministic cart-command parser. NO LLM, NO model calls.
// Maps a single utterance to one of:
//   { action: "add" | "remove" | "update", sku, qty }
//   { action: "view" } | "checkout" | "endcall"
//   { action: "amount", amount }            — credit-request mode
//   { action: "commit", days, text }        — payment-commitment mode
//   null                                    — unrecognised

import { CATALOG, findSku, type Sku } from "./catalog";

export type CartCommand =
  | { action: "add"; sku: Sku; qty: number }
  | { action: "remove"; sku: Sku }
  | { action: "update"; sku: Sku; qty: number }
  | { action: "view" }
  | { action: "checkout" }
  | { action: "endcall" }
  | { action: "amount"; amount: number }
  | { action: "commit"; days: number; text: string };

const ALL_ALIASES = CATALOG.flatMap((s) => s.aliases).sort((a, b) => b.length - a.length);

const NUM_WORDS: Record<string, number> = {
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  ek:1,do:2,teen:3,char:4,chaar:4,paanch:5,panch:5,chhe:6,saat:7,aath:8,nau:9,das:10,
  ondu:1,eradu:2,mooru:3,naalku:4,aidu:5,
  a:1,an:1,some:1,
};

const REMOVE_VERBS  = /\b(remove|delete|cancel|hatao|hata\s?do|nikalo|nikal\s?do|tegidi|tegiyiri|tegeyiri)\b/i;
const UPDATE_VERBS  = /\b(change|update|make|kar\s?do|badal\s?do|maadi)\b/i;
const VIEW_CMDS     = /\b(show\s+cart|view\s+cart|order\s+summary|cart\s+dikhao|saaman\s+dikhao|samaan\s+dikhao|cart\s+todi|what'?s?\s+in\s+(my\s+)?cart)\b/i;
const CHECKOUT_CMDS = /\b(checkout|check\s?out|done|finish|finalize|proceed|that'?s?\s+all|that'?s?\s+it|bas\s?ho\s?gaya|bas\s?itna|order\s+place|place\s+order|order\s+confirm|saaku|saku|mugiyitu|sufficient|enough)\b/i;
const END_CMDS      = /\b(bye|goodbye|good\s?bye|end\s+call|hang\s?up|hangup|alvida|dhanyavaad|dhanyavad|shukriya|phone\s?rakho|namaskaara|namaskara|dhanyavada)\b/i;

function parseQty(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);
  for (const [w, n] of Object.entries(NUM_WORDS)) {
    if (new RegExp(`\\b${w}\\b`, "i").test(text)) return n;
  }
  return null;
}

function findSkuInText(text: string): Sku | undefined {
  const lower = text.toLowerCase();
  for (const alias of ALL_ALIASES) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(lower)) {
      const sku = findSku(alias);
      if (sku) return sku;
    }
  }
  return undefined;
}

export function parseCartCommand(input: string): CartCommand | null {
  const text = (input ?? "").trim();
  if (!text) return null;

  if (END_CMDS.test(text)) return { action: "endcall" };
  if (VIEW_CMDS.test(text)) return { action: "view" };
  if (CHECKOUT_CMDS.test(text)) return { action: "checkout" };

  const sku = findSkuInText(text);

  if (REMOVE_VERBS.test(text)) {
    return sku ? { action: "remove", sku } : null;
  }
  if (UPDATE_VERBS.test(text)) {
    const qty = parseQty(text);
    if (sku && qty != null) return { action: "update", sku, qty };
  }
  if (sku) {
    const qty = parseQty(text) ?? sku.defaultQty;
    return { action: "add", sku, qty };
  }
  return null;
}

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

export function parseCommitment(input: string): { days: number; text: string } | null {
  const t = (input ?? "").toLowerCase();
  if (/\btomorrow\b|\bkal\b|\bnaale\b/.test(t)) return { days: 1, text: "tomorrow" };
  if (/\bnext\s+week\b|\bagle\s+hafte\b|\bmundina\s+vaara\b/.test(t)) return { days: 7, text: "next week" };
  const m = t.match(/(\d+)\s*(day|days|din|dina)/);
  if (m) return { days: parseInt(m[1], 10), text: `${m[1]} days` };
  if (/\btoday\b|\baaj\b|\bivattu\b/.test(t)) return { days: 0, text: "today" };
  return null;
}
