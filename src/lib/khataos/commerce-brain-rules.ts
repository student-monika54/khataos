// Server-side Commerce Brain — deterministic intent + language detection
// for every transcript turn. END_CALL has the highest priority so the
// agent always gracefully terminates when the customer signals goodbye.

import type { Intent } from "./calls";

export type DetectedLanguage =
  | "Hindi" | "English" | "Hinglish" | "Kannada" | "Tamil" | "Telugu";

export type CommerceBrainOutput = {
  intent: Intent;
  language: DetectedLanguage;
  items: { name: string; quantity: string }[];
  amount?: number;
  rawText: string;
  confidence: number;
  languageConfidence: number;
  intentConfidence: number;
  endCall: boolean;
};

const HINDI_RANGE = /[\u0900-\u097F]/;
const KANNADA_RANGE = /[\u0C80-\u0CFF]/;
const TAMIL_RANGE = /[\u0B80-\u0BFF]/;
const TELUGU_RANGE = /[\u0C00-\u0C7F]/;

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s₹]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasAny = (text: string, patterns: RegExp[]) => patterns.some((re) => re.test(text));

const countMatches = (text: string, patterns: RegExp[]) =>
  patterns.reduce((sum, re) => sum + (re.test(text) ? 1 : 0), 0);

// Strong Hinglish romanised markers — if any of these appear without
// Devanagari we treat the utterance as Hinglish, not English.
const HINGLISH_HINTS = new RegExp(
  "\\b(" + [
    "bhaiya","bhai","didi","ji","sir","madam",
    "khata","khate","khaate","udhaar","udhar","udhari",
    "chahiye","chahiya","chaiye","mangta","mangti","mangtaa",
    "kitna","kitne","kitni","paisa","paise","rupaye","rupay","rupiye","rupiya",
    "chukana","chukaunga","chukaungi","chuka","chukta","bakaaya","bakaya","baki",
    "daal","daalo","daaldo","de\\s?do","dedo","dedijiye","dijiye","dijie",
    "hai","haan","nahi","nahin","theek","thik","accha","acha","achha",
    "namaste","namaskar","salaam","shukriya","dhanyavaad","dhanyavad","alvida",
    "phir","baad","abhi","kal","aaj","kalh","mein","me","ke","ka","ki","ko",
    "kya","kyu","kyun","kahan","kaise","kaisa","kaisi",
    "matlab","ho\\s?gaya","hogaya","ho\\s?jayega",
    "samaan","saaman","saman","ration","kirana","grocery",
  ].join("|") + ")\\b",
  "i",
);

// ============ END_CALL DETECTION (HIGHEST PRIORITY) ============
const END_CALL_PATTERNS: RegExp[] = [
  // English
  /\b(bye|goodbye|good\s?bye|end\s?call|hang\s?up|hangup|disconnect|thats?\s+all|that\s+is\s+all|no\s+further|nothing\s+else|i'?m\s+done|we'?re\s+done|cut\s+the\s+call|finish\s+the\s+call)\b/i,
  /\bthank\s?(you|s)\b(?!.{0,20}\?)/i,
  // Hinglish (romanised)
  /\b(theek\s?hai\s?bye|ok(ay)?\s?bye|bas\s?ho\s?gaya|bas\s?itna|bas\s?itni|kaam\s?ho\s?gaya|kaam\s?khatam|call\s?band|phone\s?rakho|rakho\s?phone|rakhta\s?hu|rakhti\s?hu|rakh\s?do|cut\s?karo|katam|khatam|done\s?bhai|chalo\s?bye|chalta\s?hu|chalti\s?hu|nikalta\s?hu)\b/i,
  /\b(thank\s?you\s?(bhai|bhaiya|ji|sir|madam|didi))\b/i,
  /\b(thanks\s?(bhai|bhaiya|ji))\b/i,
  /\b(dhanyavaad|dhanyavad|shukriya|alvida)\b/i,
  // Devanagari Hindi
  /(अलविदा|धन्यवाद|शुक्रिया|फोन\s*रखो|फोन\s*रखिये|कॉल\s*बंद|बस\s*हो\s*गया|बस\s*इतना|बस\s*इतनी|कुछ\s*नहीं\s*चाहिए|काम\s*हो\s*गया|बाय|गुडबाय)/,
  // Kannada
  /(ಧನ್ಯವಾದ|ಧನ್ಯವಾದಗಳು|ವಂದನೆ|ಬಾಯ್|ಮುಗಿಯಿತು|ಸಾಕು)/,
];

