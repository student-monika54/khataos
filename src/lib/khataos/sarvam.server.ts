// Sarvam AI speech layer — saaras:v3 STT-translate + bulbul:v3 TTS.
//
// STT: any of English / Hindi / Kannada / Hinglish / code-mixed audio is
//      normalised to ENGLISH text + a detected language code. Downstream
//      parser only deals with English.
// TTS: response text is synthesised in the customer's detected language
//      (en-IN | hi-IN | kn-IN | ta-IN | te-IN) and played back via Twilio <Play>.
//
// If SARVAM_API_KEY is not configured, callers should fall back to the
// existing DTMF menu flow (this module exports `isSarvamEnabled`).

const SARVAM_BASE = "https://api.sarvam.ai";

export type SarvamLangCode = "en-IN" | "hi-IN" | "kn-IN" | "ta-IN" | "te-IN";

export function isSarvamEnabled(): boolean {
  return !!process.env.SARVAM_API_KEY;
}

// Map Sarvam's detected language code -> our normalised code.
export function normalizeSarvamLang(code?: string): SarvamLangCode {
  if (!code) return "en-IN";
  const c = code.toLowerCase();
  if (c.startsWith("hi")) return "hi-IN";
  if (c.startsWith("kn")) return "kn-IN";
  if (c.startsWith("ta")) return "ta-IN";
  if (c.startsWith("te")) return "te-IN";
  return "en-IN";
}

export type SarvamSttResult = {
  transcript: string;          // ENGLISH (translated by saaras)
  languageCode: SarvamLangCode; // detected source language
  latencyMs: number;
  raw?: unknown;
};

// Speech → English. Uses saaras:v3 translate mode which performs language ID
// + translation in a single low-latency REST call. Twilio <Record> supplies
// VAD/endpointing; the audio turn is then translated here for the parser.
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
  form.append("model", "saaras:v3");
  form.append("mode", "translate");
  form.append("language_code", "unknown");

  const res = await fetch(`${SARVAM_BASE}/speech-to-text`, {
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

// English / Hindi / Kannada / Tamil / Telugu TTS. Returns WAV bytes.
export async function sarvamTextToSpeech(
  text: string,
  language: SarvamLangCode,
): Promise<SarvamTtsResult> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY not configured");

  const t0 = Date.now();
  const safe = text.length > 1200 ? text.slice(0, 1200) : text;
  const speaker = language === "kn-IN" ? "kavitha"
    : language === "hi-IN" ? "shreya"
    : language === "ta-IN" ? "shruti"
    : language === "te-IN" ? "manan"
    : "shubh";

  const res = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: safe,
      target_language_code: language,
      speaker,
      pace: 1.0,
      speech_sample_rate: 8000,
      model: "bulbul:v3",
      output_audio_codec: "wav",
      temperature: 0.35,
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
