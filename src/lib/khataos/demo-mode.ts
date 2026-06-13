// Judge / Demo Mode — global toggle + scripted multilingual scenarios.
// When enabled, the call screen can auto-play conversations so judges
// always see a working end-to-end demonstration without dialing Twilio.

import { useSyncExternalStore } from "react";

export type DemoLanguage = "Hindi" | "English" | "Kannada" | "Tamil" | "Telugu";

export type DemoScenario = {
  id: string;
  title: string;
  description: string;
  language: DemoLanguage;
  customerLine: string;
  expectedIntent: string;
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "order_hi",
    title: "Khata order · Hindi",
    description: "Customer puts 2kg atta + 1L tel on credit",
    language: "Hindi",
    customerLine: "Do kilo atta aur ek litre tel khate mein daal do bhaiya",
    expectedIntent: "KHATA_ORDER",
  },
  {
    id: "balance_en",
    title: "Balance inquiry · English",
    description: "Customer checks outstanding khata",
    language: "English",
    customerLine: "How much do I owe right now?",
    expectedIntent: "BALANCE_INQUIRY",
  },
  {
    id: "credit_hi",
    title: "Credit extension · Hinglish",
    description: "Customer requests ₹800 additional credit",
    language: "Hindi",
    customerLine: "Mujhe 800 rupaye ka udhaar chahiye iss hafte",
    expectedIntent: "CREDIT_REQUEST",
  },
  {
    id: "repayment_hi",
    title: "Repayment promise · Hindi",
    description: "Customer commits to settle ₹1000",
    language: "Hindi",
    customerLine: "Maine abhi 1000 rupaye bhej diye, settle kar do",
    expectedIntent: "REPAYMENT",
  },
  {
    id: "order_kn",
    title: "Order · Kannada",
    description: "Customer asks for milk on credit",
    language: "Kannada",
    customerLine: "ಎರಡು ಲೀಟರ್ doodh khate mein daal do",
    expectedIntent: "KHATA_ORDER",
  },
  {
    id: "balance_ta",
    title: "Balance · Tamil",
    description: "Customer asks remaining credit",
    language: "Tamil",
    customerLine: "எனக்கு எவ்வளவு balance இருக்கு?",
    expectedIntent: "BALANCE_INQUIRY",
  },
  {
    id: "settle_te",
    title: "Settlement · Telugu",
    description: "Customer asks to settle next week",
    language: "Telugu",
    customerLine: "agle hafte tak settle చేస్తాను",
    expectedIntent: "SETTLEMENT",
  },
];

export type DemoState = {
  enabled: boolean;
  language: DemoLanguage;
  autoPlay: boolean;
};

const KEY = "khataos:demo:v1";
const DEFAULT: DemoState = { enabled: true, language: "Hindi", autoPlay: false };

let cache: DemoState | null = null;
const listeners = new Set<() => void>();

function read(): DemoState {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = DEFAULT; return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { cache = DEFAULT; }
  return cache!;
}

function write(next: DemoState) {
  cache = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useDemoMode<T = DemoState>(selector?: (s: DemoState) => T): T {
  const sel = selector ?? ((s) => s as unknown as T);
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => sel(read()),
    () => sel(DEFAULT),
  );
}

export function toggleDemoMode() { write({ ...read(), enabled: !read().enabled }); }
export function setDemoLanguage(language: DemoLanguage) { write({ ...read(), language }); }
export function setAutoPlay(autoPlay: boolean) { write({ ...read(), autoPlay }); }

export const LANG_META: Record<DemoLanguage, { code: string; native: string; flag: string }> = {
  Hindi:   { code: "hi-IN", native: "हिन्दी",  flag: "🇮🇳" },
  English: { code: "en-IN", native: "English", flag: "🇮🇳" },
  Kannada: { code: "kn-IN", native: "ಕನ್ನಡ",   flag: "🇮🇳" },
  Tamil:   { code: "ta-IN", native: "தமிழ்",   flag: "🇮🇳" },
  Telugu:  { code: "te-IN", native: "తెలుగు",   flag: "🇮🇳" },
};
