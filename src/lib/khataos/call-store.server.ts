// Server-side ephemeral call store (per-isolate). Bridges Twilio webhooks
// to the live dashboard via a polling endpoint.

import type { CallRecord, TranscriptTurn, CallState } from "./calls";

const g = globalThis as unknown as { __khataos_calls?: Map<string, CallRecord> };
if (!g.__khataos_calls) g.__khataos_calls = new Map();
const store = g.__khataos_calls!;

export function putCall(c: CallRecord) { store.set(c.id, c); }
export function getCall(id: string) { return store.get(id); }
export function getCallByTwilioSid(sid: string) {
  for (const c of store.values()) if (c.twilioSid === sid) return c;
  return undefined;
}
export function appendTurnServer(id: string, t: TranscriptTurn) {
  const c = store.get(id); if (!c) return;
  c.transcript = [...c.transcript, t];
  store.set(id, c);
}
export function patchCall(id: string, patch: Partial<CallRecord>) {
  const c = store.get(id); if (!c) return;
  store.set(id, { ...c, ...patch });
}
export function setCallState(id: string, state: CallState) {
  patchCall(id, { state });
}
export function listCallsServer(): CallRecord[] {
  return [...store.values()].sort((a, b) => b.startedAt - a.startedAt);
}
export function getActiveCallServer() {
  return listCallsServer().find((c) => !["completed", "failed"].includes(c.state));
}
