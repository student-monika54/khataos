// Live on-device Commerce Brain status card. Shows model, memory,
// inference speed, language, intent confidence and the most recent
// extraction JSON — so judges can clearly see WebLLM running locally.

import { Cpu, Activity, HardDrive, Zap, Languages } from "lucide-react";
import type { CommerceBrainOutput } from "@/lib/khataos/commerce-brain-rules";

export function CommerceBrainPanel({
  ready, status, pct, lastOutput, lastLatencyMs, modelLabel = "Llama-3.2-1B · q4f16",
}: {
  ready: boolean;
  status: string;
  pct: number;
  lastOutput?: CommerceBrainOutput;
  lastLatencyMs?: number;
  modelLabel?: string;
}) {
  const mem = typeof performance !== "undefined" && (performance as any).memory
    ? Math.round(((performance as any).memory.usedJSHeapSize / 1048576))
    : null;
  const conf = lastOutput ? Math.round(lastOutput.confidence * 100) : null;

  return (
    <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald/15 text-emerald">
            <Cpu className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[12px] font-semibold leading-tight">Commerce Brain</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">On-device · IndexedDB</div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          ready ? "bg-emerald/15 text-emerald" : pct > 0 ? "bg-amber-500/15 text-amber-400" : "bg-surface text-ink-muted"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-emerald animate-pulse" : pct > 0 ? "bg-amber-400 animate-pulse" : "bg-ink-subtle"}`} />
          {ready ? "Loaded" : pct > 0 ? `${Math.round(pct * 100)}%` : "Idle"}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10.5px]">
        <Stat icon={Activity} label="Model" value={modelLabel} />
        <Stat icon={HardDrive} label="JS heap" value={mem ? `${mem} MB` : "—"} />
        <Stat icon={Zap} label="Inference" value={lastLatencyMs ? `${lastLatencyMs} ms` : ready ? "ready" : "—"} />
        <Stat icon={Languages} label="Detected" value={lastOutput?.language ?? "—"} />
      </div>

      {!ready && pct > 0 && pct < 1 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full bg-emerald transition-all" style={{ width: `${pct * 100}%` }} />
        </div>
      )}

      {!ready && (
        <div className="mt-1.5 truncate text-[10px] text-ink-subtle">{status}</div>
      )}

      {lastOutput && (
        <div className="mt-2 rounded-lg border border-border bg-background/60 p-2 font-mono text-[10px] leading-snug text-ink">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.14em] text-emerald">Extraction</span>
            {conf != null && <span className="text-[9px] text-emerald">conf {conf}%</span>}
          </div>
          <pre className="whitespace-pre-wrap break-words text-ink-muted">{JSON.stringify({
            intent: lastOutput.intent,
            language: lastOutput.language,
            items: lastOutput.items,
            amount: lastOutput.amount ?? null,
          }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2 py-1.5">
      <Icon className="h-3 w-3 text-emerald flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-[0.12em] text-ink-subtle leading-none">{label}</div>
        <div className="mt-0.5 truncate text-[10.5px] font-semibold leading-none">{value}</div>
      </div>
    </div>
  );
}
