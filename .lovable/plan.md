# Persistent, synced orders across customer & retailer

## Problem today
- Customer Orders tab reads from a local Zustand store (`useKhata`) — nothing persists, nothing syncs between phones.
- Shopkeeper "Incoming Orders" reads from an in-memory `Map` in `live-orders.server.ts` — lost on worker restart, not shared across regions/devices.
- The Quick Voice screen (`/app/customer/voice`) only chats; it never creates an order.
- Only the Twilio inbound-call STT path currently writes to the `voice_orders` table.

Result: orders look fine on the phone that placed them and vanish everywhere else.

## Goal
One database is the source of truth for every order (voice, in-app call, quick voice). Both the customer Orders tab and the retailer dashboard read from it and stay in sync via polling.

## Changes

### 1. Database — single `orders` table
New migration:
- `public.orders` columns: `id`, `customer_id`, `customer_name`, `phone`, `retailer_id` (nullable for now, defaults to the demo shop), `source` (`voice_call` | `quick_voice` | `in_app_call`), `call_id` (nullable), `items` (jsonb), `amount` (numeric), `language`, `transcript`, `status` (`pending_approval` | `approved` | `rejected` | `packed` | `ready` | `delivered`), `reasoning`, `created_at`, `updated_at`.
- GRANTs for `service_role` (admin path) only; RLS enabled, no anon/authenticated policies (all access via server functions using `supabaseAdmin`, same pattern already used for `voice_orders`).
- `update_updated_at` trigger.
- Keep `voice_orders` for backward compat but route everything new through `orders`.

### 2. Server endpoints (all DB-backed, drop in-memory store)
- `GET /api/khataos/orders?customerId=…` — list a customer's orders (pending + history), newest first.
- `GET /api/khataos/orders/live` — replace current in-memory listing with a DB query (latest 25 across all customers for the shopkeeper).
- `POST /api/khataos/orders` — create order (used by Quick Voice + in-app call checkout). Body: `{ source, customerId, items, amount, transcript?, language?, callId? }`. Returns the row.
- `POST /api/khataos/orders/decision` — `{ orderId, action: 'approve'|'reject' }` flips status; on approve the row becomes visible to retailer as "ready_for_fulfillment".
- `POST /api/khataos/orders/status` — shopkeeper transitions (`packed` → `ready` → `delivered`).

### 3. Quick Voice (`app.customer.voice.tsx`)
After the user finishes speaking and the assistant replies, also run the transcript through the existing `extractOrderFromTranscript` (Gemini 3 Flash via Lovable AI Gateway). If items are detected:
- POST `/api/khataos/orders` with `source: 'quick_voice'`, status defaults to `pending_approval`.
- Show inline confirmation: "Order draft sent for your approval — check Orders tab."

### 4. In-app call checkout (`app.customer.call.tsx`)
On `checkout`, after the financial-brain decision, also POST `/api/khataos/orders` with `source: 'in_app_call'`, items from the cart, status = `pending_approval` (or `approved` if decision is `approve`).

### 5. Customer Orders tab (`app.customer.orders.tsx`)
Replace local-store reads with a poll (2s) of `GET /api/khataos/orders?customerId=…`. Two sections:
- **Pending approval** — Approve/Reject buttons call `/decision`.
- **Previous orders** — everything else, grouped by status.

### 6. Retailer dashboard (`app.shopkeeper.orders.tsx`)
Already polls `/api/khataos/orders/live`; swap that endpoint's backing store to the DB. Status-change buttons (Pack / Ready / Delivered) call `/api/khataos/orders/status` instead of mutating local Zustand.

### 7. Cleanup
- Remove `src/lib/khataos/live-orders.server.ts` usages once endpoints are DB-backed (keep the file as a thin shim for one release if anything still imports it, else delete).
- Twilio inbound webhook keeps inserting into the same `orders` table (replace `voice_orders.insert` with `orders.insert`).

## Out of scope
- Multi-retailer routing (single-retailer demo for now; `retailer_id` reserved).
- Supabase Realtime channels — polling every 2s is enough for the demo and matches existing patterns.
- Auth — endpoints remain admin-key based like today's `voice_orders`.

## Why polling, not realtime
The existing shopkeeper screen already polls every 900ms and the customer pending section every 2s. Keeping that pattern means no new client wiring and immediate cross-device sync once the store is the DB.
