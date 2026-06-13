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

const KANNADA_ROMAN_HINTS = /\b(nanna|nanage|nanu|eshtu|beku|beka|saala|sala|udara|hana|rupayi|roopayi|kattide|madide|maadide|dhanyavada|namaskara|innenu|baki)\b/i;

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
  /\b(dhanyavada|dhanyavadagalu|bye|saaku|mugiyitu|call\s+cut\s+maadi|phone\s+idi)\b/i,
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

const INTENT_PATTERNS: Partial<Record<Intent, RegExp[]>> = {
  BALANCE_INQUIRY: [
    /\b(balance|outstanding|dues?|due\s+amount|amount\s+due|owe|owed|how\s+much|what\s+is\s+my\s+(balance|outstanding)|check\s+my\s+balance)\b/i,
    /\b(mera|meri|my)?\s*(khata|khaata|account|balance|bakaaya|bakaya|baki)\s*(kitna|check|dikhao|batao|hai)?\b/i,
    /(मेरा\s*)?(बैलेंस|बकाया|खाता|बाकी).*(कितना|बताइए|बताओ|चेक)|(कितना\s*(बकाया|बाकी))/i,
    /(ಬಾಕಿ|ಬ್ಯಾಲೆನ್ಸ್|ಖಾತೆ|ಎಷ್ಟು|ಎಷ್ಟಿದೆ|balance|outstanding)/i,
  ],
  CREDIT_REQUEST: [
    /\b(can\s+i\s+get|need|want|request|give\s+me|can\s+you\s+give).{0,40}\b(credit|loan|more\s+credit|rupees?|rs|₹)\b/i,
    /\b(credit|loan|udhaar|udhar|khate\s+mein|khata\s+mein).{0,30}\b(chahiye|chaiye|need|want|de\s?do|dijiye|more|aur)\b/i,
    /\b(mujhe|mereko).{0,35}\b(credit|udhaar|rupaye|rupees?|paisa|paise).{0,35}\b(chahiye|de\s?do|dijiye|aur)\b/i,
    /(उधार|क्रेडिट|लोन|रुपये).*(चाहिए|दीजिए|दे दो|मिलेगा|और)|(मुझे).*(उधार|क्रेडिट)/i,
    /(ಸಾಲ|ಕ್ರೆಡಿಟ್|ಉಧಾರ|ರೂಪಾಯಿ|ಹಣ).*(ಬೇಕು|ಕೊಡಿ|ಸಿಗುತ್ತದೆಯೇ|ಹೆಚ್ಚು)|(ನನಗೆ).*(ಸಾಲ|ಕ್ರೆಡಿಟ್|ಹಣ)/i,
  ],
  PAYMENT_CONFIRMATION: [
    PAYMENT_CONFIRM,
    /\b(i\s+paid|paid\s+my\s+dues?|dues?\s+paid|payment\s+(is\s+)?done|i\s+have\s+paid|already\s+paid|sent\s+the\s+money|transferred)\b/i,
    /\b(payment|paisa|paise|amount|dues?)\s*(kar\s*diya|ho\s*gaya|bhej\s*diya|de\s*diya|paid|done)\b/i,
    /(मैंने|मैने).*(भुगतान|पेमेंट|पैसे).*(कर\s*दिया|भेज\s*दिए|दे\s*दिए)|(भुगतान|पेमेंट).*(हो\s*गया|कर\s*दिया)/i,
    /(ಪಾವತಿ|ಹಣ).*(ಮಾಡಿದೆ|ಕಟ್ಟಿದೆ|ಕೊಟ್ಟಿದ್ದೇನೆ|ಕಳುಹಿಸಿದೆ)|(ನಾನು).*(ಪಾವತಿ|ಹಣ).*(ಮಾಡಿದೆ|ಕಟ್ಟಿದೆ)/i,
  ],
  REPAYMENT: [
    /\b(pay\s+now|repay|make\s+a\s+payment|settle\s+now|clear\s+dues?)\b/i,
    /\b(abhi|aaj).{0,20}\b(pay|payment|chuka|de\s*dunga|settle)\b/i,
    /(अभी|आज).*(भुगतान|पेमेंट|चुका|देना)/i,
    /(ಈಗ|ಇಂದು).*(ಪಾವತಿ|ಕಟ್ಟುತ್ತೇನೆ|ಕೊಡುತ್ತೇನೆ)/i,
  ],
  SETTLEMENT: [
    PAYMENT_PROMISE,
    /\b(settlement|installment|instalment|pay\s+later|next\s+week|tomorrow|promise\s+to\s+pay|will\s+pay)\b/i,
    /\b(kal|agle\s+hafte|baad\s+mein|kist|kishti|thodi\s+der).{0,30}\b(pay|payment|chuka|dunga|dungi|karunga|karungi)\b/i,
    /(कल|अगले\s*हफ्ते|किस्त|बाद\s*में).*(भुगतान|पेमेंट|दूंगा|दूंगी|करूँगा|करूंगा)/i,
    /(ನಾಳೆ|ಮುಂದಿನ\s*ವಾರ|ಕಂತು|ನಂತರ).*(ಪಾವತಿ|ಕಟ್ಟುತ್ತೇನೆ|ಕೊಡುತ್ತೇನೆ)/i,
  ],
  TRUST_INQUIRY: [
    /\b(trust|score|rating|credit\s+score|bharosa)\b/i,
    /(भरोसा|ट्रस्ट|स्कोर|रेटिंग)/i,
    /(ನಂಬಿಕೆ|ಸ್ಕೋರ್|ರೇಟಿಂಗ್|trust)/i,
  ],
  COLLECTIONS_FOLLOWUP: [
    /\b(reminder|overdue|late\s+payment|due\s+since|collection)\b/i,
    /(याद\s*दिलाना|ओवरड्यू|बकाया\s*देरी|देर\s*से)/i,
    /(ನೆನಪು|ಬಾಕಿ|ತಡ|overdue)/i,
  ],
  ESCALATE: [
    /\b(speak\s+to|connect\s+to|shopkeeper|owner|human|agent|dukaan|dukan)\b/i,
    /(दुकानदार|मालिक|इंसान|बात\s*करनी)/i,
    /(ಅಂಗಡಿಯವರು|ಮಾಲೀಕ|ಮಾನವ|ಮಾತನಾಡಬೇಕು)/i,
  ],
  GENERAL_HELP: [
    /\b(help|support|what\s+can\s+you\s+do|madad|sahayata)\b/i,
    /(मदद|सहायता)/i,
    /(ಸಹಾಯ|help)/i,
  ],
};

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

