import { createFileRoute } from "@tanstack/react-router";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { AlertTriangle, MessageSquare, Phone, Handshake } from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/collections")({
  component: Collections,
});

function Collections() {
  const customers = useKhata((s) => s.customers);
  const now = Date.now();
  const overdue = customers.filter((c) => c.outstanding > 0 && c.dueDate && new Date(c.dueDate).getTime() < now);
  const upcoming = customers.filter((c) => c.outstanding > 0 && c.dueDate && new Date(c.dueDate).getTime() >= now);
  const highRisk = customers.filter((c) => c.riskTag === "high" || c.trustScore < 65);

  const totalOverdue = overdue.reduce((s, c) => s + c.outstanding, 0);
  const totalUpcoming = upcoming.reduce((s, c) => s + c.outstanding, 0);

  return (
    <AppScreen>
      <AppHeader title="Collections" subtitle="Dues & risk" back />
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-[11px] uppercase tracking-[0.12em] text-red-300">Overdue</div>
          <div className="mt-1 font-display text-xl font-semibold">{formatINR(totalOverdue)}</div>
          <div className="text-[11px] text-ink-muted">{overdue.length} accounts</div>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="text-[11px] uppercase tracking-[0.12em] text-amber-300">Upcoming</div>
          <div className="mt-1 font-display text-xl font-semibold">{formatINR(totalUpcoming)}</div>
          <div className="text-[11px] text-ink-muted">{upcoming.length} accounts</div>
        </div>
      </div>

      {[
        { title: "Overdue", items: overdue, accent: "text-red-300" },
        { title: "Upcoming dues", items: upcoming, accent: "text-amber-300" },
        { title: "High-risk", items: highRisk, accent: "text-red-300" },
      ].map((g) => g.items.length > 0 && (
        <Section key={g.title} title={g.title}>
          <ul className="space-y-2.5">
            {g.items.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-elevated/60 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-[14px] font-semibold">{c.name}</div>
                    <div className="text-[11px] text-ink-muted">
                      Trust {c.trustScore} · {c.dueDate ? `Due ${new Date(c.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}` : "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-semibold">{formatINR(c.outstanding)}</div>
                    {c.riskTag === "high" && <div className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${g.accent}`}><AlertTriangle className="h-3 w-3" /> {c.riskTag}</div>}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2 text-[11px] font-medium">
                    <MessageSquare className="h-3.5 w-3.5" /> Remind
                  </button>
                  <button className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-2 text-[11px] font-medium">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </button>
                  <button className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald/15 py-2 text-[11px] font-semibold text-emerald">
                    <Handshake className="h-3.5 w-3.5" /> Plan
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </AppScreen>
  );
}
