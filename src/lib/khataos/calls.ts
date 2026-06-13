// Call infrastructure types, store and helpers shared by client + server.
import { useSyncExternalStore } from "react";

export type CallState =
  | "incoming" | "connecting" | "listening" | "thinking"
  | "generating" | "responding" | "ending" | "completed" | "failed" | "escalated";

export type Intent =
  | "END_CALL"
  | "GREETING"
  | "BALANCE_INQUIRY"
  | "KHATA_ORDER"
  | "CREDIT_REQUEST"
  | "PAYMENT_CONFIRMATION"
  | "PAYMENT_PROMISE"
  | "REPAYMENT" | "SETTLEMENT" | "TRUST_INQUIRY"
  | "COLLECTIONS_FOLLOWUP" | "ESCALATE"
  | "GENERAL_HELP" | "UNKNOWN";

export type AgentName =
  | "CreditAgent" | "TrustAgent" | "CollectionsAgent"
  | "WorkingCapitalAgent" | "InsightsAgent";

export type TranscriptTurn = {
  role: "customer" | "agent" | "system";
  text: string;
  at: number;
  intent?: Intent;
  agent?: AgentName;
  templateId?: string;
  language?: string;
  confidence?: number;
  languageConfidence?: number;
  intentConfidence?: number;
  templateLang?: string;
  items?: { name: string; quantity: string }[];
  decision?: "approve" | "reject" | "conditional";
  reasoning?: string;
  latencyMs?: number;
  // Debug / observability fields
  fallback?: boolean;          // true => FALLBACK template fired
  noIntentMatch?: boolean;     // true => classifier returned UNKNOWN
  rawTranscript?: string;      // exact text as received from Twilio STT
  pipelineStage?: "stt" | "commerce" | "financial" | "template" | "tts";
  // STT debug — captured directly from Twilio Gather webhook
  sttLocale?: string;          // language hint we sent to Twilio (e.g. hi-IN)
  sttModel?: string;           // speechModel we sent (default | experimental_conversations)
  expectedSttLocale?: string;  // what we expected based on locked language
  speechConfidence?: number;   // Twilio `Confidence` field, 0-1
  transcriptLength?: number;   // characters in raw transcript
  // Deepgram STT debug
  sttProvider?: "deepgram" | "twilio";
  deepgramModel?: string;       // e.g. nova-2 / whisper-medium
  deepgramLanguage?: string;    // e.g. hi / en / kn
  deepgramDetectedLanguage?: string;
  deepgramLatencyMs?: number;
  deepgramError?: string;       // populated when Deepgram failed and we fell back
};

export type CallRecord = {
  id: string;
  twilioSid?: string;
  customerId: string;
  customerName: string;
  phone: string;
  state: CallState;
  startedAt: number;
  endedAt?: number;
  durationSec?: number;
  language?: string;
  currentIntent?: Intent;
  currentAgent?: AgentName;
  transcript: TranscriptTurn[];
  summary?: string;
  outcome?: "credit_approved" | "credit_rejected" | "repayment" | "info" | "escalated";
  creditDelta?: number;
  trustDelta?: number;
  recommendation?: string;
  source: "twilio" | "simulated";
};

const KEY = "khataos:calls:v1";

