// Deepgram STT service. Replaces Twilio's native speech recognition because
// Twilio Gather speech is unreliable for hi-IN and kn-IN. Twilio remains the
// telephony layer (call routing, recording capture, TTS). Audio captured via
// <Record> is downloaded from Twilio (basic auth) and POSTed to Deepgram's
// /v1/listen REST endpoint per utterance.
//
// Model selection:
//   en, hi  → nova-2  (Deepgram's flagship; great Hindi accuracy)
//   kn      → whisper-medium  (nova-2 doesn't cover Kannada; Deepgram-hosted Whisper does)

import type { LangCode } from "./ivr";

export type DeepgramResult = {
  ok: boolean;
  transcript: string;
  confidence?: number;
  detectedLanguage?: string;
  model: string;
  language: string;
  latencyMs: number;
  error?: string;
};

const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";

export function deepgramConfigForCode(code: LangCode): { model: string; language: string } {
  switch (code) {
    case "hi": return { model: "nova-2", language: "hi" };
    case "kn": return { model: "whisper-medium", language: "kn" };
    default:   return { model: "nova-2", language: "en" };
  }
}

// Fetch the Twilio recording with HTTP Basic Auth and stream it into
// Deepgram. Returns transcript + confidence. Never throws — callers fall
// back to Twilio Gather when ok=false.
export async function transcribeTwilioRecording(
  recordingUrl: string,
  code: LangCode,
): Promise<DeepgramResult> {
  const t0 = Date.now();
  const apiKey = process.env.DEEPGRAM_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const { model, language } = deepgramConfigForCode(code);

  if (!apiKey) {
    return { ok: false, transcript: "", model, language, latencyMs: 0,
      error: "DEEPGRAM_API_KEY missing" };
  }
  if (!twilioSid || !twilioAuth) {
    return { ok: false, transcript: "", model, language, latencyMs: 0,
      error: "Twilio credentials missing for recording download" };
  }

  try {
    // Download the recording from Twilio. Use .wav for lossless input.
    const wavUrl = recordingUrl.endsWith(".wav") ? recordingUrl : `${recordingUrl}.wav`;
    const basic = `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`;

    // Twilio recordings can take ~1s to be queryable. Retry once on 404.
    let audioRes = await fetch(wavUrl, { headers: { Authorization: basic } });
    if (audioRes.status === 404) {
      await new Promise((r) => setTimeout(r, 1200));
      audioRes = await fetch(wavUrl, { headers: { Authorization: basic } });
    }
    if (!audioRes.ok) {
      return { ok: false, transcript: "", model, language, latencyMs: Date.now() - t0,
        error: `Twilio recording fetch failed: ${audioRes.status}` };
    }
    const audioBuf = await audioRes.arrayBuffer();

    // POST raw audio to Deepgram.
    const params = new URLSearchParams({
      model, language, smart_format: "true", punctuate: "true",
    });
    const dgRes = await fetch(`${DEEPGRAM_URL}?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/wav",
      },
      body: audioBuf,
    });

    if (!dgRes.ok) {
      const body = await dgRes.text().catch(() => "");
      return { ok: false, transcript: "", model, language, latencyMs: Date.now() - t0,
        error: `Deepgram ${dgRes.status}: ${body.slice(0, 200)}` };
    }

    const json = await dgRes.json() as {
      results?: {
        channels?: { alternatives?: { transcript?: string; confidence?: number }[];
          detected_language?: string }[];
      };
    };
    const alt = json.results?.channels?.[0]?.alternatives?.[0];
    const detectedLanguage = json.results?.channels?.[0]?.detected_language;

    return {
      ok: true,
      transcript: (alt?.transcript ?? "").trim(),
      confidence: alt?.confidence,
      detectedLanguage,
      model, language,
      latencyMs: Date.now() - t0,
    };
  } catch (e) {
    return { ok: false, transcript: "", model, language, latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e) };
  }
}
