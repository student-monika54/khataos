# Root cause

The call now reaches Sarvam end-to-end (logs show success):
```
[Sarvam pipeline] {"transcript":"Hello","sttTransport":"streaming","intent":"GREETING","sttLatency":1460,"ttsLatency":2212}
```
…but the very next request from Twilio is:
```
GET /api/public/twilio/tts/<id> → 404
```
Twilio receives 404 for the audio URL we handed it in TwiML, so it plays its built-in fallback **"An application error has occurred, goodbye"** and hangs up.

Why 404: `src/lib/khataos/tts-cache.server.ts` keeps the WAV bytes in a `globalThis` `Map` (in-memory, per-isolate). On Cloudflare Workers (where the published site runs) each request can land on a different isolate, so the entry written during `/record` is not visible to the follow-up `/tts/<id>` fetch.

# Fix — persist TTS audio across requests

Two viable paths. Both keep the rest of the Sarvam pipeline untouched.

## Option A (recommended) — store WAV in Lovable Cloud Storage
- Enable Lovable Cloud (Storage bucket `twilio-tts`, public read, 1-hour lifecycle).
- In `twilio.record.ts`, after `sarvamTextToSpeech`: upload bytes to `twilio-tts/{cid}/{ts}.wav` via the service-role client, get the public URL, put that URL inside `<Play>…</Play>`.
- Delete `tts-cache.server.ts` and the `/api/public/twilio/tts/$id.ts` route — no longer needed.
- Pros: works across every isolate, survives cold starts, no extra hop. Cons: requires Cloud.

## Option B — drop the cache, use Twilio `<Say>` (no Cloud)
- Skip Sarvam TTS entirely; return `<Say voice="…" language="…">{reply}</Say>` (already implemented as the fallback path).
- Pros: zero infra. Cons: Polly/Google voices for hi/kn/ta/te are noticeably lower quality than Sarvam bulbul; loses your demo's wow factor.

## Option C — keep Sarvam TTS but inline via Twilio Media Streams
Bigger rewrite (WebSocket bridge). Not recommended for a demo fix.

# Recommendation
Go with **Option A**. It's the minimum change that keeps Sarvam's Indic-language TTS and makes the call complete reliably.

# Files touched (Option A)
- `src/routes/api/public/twilio.record.ts` — upload WAV to Storage, use returned URL in `<Play>`.
- `src/lib/khataos/tts-cache.server.ts` — delete.
- `src/routes/api/public/twilio.tts.$id.ts` — delete.
- New migration: create `twilio-tts` public Storage bucket.

# Question for you
Confirm **Option A** (enable Lovable Cloud + Storage) — or pick B/C and I'll plan accordingly.
