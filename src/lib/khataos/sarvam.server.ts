// Sarvam AI speech layer — saaras:v2.5 STT-translate + bulbul:v1 TTS.
//
// STT: any of English / Hindi / Kannada / Hinglish / code-mixed audio is
//      normalised to ENGLISH text + a detected language code. Downstream
//      parser only deals with English.
// TTS: response text is synthesised in the customer's detected language
//      (en-IN | hi-IN | kn-IN) and played back via Twilio <Play>.
//
// If SARVAM_API_KEY is not configured, callers should fall back to the
// existing DTMF menu flow (this module exports `isSarvamEnabled`).

const SARVAM_BASE = "https://api.sarvam.ai";

export type SarvamLangCode = "en-IN" | "hi-IN" | "kn-IN";

export function isSarvamEnabled(): boolean {
  return !!process.env.SARVAM_API_KEY;
}

// Map Sarvam's detected language code -> our normalised code.
export function normalizeSarvamLang(code?: string): SarvamLangCode {
  if (!code) return "en-IN";
  const c = code.toLowerCase();
  if (c.startsWith("hi")) return "hi-IN";
  if (c.startsWith("kn")) return "kn-IN";
  return "en-IN";
}

export type SarvamSttResult = {
  transcript: string;          // ENGLISH (translated by saaras)
  languageCode: SarvamLangCode; // detected source language
  latencyMs: number;
  raw?: unknown;
};

// Speech → English. Uses saaras (speech-to-text-translate) which performs
// language ID + translation in a single call, returning English text plus
// the detected source language.
export async function sarvamTranslateSpeech(
  audio: ArrayBuffer | Uint8Array,
  filename = "audio.mp3",
  contentType = "audio/mpeg",
): Promise<SarvamSttResult> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY not configured");

  const t0 = Date.now();
  const form = new FormData();
  const blob = new Blob([audio as BlobPart], { type: contentType });
  form.append("file", blob, filename);
  form.append("model", "saaras:v2.5");
  form.append("prompt", "Indian retail kirana voice order. Items: atta, rice, oil, dal, sugar, salt, milk, biscuits, tea. Translate to English.");

  const res = await fetch(`${SARVAM_BASE}/speech-to-text-translate`, {
    method: "POST",
    headers: { "api-subscription-key": key },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sarvam STT failed [${res.status}]: ${text.slice(0, 300)}`);
  }
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error("Sarvam STT bad JSON"); }
  return {
    transcript: String(json.transcript ?? "").trim(),
    languageCode: normalizeSarvamLang(json.language_code),
    latencyMs: Date.now() - t0,
    raw: json,
  };
}

export type SarvamTtsResult = {
  // Concatenated WAV bytes (Sarvam returns base64 chunks, we splice 1st).
  audio: Uint8Array;
  contentType: "audio/wav";
  latencyMs: number;
};

// English / Hindi / Kannada TTS. Returns WAV bytes.
export async function sarvamTextToSpeech(
  text: string,
  language: SarvamLangCode,
): Promise<SarvamTtsResult> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY not configured");

  const t0 = Date.now();
  // Sarvam TTS caps input around 500 chars per chunk — keep replies short.
  const safe = text.length > 480 ? text.slice(0, 480) : text;
  const speaker = language === "kn-IN" ? "pavithra"
    : language === "hi-IN" ? "meera"
    : "arvind";

  const res = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [safe],
      target_language_code: language,
      speaker,
      pitch: 0,
      pace: 1.0,
      loudness: 1.2,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: "bulbul:v1",
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Sarvam TTS failed [${res.status}]: ${body.slice(0, 300)}`);
  const json = JSON.parse(body) as { audios?: string[] };
  const b64 = json.audios?.[0];
  if (!b64) throw new Error("Sarvam TTS: empty audios");
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return { audio: u8, contentType: "audio/wav", latencyMs: Date.now() - t0 };
}
