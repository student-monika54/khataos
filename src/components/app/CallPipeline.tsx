// Visualises the hybrid AI pipeline: Commerce Brain (local) → Financial
// Brain (cloud) → Template Engine. Each stage glows when active.

import { Cpu, Brain, FileText, ArrowRight } from "lucide-react";
import type { CommerceBrainOutput } from "@/lib/khataos/commerce-brain.server";

export type PipelineStage = "idle" | "commerce" | "financial" | "template" | "done";

export function CallPipeline({
  stage, commerce, agent, templateId,
}: {
  stage: PipelineStage;
  commerce?: CommerceBrainOutput;
  agent?: string;
  templateId?: string;
}) {
  const stages = [
    { key: "commerce", label: "Commerce Brain", sub: "WebLLM · on-device", icon: Cpu,
      detail: commerce ? `${commerce.intent} · ${commerce.language}` : "Idle" },
    { key: "financial", label: "Financial Brain", sub: "OpenRouter · cloud", icon: Brain,
      detail: agent ?? "Idle" },
    { key: "template", label: "Template Engine", sub: "Deterministic", icon: FileText,
      detail: templateId ?? "Idle" },
  ] as const;

  return (
    <div className="rounded-2xl border border-border bg-elevated/60 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">Pipeline</div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-emerald">{stage === "idle" ? "Ready" : "Live"}</div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {stages.map((s, i) => {
          const active = stage === s.key || (stage === "done" && i < 3);
          const Icon = s.icon;
          return (
            <div key={s.key} className="relative">
              <div className={`rounded-xl border p-2.5 transition-all ${
                active ? "border-emerald/60 bg-emerald/10" : "border-border bg-surface/60"
              }`}>
                <Icon className={`h-3.5 w-3.5 ${active ? "text-emerald" : "text-ink-subtle"}`} />
                <div className={`mt-1 text-[11px] font-semibold leading-tight ${active ? "text-foreground" : "text-ink-muted"}`}>
                  {s.label}
                </div>
                <div className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-ink-subtle">{s.sub}</div>
                <div className={`mt-1 truncate text-[10px] ${active ? "text-emerald" : "text-ink-subtle"}`}>{s.detail}</div>
              </div>
              {i < 2 && (
                <ArrowRight className="absolute -right-1 top-1/2 z-10 h-3 w-3 -translate-y-1/2 text-ink-subtle" />
              )}
            </div>
          );
        })}
      </div>
      {commerce && commerce.items.length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-background/60 p-2 font-mono text-[10px] leading-snug text-ink-muted">
          {JSON.stringify({ intent: commerce.intent, language: commerce.language, items: commerce.items, amount: commerce.amount ?? null }, null, 0)}
        </div>
      )}
    </div>
  );
}
