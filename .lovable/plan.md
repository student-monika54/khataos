## Goal

The phone-call agent should feel like Quick Voice: hears any language (English/Hindi/Kannada/Tamil/Telugu), replies in the SAME language, responds within ~2s, never gets stuck on "I didn't catch that", and the final order lands on both `/app/customer/orders` and the retailer's approval queue.

No changes to Quick Voice, Financial Brain, orders schema, catalog, or DB. Only edit the two Twilio webhook files.

## What's wrong today (in `src/routes/api/public/twilio.record.ts` + `twilio.voice.ts`)

1. **Reprompt loop** — short pauses, soft speech, or any utterance Gemini can't parse fires `"I didn't catch any items…"` in English and re-records. Two near-misses in a row = the caller gives up.
2. **Replies are English-only** — `"Added 2 kg rice. Anything else?"` and `"Your order has been confirmed…"` are hardcoded English even when Sarvam detected Hindi/Kannada. TTS speaks English text in a Hindi voice = unnatural.
3. **Slow turn** — `<Record timeout="3" maxLength="20">` waits up to 3s of silence; recording fetch tries `.wav` then `.mp3` sequentially with 600ms backoff (up to ~5s wasted on the cold first turn); TTS is uploaded to Storage and re-signed before `<Play>` (adds ~400ms).
4. **Greeting** — English-only `"Welcome to KhataOS. Please tell me…"` before Sarvam ever sees the caller's voice; fine, but make it shorter so first beep arrives faster.

## Changes

### 1. `src/routes/api/public/twilio.record.ts`

**a. Localized replies (mirror Quick Voice's approach).** Add a tiny `phrases(code)` helper returning the four strings the agent ever speaks:
- `added(itemsText)` → e.g. Hindi `"{items} जोड़ दिया। और कुछ चाहिए?"`, Kannada `"{items} ಸೇರಿಸಲಾಗಿದೆ. ಇನ್ನೇನಾದರೂ?"`, Tamil/Telugu equivalents, English fallback.
- `reprompt(hasCart)` → "क्या और चाहिए या 'हो गया' बोलें" / "ಇನ್ನೇನಾದರೂ ಬೇಕೆ ಅಥವಾ 'ಮುಗಿಯಿತು' ಎನ್ನಿ" etc.
- `confirmed(summary)` → "आपका {items} का ऑर्डर मंज़ूरी के लिए भेज दिया गया। धन्यवाद।" / Kannada / etc.
- `goodbyeEmpty()` → "ठीक है, कोई ऑर्डर नहीं। धन्यवाद।" etc.

Localize item names + units the same way the Quick Voice `langKeyOf` / `localizeItem` helpers already do (reuse the existing maps in `catalog.ts` — `SKU_NAMES_BY_LANG` / `UNIT_LABELS`). Use those localized names for both the spoken reply AND the `items[]` written to the `orders` row, so the customer's Orders tab and the retailer's Orders tab paint in the caller's language (matching Quick Voice behavior).

**b. Kill the "I didn't catch" loop.** Replace the current "no items detected" branch with:
- Run the Gemini extractor with a 1.2s timeout; if it times out OR returns 0 items, immediately try the existing `extractCatalogOrder(transcript)` deterministic matcher (already exported from `order-extractor.server.ts`) — that catches rice/sugar/atta/etc. even when Gemini stalls.
- Track `consecutiveMisses` on the call record (extend `call-store.server.ts` with a small `bumpMiss(cid)` / `resetMiss(cid)` pair, or stash on `CallRecord.menuState`'s sibling field). After **1** miss with a non-empty cart → finalize the order automatically and hang up (caller already named items; trailing "umm" shouldn't block them). After 2 misses with empty cart → say a localized "I couldn't understand. Please call back." and hang up instead of looping forever.
- For empty/zero-duration recordings (the existing `recordingDuration < 1` path), don't reprompt — just `<Record>` again silently with no `<Say>`. The beep already cues the caller.

**c. Faster turn time:**
- Drop the WAV→MP3 sequential fallback. Twilio always exposes `.wav`; fetch only `.wav` with 1 retry at 300ms, fall back to gateway path only if the direct fetch returns 404 once.
- Shorten `<Record>` to `timeout="2" maxLength="15"` and keep `trim="trim-silence"`. Saves ~1s per turn.
- Inline TTS via `<Play>` of a `data:` URL only when audio < 100KB; for larger blobs keep the Storage upload path. (If signed-URL latency turns out to be the dominant cost, this saves the round-trip.)
- Run the Gemini extract and the Sarvam TTS for the *previous* turn's reply in parallel where possible (the reply text only depends on extractor output, so this is moot for the user turn — but we can pre-warm TTS for the fixed `confirmed/...` strings by caching them per-language in module scope after first synth).

**d. End-of-order detection stays as-is** — `END_INTENT_RE` already covers `bas / saaku / mugiyitu / podu / done / nope / thanks`, which is exactly what Quick Voice users say.

**e. Orders insert is already correct** (`source: "voice_call"`, `status: "pending_credit_review"`, `retailer_id: "shop_default"`, includes `trust_score` / `credit_recommendation` / `decision_reason`). After the localization change above, `items[].name` will be in the caller's language. Confirm `/app/customer/orders` polls and the retailer queue reads this same row (no code change needed — Quick Voice writes the same shape).

### 2. `src/routes/api/public/twilio.voice.ts`

- Trim greeting to one short bilingual line: `"नमस्ते, KhataOS में आपका स्वागत है। बीप के बाद अपना ऑर्डर बोलें।"` (Hindi voice) — keeps the prompt under ~3s and Sarvam still auto-detects whatever the caller actually speaks.
- Pass `timeout="2"` on the first `<Record>` too, matching the per-turn settings.

### 3. No other files touched

`call-store.server.ts` gets two small helpers (`bumpMiss`, `resetMiss`) if we go with the miss counter; that's the only file outside the two webhooks. Quick Voice, catalog, extractor, financial brain, orders endpoint, customer/retailer pages — all unchanged.

## Latency budget after the change

Per turn: Sarvam STT (~600ms) + Gemini extract w/ 1.2s cap (avg ~700ms) + Sarvam TTS (~500ms, cached for fixed strings) + Twilio media fetch (~250ms) ≈ **2.0–2.3s** end-to-end, matching Quick Voice perceived speed.

## Files Touched

- `src/routes/api/public/twilio.record.ts` — localized phrases, catalog fallback on Gemini miss, miss-counter auto-finalize, faster fetch/record timings, TTS caching for fixed strings, localized `items[]` on insert.
- `src/routes/api/public/twilio.voice.ts` — shorter bilingual greeting, matching record timings.
- `src/lib/khataos/call-store.server.ts` — small `bumpMiss` / `resetMiss` helpers (only if we keep the counter on the call record).

## Not Touched

Quick Voice (`app.customer.voice.tsx`), `order-extractor.server.ts`, `catalog.ts`, `financial-brain.server.ts`, `api/khataos.orders.ts`, customer orders page, retailer orders page, Sarvam wrapper, DB schema, orchestrator/templates/voice-menu (legacy DTMF path stays intact).
