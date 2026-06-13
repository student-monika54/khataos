# Roll back to Guided Voice-Commerce Agent

Replace the open-ended Deepgram conversational pipeline with a deterministic, template-driven IVR + cart state machine. Keep all financial/dashboard infrastructure; gut only the ordering reasoning layer.

## What gets removed

- `src/lib/khataos/deepgram.server.ts` — Deepgram transcription path.
- `src/routes/api/public/twilio.recording.ts` — recording → Deepgram → free-form extraction.
- Free-form intent fallback paths in `orchestrator.server.ts` and `commerce-brain-rules.ts` (open-ended UNKNOWN handling, dynamic agent reasoning for ordering).
- Multi-turn open-ended speech loop on the inbound Twilio webhook (current `twilio.gather.ts` accepts any speech and routes to orchestrator).

## What stays (untouched)

- Twilio voice connection + DTMF menu (`twilio.voice.ts`, `twilio.menu.ts`).
- Financial brain (`financial-brain.server.ts`), trust scoring, credit decision.
- Live-orders store + dashboards (`live-orders.server.ts`, `app.shopkeeper.*`, `app.customer.*`).
- Bottom nav, customer/shopkeeper UX from prior turns.

## New architecture

```text
Call → Language IVR (1/2/3) → Main Menu (1-6 DTMF)
                                  │
        ┌─────────────────────────┼───────────────────────────┐
        ▼            ▼            ▼            ▼              ▼
   Place Order  Balance      Credit Req   Track Order   Payment Commit
        │                        │                            │
   Cart loop                Financial Brain              Ledger entry
   (add/remove/                  │
    update/show)             Decision template
        │
   Checkout → Financial Brain → publishLiveOrder()
                                 │
                       Customer + Shopkeeper dashboards
```

State per call lives in the existing in-memory `call-store.server.ts`, extended with a `cart` + `menuState` field. No LLM in the ordering loop.

## Supported intents (closed set)

`ORDER_ITEM`, `REMOVE_ITEM`, `UPDATE_QUANTITY`, `VIEW_CART`, `CHECKOUT`, `BALANCE_INQUIRY`, `CREDIT_REQUEST`, `ORDER_STATUS`, `PAYMENT_COMMITMENT`, `END_CALL`. Anything else → "Sorry, I didn't catch that" + reprompt to menu.

## Catalog

New file `src/lib/khataos/catalog.ts` — flat list of ~13 SKUs (Atta, Rice, Oil, Sugar, Milk, Bread, Tea, Coffee, Soap, Salt, Biscuits, Eggs, Dal) with unit + price per unit. Multilingual aliases (en/hi/kn) for matching.

## Cart parser

New `src/lib/khataos/cart-parser.ts` — pure deterministic regex/keyword parser:
- Quantity + unit + item → `{ sku, qty, unit }`
- Verb detection (`add`/`remove`/`delete`/`cancel`/`change to`/`make`) → action.
- Returns `{ action, sku, qty, unit }` or `null`. No model calls.

## Templates

Extend `templates.ts` with per-language strings for: menu prompt, "what would you like to order", added-item confirmation, removed-item, cart-summary, checkout-review, approved/rejected/conditional, balance, credit decisions, payment-committed, order-status, fallback, farewell.

## New file route: `src/routes/api/public/twilio.menu.ts` (already exists — repurpose)

After language lock, present DTMF main menu:
- 1 Place Order → enter cart loop (Gather speech)
- 2 Check Balance → speak + back to menu
- 3 Request Credit → Gather amount → financial brain → back to menu
- 4 Track Order → look up latest live-order for caller → speak status
- 5 Payment Commitment → Gather speech → store
- 6 End Call

## Rewrite `src/routes/api/public/twilio.gather.ts`

Becomes a strict state-machine handler keyed by `?mode=cart|credit|payment|menu`:
- `mode=cart`: run cart-parser. On match, mutate call cart, speak confirmation, re-Gather. On "checkout/done/that's all" → run financial brain on cart total, publish live order, speak decision, hangup or return to menu. On END_CALL phrases → farewell + Hangup.
- `mode=credit`: parse amount → financial brain → decision template.
- `mode=payment`: parse "tomorrow / N days / next week" → store commitment.
- `mode=menu`: parse DTMF or spoken menu choice.

Each branch responds with TwiML in <2s (no external model calls). Fallback → reprompt with menu hint.

## Cart on call record

Extend `CallRecord` in `calls.ts` with optional `cart: CartItem[]` and `menuState: string`. Update `call-store.server.ts` helpers (`setCart`, `patchCart`).

## Order publishing

On checkout, build `LiveOrder` from cart + financial-brain output and call `publishLiveOrder()` exactly as the existing simulated dialer does — dashboards already poll `/api/khataos/orders/live`.

## Simulated dialer (`TwilioDialer.tsx` / `api/khataos/calls.ts`)

Update the demo dialer's quick actions to mirror the new menu (Place Order, Balance, Credit, Status, Payment, End) so the in-app demo and real phone flow share the same template engine. No free-form text input for ordering — provide quick-add buttons per catalog SKU.

## Files

**Create**
- `src/lib/khataos/catalog.ts`
- `src/lib/khataos/cart-parser.ts`

**Edit**
- `src/lib/khataos/calls.ts` (add cart fields)
- `src/lib/khataos/call-store.server.ts` (cart helpers)
- `src/lib/khataos/templates.ts` (new template strings, all languages)
- `src/lib/khataos/orchestrator.server.ts` (strip open-ended pipeline; thin wrapper now only for credit/balance/payment)
- `src/routes/api/public/twilio.menu.ts` (DTMF main menu after language)
- `src/routes/api/public/twilio.gather.ts` (mode-based state machine)
- `src/routes/api/public/twilio.voice.ts` (route to new menu post-language)
- `src/routes/api/khataos.calls.ts` (simulated dialer → menu-driven actions, same templates)
- `src/components/app/TwilioDialer.tsx` (menu-based UI, catalog quick-adds)

**Delete**
- `src/lib/khataos/deepgram.server.ts`
- `src/routes/api/public/twilio.recording.ts`
- `src/routeTree.gen.ts` entry for the recording route (auto-regenerated)

## Verification

1. Call simulated dialer → press Place Order → quick-add Atta 2kg + Oil 1L → Checkout → live order appears in Shopkeeper Incoming + Customer Orders.
2. Press Check Balance → spoken balance, returns to menu.
3. Press Request Credit ₹500 → financial brain decision spoken.
4. Press End Call → farewell + hangup; call marked completed.
5. Real Twilio inbound: pick Hindi → menu in Hindi → place order via speech "do kilo atta" → confirmation in Hindi → checkout → approved.