function detectLanguage(t: string): { language: DetectedLanguage; confidence: number } {
  if (TAMIL_RANGE.test(t)) return { language: "Tamil", confidence: 0.98 };
  if (TELUGU_RANGE.test(t)) return { language: "Telugu", confidence: 0.98 };
  if (KANNADA_RANGE.test(t)) return { language: "Kannada", confidence: 0.98 };
  if (HINDI_RANGE.test(t)) return { language: "Hindi", confidence: 0.98 };
  const normalized = normalise(t);
  if (KANNADA_ROMAN_HINTS.test(normalized)) return { language: "Kannada", confidence: 0.86 };
  const hinglishSignals = (normalized.match(HINGLISH_HINTS) ? 1 : 0)
    + countMatches(normalized, [/\b(mera|mujhe|maine|aap|khata|udhaar|rupaye|chahiye|karo|karna|hai|kitna|bakaaya|bakaya)\b/i]);
  if (hinglishSignals > 0) return { language: "Hinglish", confidence: hinglishSignals > 1 ? 0.91 : 0.82 };
  return { language: "English", confidence: /\b(balance|credit|payment|paid|dues|outstanding|thank|bye)\b/i.test(normalized) ? 0.93 : 0.78 };
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

function detectIntent(t: string, items: number, amount?: number): { intent: Intent; confidence: number } {
  const normalized = normalise(t);
  if (isEndCall(t)) return { intent: "END_CALL", confidence: 0.99 };
  if (/^(hi|hello|namaste|namaskar|salaam|hey|haanji|haan\s?ji|ಬೋಲಿ|नमस्ते|नमस्कार)\b/i.test(normalized) && normalized.length < 40) {
    return { intent: "GREETING", confidence: 0.88 };
  }

  let best: { intent: Intent; confidence: number; hits: number } = { intent: "UNKNOWN", confidence: 0.2, hits: 0 };
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [Intent, RegExp[]][]) {
    const hits = countMatches(t, patterns) + countMatches(normalized, patterns);
    if (hits > best.hits) {
      best = { intent, hits, confidence: Math.min(0.72 + hits * 0.1, 0.96) };
    }
  }

  if (items > 0 && best.intent === "UNKNOWN") return { intent: "KHATA_ORDER", confidence: 0.82 };
  if (amount && hasAny(t, INTENT_PATTERNS.CREDIT_REQUEST ?? [])) return { intent: "CREDIT_REQUEST", confidence: Math.max(best.confidence, 0.91) };
  if (amount && best.intent === "UNKNOWN") return { intent: "CREDIT_REQUEST", confidence: 0.74 };
  return { intent: best.intent, confidence: best.confidence };
}

export function runCommerceBrainRules(text: string): CommerceBrainOutput {
  const items = extractItems(text);
  const amount = extractAmount(text);
  const languageResult = detectLanguage(text);
  const intentResult = detectIntent(text, items.length, amount);
  const confidence = Math.min((languageResult.confidence + intentResult.confidence) / 2, 0.99);
  return {
    intent: intentResult.intent,
    language: languageResult.language,
    items,
    amount,
    rawText: text,
    confidence,
    languageConfidence: languageResult.confidence,
    intentConfidence: intentResult.confidence,
    endCall: intentResult.intent === "END_CALL",
  };
}