function todayCall(): CallRecord[] {
  return [
    {
      id: "demo_1", customerId: "c_s1", customerName: "Suresh Patel",
      phone: "+91 90000 22222", state: "completed",
      startedAt: Date.now() - 3600_000 * 5, endedAt: Date.now() - 3600_000 * 5 + 92_000,
      durationSec: 92, language: "Hindi", currentIntent: "CREDIT_REQUEST",
      currentAgent: "CreditAgent",
      transcript: [
        { role: "customer", text: "Bhaiya 500 rupaye ka samaan khate mein daal do.", at: Date.now() - 3600_000 * 5, language: "Hindi", intent: "CREDIT_REQUEST" },
        { role: "agent", text: "Suresh ji, aapki credit limit pe ₹1,800 available hai. Confirm karein?", at: Date.now() - 3600_000 * 5 + 4000, templateId: "CREDIT_APPROVAL", agent: "CreditAgent" },
        { role: "customer", text: "Haan haan, confirm.", at: Date.now() - 3600_000 * 5 + 8000, language: "Hindi" },
        { role: "agent", text: "Done. ₹500 add ho gaya. Total bakaaya ₹2,700. Dhanyavaad.", at: Date.now() - 3600_000 * 5 + 12000, templateId: "ORDER_CONFIRMATION", agent: "CreditAgent" },
      ],
      summary: "Customer requested ₹500 credit. Approved within trust limit. New outstanding ₹2,700.",
      outcome: "credit_approved", creditDelta: 500, trustDelta: 0,
      recommendation: "Send WhatsApp reminder 2 days before due date.",
      source: "twilio",
    },
    {
      id: "demo_2", customerId: "c_a1", customerName: "Anita Devi",
      phone: "+91 90000 33333", state: "completed",
      startedAt: Date.now() - 3600_000 * 26, endedAt: Date.now() - 3600_000 * 26 + 145_000,
      durationSec: 145, language: "Hindi", currentIntent: "COLLECTIONS_FOLLOWUP",
      currentAgent: "CollectionsAgent",
      transcript: [
        { role: "agent", text: "Anita ji, ₹2,850 ka bakaaya 3 din se overdue hai. Kya aaj settle kar sakte hain?", at: Date.now() - 3600_000 * 26, templateId: "COLLECTIONS_FOLLOWUP", agent: "CollectionsAgent" },
        { role: "customer", text: "Iss hafte mushkil hai, agle hafte tak kar dungi.", at: Date.now() - 3600_000 * 26 + 6000, language: "Hindi" },
        { role: "agent", text: "Theek hai, agle Mangalwar tak settlement plan likha gaya hai.", at: Date.now() - 3600_000 * 26 + 10000, templateId: "SETTLEMENT_OFFER", agent: "CollectionsAgent" },
      ],
      summary: "Collections call. Customer committed to settle by next Tuesday. Trust score adjusted -2.",
      outcome: "info", trustDelta: -2,
      recommendation: "Auto-call again on Monday if no payment received.",
      source: "twilio",
    },
  ];
}

let cache: CallRecord[] | null = null;
const listeners = new Set<() => void>();

function read(): CallRecord[] {
  if (cache) return cache;
  if (typeof window === "undefined") { cache = todayCall(); return cache; }
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as CallRecord[]) : todayCall();
  } catch { cache = todayCall(); }
  return cache;
}

function write(next: CallRecord[]) {
  cache = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useCalls<T>(selector: (s: CallRecord[]) => T): T {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => selector(read()),
    () => selector(todayCall()),
  );
}

export function addCall(c: CallRecord) { write([c, ...read()]); }
export function updateCall(id: string, patch: Partial<CallRecord>) {
  write(read().map((c) => (c.id === id ? { ...c, ...patch } : c)));
}
export function appendTurn(id: string, turn: TranscriptTurn) {
  write(read().map((c) => (c.id === id ? { ...c, transcript: [...c.transcript, turn] } : c)));
}
export function getActiveCall(): CallRecord | undefined {
  return read().find((c) => !["completed", "failed"].includes(c.state));
}

export const INTENT_TO_AGENT: Record<Intent, AgentName> = {
  BALANCE_INQUIRY: "InsightsAgent",
  KHATA_ORDER: "CreditAgent",
  CREDIT_REQUEST: "CreditAgent",
  REPAYMENT: "CollectionsAgent",
  PAYMENT_CONFIRMATION: "CollectionsAgent",
  PAYMENT_PROMISE: "CollectionsAgent",
  SETTLEMENT: "CollectionsAgent",
  COLLECTIONS_FOLLOWUP: "CollectionsAgent",
  TRUST_INQUIRY: "TrustAgent",
  ESCALATE: "WorkingCapitalAgent",
  GREETING: "InsightsAgent",
  END_CALL: "InsightsAgent",
  GENERAL_HELP: "InsightsAgent",
  UNKNOWN: "InsightsAgent",
};

export const AGENT_META: Record<AgentName, { label: string; tint: string; desc: string }> = {
  CreditAgent: { label: "Credit Agent", tint: "emerald", desc: "Approves & sizes credit lines" },
  TrustAgent: { label: "Trust Agent", tint: "sky", desc: "Recomputes behavioural trust" },
  CollectionsAgent: { label: "Collections Agent", tint: "amber", desc: "Reminds, settles, escalates" },
  WorkingCapitalAgent: { label: "Working Capital Agent", tint: "violet", desc: "Cash flow & inventory loans" },
  InsightsAgent: { label: "Insights Agent", tint: "rose", desc: "Conversational analytics" },
};
