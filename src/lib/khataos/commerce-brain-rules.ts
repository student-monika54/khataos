// Server-side Commerce Brain — deterministic intent/language/order
// extraction used by the Twilio gather endpoint. The browser version
// (commerce-brain.ts) wraps WebLLM for on-device demo.

import type { Intent } from "./calls";

export type CommerceBrainOutput = {
  intent: Intent;
  language: "Hindi" | "English" | "Hinglish" | "Kannada" | "Tamil" | "Telugu";
  items: { name: string; quantity: string }[];
  amount?: number;
  rawText: string;
  confidence: number;
};

const HINDI_RANGE = /[\u0900-\u097F]/;
const KANNADA_RANGE = /[\u0C80-\u0CFF]/;
const TAMIL_RANGE = /[\u0B80-\u0BFF]/;
const TELUGU_RANGE = /[\u0C00-\u0C7F]/;
const HINGLISH_HINTS = /\b(bhaiya|khate|udhaar|chahiye|kitna|paisa|chukana|rupaye|bakaaya|daal|de\s?do)\b/i;

const ITEM_DICT: Record<string, string> = {
  atta: "Atta", aata: "Atta", flour: "Atta",
  oil: "Oil", tel: "Oil",
  rice: "Rice", chawal: "Rice",
  dal: "Dal", daal: "Dal",
  sugar: "Sugar", chini: "Sugar", cheeni: "Sugar",
  salt: "Salt", namak: "Salt",
  milk: "Milk", doodh: "Milk",
  bread: "Bread", soap: "Soap", sabun: "Soap",
  biscuit: "Biscuits", parle: "Parle-G",
  tea: "Tea", chai: "Tea",
};

const NUM_WORDS: Record<string, number> = {
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, chh: 6, saat: 7, aath: 8, nau: 9, das: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function detectLanguage(t: string): CommerceBrainOutput["language"] {
  if (TAMIL_RANGE.test(t)) return "Tamil";
  if (TELUGU_RANGE.test(t)) return "Telugu";
  if (KANNADA_RANGE.test(t)) return "Kannada";
  if (HINDI_RANGE.test(t)) return "Hindi";
  if (HINGLISH_HINTS.test(t)) return "Hinglish";
  return "English";
}

function extractAmount(t: string): number | undefined {
  const m = t.match(/₹?\s?(\d{2,6})\s?(rupaye|rupees|rs|₹)?/i);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

function extractItems(t: string): { name: string; quantity: string }[] {
  const lower = t.toLowerCase();
  const out: { name: string; quantity: string }[] = [];
  for (const [k, v] of Object.entries(ITEM_DICT)) {
    const re = new RegExp(`(\\d+(?:\\.\\d+)?\\s?(?:kg|kilo|litre|liter|l|g|pack|packet)?|${Object.keys(NUM_WORDS).join("|")})?\\s*${k}`, "i");
    const m = lower.match(re);
    if (m) {
      let qty = (m[1] ?? "1").trim();
      if (NUM_WORDS[qty]) qty = String(NUM_WORDS[qty]);
      if (/^\d+$/.test(qty) && /kilo|kg|atta|rice|dal|sugar|flour/.test(k + " " + lower)) qty += "kg";
      if (/oil|tel|milk|doodh/.test(k) && /^\d+$/.test(qty)) qty += "L";
      out.push({ name: v, quantity: qty });
    }
  }
  return out;
}

function detectIntent(t: string, items: number, amount?: number): Intent {
  const lower = t.toLowerCase();
  if (/(hello|hi|namaste|namaskar|salaam)/.test(lower) && t.length < 30) return "GREETING";
  if (/(balance|bakaaya|kitna|how much|outstanding|owe)/.test(lower)) return "BALANCE_INQUIRY";
  if (/(trust|score|rating)/.test(lower)) return "TRUST_INQUIRY";
  if (/(pay|paid|repay|chukana|chuka|settle now|bhej diya|done payment)/.test(lower)) return "REPAYMENT";
  if (/(settle|installment|kist|next week|agle hafte)/.test(lower)) return "SETTLEMENT";
  if (/(reminder|overdue|due since)/.test(lower)) return "COLLECTIONS_FOLLOWUP";
  if (/(speak to|connect to|shopkeeper|owner|agent)/.test(lower)) return "ESCALATE";
  if (items > 0) return "KHATA_ORDER";
  if (amount || /(udhaar|credit|khate mein|loan|chahiye)/.test(lower)) return "CREDIT_REQUEST";
  return "UNKNOWN";
}

export function runCommerceBrainRules(text: string): CommerceBrainOutput {
  const items = extractItems(text);
  const amount = extractAmount(text);
  const intent = detectIntent(text, items.length, amount);
  const language = detectLanguage(text);
  const confidence = Math.min(0.6 + items.length * 0.1 + (amount ? 0.15 : 0) + (intent !== "UNKNOWN" ? 0.15 : 0), 0.98);
  return { intent, language, items, amount, rawText: text, confidence };
}
