// Vertical agent activity timeline. Visualises every stage a single
// customer utterance flows through, from speech-to-text out to TTS.
// Each stage animates as it activates.

import { Mic, Cpu, Shield, CreditCard, Wallet, FileText, Volume2, User, Brain } from "lucide-react";

export type TimelineStage =
  | "stt" | "commerce" | "trust" | "credit" | "collections" | "template" | "tts" | "user";

const STAGES: { key: TimelineStage; label: string; sub: string; icon: any }[] = [
  { key: "user",        label: "Customer speech",    sub: "Microphone input",            icon: User },
  { key: "stt",         label: "Speech-to-text",     sub: "Twilio · browser SR",         icon: Mic },
  { key: "commerce",    label: "Commerce Brain",     sub: "WebLLM · on-device",          icon: Cpu },
  { key: "trust",       label: "Trust Agent",        sub: "Behavioural score",           icon: Shield },
  { key: "credit",      label: "Credit Agent",       sub: "Eligibility · sizing",        icon: CreditCard },
  { key: "collections", label: "Collections Agent",  sub: "Overdue · settlement",        icon: Wallet },
  { key: "template",    label: "Template Engine",    sub: "Deterministic reply",         icon: FileText },
  { key: "tts",         label: "Text-to-speech",     sub: "Polly · Web speech",          icon: Volume2 },
];

export function AgentTimeline({
  active, completed, intent,
}: {
  active?: TimelineStage;
  completed: TimelineStage[];
  intent?: string;
}) {
  // Show only the agents relevant to this intent for visual clarity.
  const isCredit = intent === "KHATA_ORDER" || intent === "CREDIT_REQUEST";
  const isCollections = intent === "REPAYMENT" || intent === "SETTLEMENT" || intent === "COLLECTIONS_FOLLOWUP";
  const visible = STAGES.filter((s) => {
    if (s.key === "credit") return isCredit || !intent;
    if (s.key === "collections") return isCollections || !intent;
    return true;
  });

  return (
    <div className="rounded-2xl border border-border bg-elevated/60 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          <Brain className="h-3 w-3 text-emerald" /> Agent pipeline
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-emerald">{active ? "Live" : "Ready"}</span>
      </div>
      <ol className="relative space-y-1.5 pl-1">
        {visible.map((s, i) => {
          const isActive = active === s.key;
          const isDone = completed.includes(s.key);
          const Icon = s.icon;
          return (
            <li key={s.key} className="relative flex items-center gap-2.5">
              {i < visible.length - 1 && (
                <span className={`absolute left-[14px] top-7 h-3 w-px ${
                  isDone ? "bg-emerald" : "bg-border"
                }`} />
              )}
              <div className={`relative grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg border transition-all ${
                isActive ? "border-emerald bg-emerald/20 text-emerald scale-110"
                : isDone ? "border-emerald/40 bg-emerald/10 text-emerald"
                : "border-border bg-surface/60 text-ink-subtle"
              }`}>
                <Icon className="h-3.5 w-3.5" />
                {isActive && <span className="absolute inset-0 rounded-lg bg-emerald/30 animate-ping" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[12px] font-semibold leading-tight ${
                  isActive || isDone ? "text-foreground" : "text-ink-muted"
                }`}>{s.label}</div>
                <div className="text-[10px] text-ink-subtle leading-tight">{s.sub}</div>
              </div>
              {isDone && !isActive && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald">done</span>
              )}
              {isActive && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald animate-pulse">live</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function stagesUpTo(stage: TimelineStage): TimelineStage[] {
  const order: TimelineStage[] = ["user", "stt", "commerce", "trust", "credit", "collections", "template", "tts"];
  const i = order.indexOf(stage);
  return order.slice(0, i + 1);
}