function isEndCall(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // Avoid false-positive "thank you, can you also..." — only end if the
  // utterance is short or has no continuation marker.
  for (const re of END_CALL_PATTERNS) {
    if (re.test(t)) {
      const isLong = t.split(/\s+/).length > 12;
      const hasContinuation = /\b(but|aur|lekin|magar|also|phir\s?bhi|एक\s?और|और\s?एक)\b/i.test(t);
      if (!isLong && !hasContinuation) return true;
      // Even in long sentences, explicit "bye / hang up / phone rakho / alvida" wins.
      if (/\b(bye|goodbye|hang\s?up|alvida|phone\s?rakho|कॉल\s*बंद|अलविदा)\b/i.test(t)) return true;
    }
  }
  return false;
}

// ============ PAYMENT INTENTS ============
const PAYMENT_CONFIRM = /\b(paid|paid\s?already|done\s?payment|payment\s?done|payment\s?ho\s?gaya|paisa\s?bhej\s?diya|paise\s?bhej\s?diye|bhej\s?diya|transfer\s?kar\s?diya|upi\s?kar\s?diya|gpay\s?kar\s?diya|phonepe\s?kar\s?diya|paytm\s?kar\s?diya|kar\s?diya\s?payment|de\s?diya\s?paisa)\b|(भुगतान\s*कर\s*दिया|पैसे\s*भेज\s*दिए|भेज\s*दिया)/i;
const PAYMENT_PROMISE = /\b(kal\s?karunga|kal\s?karungi|kal\s?tak|agle\s?hafte|next\s?week|tomorrow|day\s?after|paal\s?baad|baad\s?mein\s?karunga|thodi\s?der\s?mein|will\s?pay|pay\s?karunga|pay\s?karungi|chukaunga|chukaungi|de\s?dunga|de\s?dungi)\b|(कल\s*दूंगा|कल\s*दूंगी|अगले\s*हफ्ते|कल\s*तक)/i;

// ============ ITEMS / AMOUNT ============
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

function detectLanguage(t: string): DetectedLanguage {
  if (TAMIL_RANGE.test(t)) return "Tamil";
  if (TELUGU_RANGE.test(t)) return "Telugu";
  if (KANNADA_RANGE.test(t)) return "Kannada";
  if (HINDI_RANGE.test(t)) return "Hindi";
  if (HINGLISH_HINTS.test(t)) return "Hinglish";
  return "English";
}

function extractAmount(t: string): number | undefined {
  const m = t.match(/₹?\s?(\d{2,6})\s?(rupaye|rupees|rs|₹|rupiya|rupay)?/i);
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
  if (PAYMENT_CONFIRM.test(t)) return "PAYMENT_CONFIRMATION";
  if (PAYMENT_PROMISE.test(t)) return "PAYMENT_PROMISE";
  if (/^(hi|hello|namaste|namaskar|salaam|hey|haanji|haan\s?ji|बोलिए|नमस्ते)\b/i.test(lower) && t.length < 40) return "GREETING";
  if (/(balance|bakaaya|bakaya|baki|kitna\s?bacha|kitne\s?ka|how\s?much|outstanding|owe|mera\s?khata|खाता|बकाया)/i.test(t)) return "BALANCE_INQUIRY";
  if (/(trust|score|rating|bharosa|भरोसा)/i.test(t)) return "TRUST_INQUIRY";
  if (/(pay\b|paid|repay|chukana|chuka|chuk|settle\s?now|payment|भुगतान)/i.test(t)) return "REPAYMENT";
  if (/(settle|installment|kist|next\s?week|agle\s?hafte|किस्त)/i.test(t)) return "SETTLEMENT";
  if (/(reminder|overdue|due\s?since)/i.test(t)) return "COLLECTIONS_FOLLOWUP";
  if (/(speak\s?to|connect\s?to|shopkeeper|owner|dukaan|दुकानदार|मालिक)/i.test(t)) return "ESCALATE";
  if (items > 0) return "KHATA_ORDER";
  if (amount || /(udhaar|udhar|credit|khate\s?mein|loan|chahiye|mangta|mangti|उधार|चाहिए)/i.test(t)) return "CREDIT_REQUEST";
  if (/(help|madad|sahayata|मदद)/i.test(t)) return "GENERAL_HELP";
  return "UNKNOWN";
}

export function runCommerceBrainRules(text: string): CommerceBrainOutput {
  const endCall = isEndCall(text);
  const items = extractItems(text);
  const amount = extractAmount(text);
  const intent: Intent = endCall ? "END_CALL" : detectIntent(text, items.length, amount);
  const language = detectLanguage(text);
  const confidence = endCall ? 0.99 : Math.min(0.6 + items.length * 0.1 + (amount ? 0.15 : 0) + (intent !== "UNKNOWN" ? 0.15 : 0), 0.98);
  return { intent, language, items, amount, rawText: text, confidence, endCall };
}
