// Shared IVR helpers — language code mapping, Twilio voice selection,
// STT hints. Single source of truth so the voice, menu and gather routes
// stay in sync.

import type { DetectedLanguage } from "./commerce-brain-rules";
import type { TemplateLang } from "./templates";

export type LangCode = "en" | "hi" | "kn";

export const LANG_CODES: LangCode[] = ["en", "hi", "kn"];

export const isLangCode = (s: unknown): s is LangCode =>
  s === "en" || s === "hi" || s === "kn";

export function codeToLanguage(code: LangCode): DetectedLanguage {
  return code === "en" ? "English" : code === "hi" ? "Hindi" : "Kannada";
}

export function codeToTemplateLang(code: LangCode): TemplateLang {
  return code;
}

export function languageToCode(lang?: string): LangCode {
  if (lang === "Hindi" || lang === "Hinglish") return "hi";
  if (lang === "Kannada") return "kn";
  return "en";
}

// Twilio <Say> voice + locale for each locked language.
// Polly has reliable Hindi (Aditi) and English (Raveena) voices.
// Kannada uses Google Neural (Twilio supports Google.kn-IN-* voices).
// NOTE: Google voices require an account-level integration and are NOT
// available on Twilio trial accounts — using them causes the runtime
// "An application error has occurred" message. Polly voices work on every
// account, so we fall back to Polly.Aditi (Hindi) for Kannada and speak
// transliterated text. Swap back to Google.kn-IN-* once enabled on the
// Twilio account.
export function voiceForCode(code: LangCode): { voice: string; locale: string } {
  switch (code) {
    case "hi": return { voice: "Polly.Aditi", locale: "hi-IN" };
    case "kn": return { voice: "Polly.Aditi", locale: "hi-IN" };
    default:   return { voice: "Polly.Raveena", locale: "en-IN" };
  }
}

// Twilio Gather speech-recognition language hint.
export function sttLocaleForCode(code: LangCode): string {
  switch (code) {
    case "hi": return "hi-IN";
    case "kn": return "kn-IN";
    default:   return "en-IN";
  }
}

// Twilio speechModel. `experimental_conversations` is English-only —
// using it with hi-IN / kn-IN breaks transcription. Use the default
// model for non-English locales so STT actually runs.
export function sttModelForCode(code: LangCode): string {
  return code === "en" ? "experimental_conversations" : "default";
}

// Localised "press 9 to change language" footer prompt.
export function changeLangHint(code: LangCode): string {
  switch (code) {
    case "hi": return "Bhasha badalne ke liye 9 dabaayein.";
    case "kn": return "Bhaashe badalisalu 9 ottirisi.";
    default:   return "Press 9 to change language.";
  }
}
