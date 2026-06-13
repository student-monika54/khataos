import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useCalls, AGENT_META } from "@/lib/khataos/calls";
import { useState } from "react";
import { Phone, Search, ChevronRight, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/calls")({ component: History });

function History() {
  const calls = useCalls((s) => s);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "rejected" | "info">("all");

  const filtered = calls.filter((c) => {
    if (q && !`${c.customerName} ${c.phone} ${c.summary ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "approved" && c.outcome !== "credit_approved") return false;
    if (filter === "rejected" && c.outcome !== "credit_rejected") return false;
    if (filter === "info" && c.outcome !== "info") return false;
    return true;
  });

  return (
    <AppScreen>
      <AppHeader title="Call history" subtitle={`${calls.length} conversations`} />
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-elevated/60 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-ink-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer or summary"
                 className="flex-1 bg-transparent text-[13px] placeholder:text-ink-subtle focus:outline-none" />
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {(["all","approved","rejected","info"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium ${
              filter === f ? "border-emerald bg-emerald/15 text-emerald" : "border-border bg-surface text-ink-muted"
            }`}>{f.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <Section title={`${filtered.length} calls`}>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[12px] text-ink-muted">
            No calls match your filter.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => {
              const outcome = c.outcome === "credit_approved" ? "approve" : c.outcome === "credit_rejected" ? "reject" : "info";
              const Icon = outcome === "approve" ? CheckCircle2 : outcome === "reject" ? XCircle : AlertCircle;
              return (
                <li key={c.id}>
                  <div className="rounded-2xl border border-border bg-elevated/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-emerald" />
                          <div className="truncate text-[13px] font-semibold">{c.customerName}</div>
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-subtle">{c.phone} · {Math.floor((c.durationSec ?? 0) / 60)}:{String((c.durationSec ?? 0) % 60).padStart(2,"0")} · {c.source}</div>
                      </div>
                      <Icon className={`h-4 w-4 ${
                        outcome === "approve" ? "text-emerald" :
                        outcome === "reject" ? "text-destructive" : "text-amber-400"
                      }`} />
                    </div>
                    {c.summary && <p className="mt-2 text-[12px] leading-snug text-ink-muted">{c.summary}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {c.currentAgent && <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-ink-muted">{AGENT_META[c.currentAgent].label}</span>}
                      {c.currentIntent && <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-ink-muted">{c.currentIntent}</span>}
                      {c.language && <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-ink-muted">{c.language}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="px-4 pt-4">
        <Link to="/app/customer/call" className="block rounded-2xl border border-emerald/40 bg-emerald/10 px-4 py-3 text-center text-[12px] font-semibold text-emerald">
          <Phone className="mr-1.5 inline h-3.5 w-3.5" /> Trigger demo call
        </Link>
      </div>
    </AppScreen>
  );
}
