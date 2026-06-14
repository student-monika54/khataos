## Goal
Correct the order lifecycle so customers never approve their own orders. Retailer owns approve/reject and all fulfillment transitions. Both sides read the same DB row and stay in sync via polling.

Note on storage: we keep the existing Lovable Cloud Postgres `orders` table as the real DB (already created, already synced across devices). SQLite isn't viable in our serverless Worker runtime — Postgres gives us the same "real DB" guarantee plus multi-device sync, which is the actual requirement.

## New status pipeline

```text
pending_credit_review
   → approved  →  packed  →  ready_for_pickup  →  delivered
   → rejected
```

Replaces today's `pending_approval` / `approved` / `packed` / `ready` / `delivered` / `rejected`.

## Changes

### 1. DB migration (`orders` table)
- Default `status` becomes `pending_credit_review`.
- Rename status value `ready` → `ready_for_pickup` (data backfill + new default set).
- Add columns: `trust_score numeric`, `credit_recommendation text` (`approve` | `review` | `reject`), `decision_reason text`.
- Backfill existing `pending_approval` rows → `pending_credit_review`.
- Keep RLS service-role-only (unchanged).

### 2. Financial Brain on order creation
In `POST /api/khataos/orders` (after Gemini item extraction), call the existing `financial-brain.server.ts` with `{ customerId, amount, items }`. Persist `trust_score`, `credit_recommendation`, `decision_reason` on the row. Status stays `pending_credit_review` regardless — retailer always has final say. Recommendation is advisory.

### 3. Endpoints
- Delete `POST /api/khataos/orders/decision` (customer-side approve/reject). No longer exists.
- Keep `POST /api/khataos/orders/status` but tighten allowed transitions:
  - `pending_credit_review → approved | rejected`
  - `approved → packed`
  - `packed → ready_for_pickup`
  - `ready_for_pickup → delivered`
  - Any → `rejected` only from `pending_credit_review`.
  Reject anything else with 400.
- `GET /api/khataos/orders?customerId=…` unchanged.
- `GET /api/khataos/orders` (retailer list) unchanged; ensure it returns the new financial-brain fields.

### 4. Customer Orders page (`app.customer.orders.tsx`)
Read-only timeline. Remove Approve/Reject buttons entirely. For every order show:
- Store name, order id tail, created time, amount, items.
- Current status chip with friendly label (Pending credit review / Approved / Rejected / Packed / Ready for pickup / Delivered).
- Decision reason from financial brain (when present) + retailer note (if rejected).
- "Next step" hint based on current status.
- Sections: **In progress** (everything not delivered/rejected) and **Previous orders** (delivered/rejected).
- Keep 2s polling.

### 5. Retailer Orders page (`app.shopkeeper.orders.tsx`)
This is where mutation lives. For each order render:
- Customer name, phone, items, amount.
- Financial-brain panel: trust score, recommendation badge, decision reason.
- Buttons gated by current status:
  - `pending_credit_review`: **Approve** / **Reject**
  - `approved`: **Mark Packed**
  - `packed`: **Mark Ready for Pickup**
  - `ready_for_pickup`: **Mark Delivered**
  - Terminal (`delivered`/`rejected`): no buttons.
- All call `POST /api/khataos/orders/status`.
- Keep existing polling.

### 6. Voice / Quick Voice / In-app call creation paths
All three (`twilio.record.ts`, `app.customer.voice.tsx`, `app.customer.call.tsx`) already POST to `/api/khataos/orders`. Confirm they do NOT pass `status: 'approved'`. Status will default to `pending_credit_review` server-side. Remove any client-supplied status override.

### 7. Types regeneration
After migration runs, regenerated `src/integrations/supabase/types.ts` will pick up the new columns; update the `DbOrder` TS type in the two pages to include `trust_score`, `credit_recommendation`, `decision_reason` and the new status union.

## Out of scope
- Auth-based role gating (no real retailer auth yet; today the shopkeeper screen is reached by role toggle — same as current behavior).
- SQLite (incompatible with Worker runtime; Postgres already satisfies the "real DB + sync" requirement).
- Realtime channels (2s polling already gives cross-device sync — verified by the existing flow).

## Validation
1. Phone A (customer) creates a voice order → appears as **Pending credit review** on Phone A and on Phone B (retailer) within ~2s, with trust score + recommendation shown to retailer only.
2. Retailer approves → Phone A shows **Approved** within ~2s; no buttons visible to customer.
3. Retailer → Packed → Ready for pickup → Delivered. Phone A status chip updates each time, no refresh.
4. Customer Orders page has zero mutation controls in any state.
