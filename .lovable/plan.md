
## Problem

On a real call, after Sarvam transcribes the customer, the transcript is fed into the **orchestrator** (`processTurn`) which runs `commerce-brain-rules` (regex intents) → `templates.ts`. When the regex doesn't classify the spoken sentence as `KHATA_ORDER`, it returns `FALLBACK` whose text is literally:

> "I can help with balances, credit requests, repayments, and account information. What would you like?"

That is replayed via Sarvam TTS after every turn, which is exactly the loop the user is hearing. The Twilio greeting also stacks three languages before recording, adding more chatter.

The user wants the call to behave exactly like Quick Voice: user speaks → Sarvam STT → Gemini order extractor → "Added X, Y. Anything else?" → on "no / done / that's all / bas / saaku" → confirm full order + hang up.

## Scope

Only the call-agent conversation flow. Do **not** modify:
- Sarvam STT / TTS code (`sarvam.server.ts`)
- Twilio integration shape (still `<Record>` → POST `/twilio/record` → TwiML)
- Financial brain
- Orders DB schema, customer dashboard, retailer dashboard
- In-app `app.customer.voice.tsx` (Quick Voice) and `app.customer.call.tsx` (already streamlined)
- `templates.ts`, `commerce-brain-rules.ts`, `voice-menu.ts` (left intact so legacy DTMF path still works)

## Changes

### 1. `src/routes/api/public/twilio.voice.ts`
Trim the Sarvam greeting to a single, short prompt before recording:

```
<Say>Welcome to KhataOS. Please tell me what you'd like to order after the beep.</Say>
<Record ... playBeep="true" />
```

Remove the three-language stacked greeting on the Sarvam path. (Legacy DTMF path unchanged.)

### 2. `src/routes/api/public/twilio.record.ts` — rewrite the per-turn loop
Replace the `processTurn` (orchestrator) call with a direct order-extraction loop:

1. Sarvam STT → English transcript + detected language (unchanged).
2. **Detect end-of-order intent** with a small multilingual regex helper:
   `/(^|\b)(that's all|that is all|nothing else|no more|done|finish|stop|end call|hang up|bas|bus|kuch nahi|aur kuch nahi|saaku|saakaagide|mugiyitu|po(d)?u|podhum|chaalu)\b/i`
3. **If end intent and cart has items**:
   - Insert a single `orders` row with the accumulated cart (status `pending_credit_review`, source `voice_call`, plus `trust_score` / `credit_recommendation` from Financial Brain — reuse the same call we already do in `/api/khataos/orders` POST by extracting a tiny helper, or call it inline here).
   - Sarvam TTS: "Order confirmed for {items}. Thank you. Goodbye." → `<Hangup/>`.
4. **If end intent and cart empty**: TTS "Okay, no order placed. Goodbye." → `<Hangup/>`.
5. **Otherwise**: call `extractOrderFromTranscript(transcript)` (Gemini Flash) directly.
   - If items returned → append to a per-call cart kept in the existing call store (extend `call-store.server.ts` with `appendCart(cid, items)` and `getCart(cid)`, or reuse the existing `setCart`/`getCart`).
   - TTS: `"Added {n} kg/L/pcs {name} ... . Anything else?"` and continue `<Record>`.
   - If no items → TTS: `"I didn't catch any items. Please tell me what you'd like to order."` and continue `<Record>`.
6. Persist a customer+agent transcript turn each loop (existing pattern), but with `pipelineStage: "gemini-extractor"` instead of orchestrator stages — so the call log still shows what happened.

The orchestrator / `templates.ts` FALLBACK is no longer called on the Sarvam path, so the "I can help with balances, credit requests…" loop disappears.

### 3. No changes to `/api/khataos/orders` POST
It already runs Financial Brain and writes the row with `status: 'pending_credit_review'`, so retailer + customer dashboards pick the order up the same way.

## Latency goal

Per turn = Sarvam STT (~600ms) + Gemini Flash extract (~700ms) + Sarvam TTS (~600ms) ≈ 2s. End-of-order insert adds one Financial Brain call (~400ms) before TTS goodbye.

## Files Touched

- `src/routes/api/public/twilio.voice.ts` — shorter greeting (Sarvam path only).
- `src/routes/api/public/twilio.record.ts` — replace orchestrator with Gemini extractor loop + end-intent detection + final order insert.
- `src/lib/khataos/call-store.server.ts` — small helper to append items to a per-call cart (or reuse existing `setCart`/`getCart`).

## Not Touched

Twilio webhook contract, Sarvam STT/TTS, Financial Brain, orders schema, customer/retailer pages, Quick Voice screen, in-app call screen, legacy DTMF menu, `templates.ts`, `voice-menu.ts`, `commerce-brain-rules.ts`.
