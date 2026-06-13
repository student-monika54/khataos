// Ephemeral per-isolate cache for Sarvam-synthesised TTS audio.
// Twilio <Play> needs a fetchable URL — we store the WAV bytes here and
// expose them at /api/public/twilio/tts/{id}. Entries auto-expire after
// 10 minutes to bound memory.

type Entry = { audio: Uint8Array; contentType: string; expiresAt: number };
const g = globalThis as unknown as { __khataos_tts?: Map<string, Entry> };
if (!g.__khataos_tts) g.__khataos_tts = new Map();
const store = g.__khataos_tts!;

const TTL_MS = 10 * 60 * 1000;

export function putTts(id: string, audio: Uint8Array, contentType = "audio/wav") {
  store.set(id, { audio, contentType, expiresAt: Date.now() + TTL_MS });
  // Opportunistic cleanup
  if (store.size > 200) {
    const now = Date.now();
    for (const [k, v] of store) if (v.expiresAt < now) store.delete(k);
  }
}

export function getTts(id: string): Entry | undefined {
  const e = store.get(id);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) { store.delete(id); return undefined; }
  return e;
}
