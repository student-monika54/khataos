// Ephemeral live-orders store. Bridges Twilio webhooks (and the simulated
// dialer) to the shopkeeper dashboard via a polling endpoint.
//
// An order is published in two stages:
//   1. PENDING — emitted as soon as commerce extraction detects items.
//   2. APPROVED / REJECTED / CONDITIONAL — emitted after the financial brain.
// The dashboard polls /api/khataos/orders/live and animates between stages.

export type LiveOrderStage =
  | "listening"
  | "processing"
  | "checking_credit"
  | "approved"
  | "rejected"
  | "conditional"
  | "ready_for_fulfillment";

export type LiveOrderItem = { name: string; quantity: string };

export type LiveOrder = {
  id: string;
  callId: string;
  customerId: string;
  customerName: string;
  phone?: string;
  items: LiveOrderItem[];
  amount?: number;
  trustScore?: number;
  outstanding?: number;
  creditLimit?: number;
  stage: LiveOrderStage;
  decision?: "approve" | "reject" | "conditional";
  reasoning?: string;
  language?: string;
  createdAt: number;
  updatedAt: number;
};

const g = globalThis as unknown as { __khataos_live_orders?: Map<string, LiveOrder> };
if (!g.__khataos_live_orders) g.__khataos_live_orders = new Map();
const store = g.__khataos_live_orders!;

export function publishLiveOrder(o: LiveOrder) {
  store.set(o.id, o);
}

export function patchLiveOrder(id: string, patch: Partial<LiveOrder>) {
  const cur = store.get(id);
  if (!cur) return;
  store.set(id, { ...cur, ...patch, updatedAt: Date.now() });
}

export function getLiveOrder(id: string) {
  return store.get(id);
}

export function listLiveOrders(): LiveOrder[] {
  return [...store.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 25);
}
