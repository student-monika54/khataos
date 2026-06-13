import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader, AppScreen, Section, StatCard } from "@/components/app/AppShell";
import { useEffect, useState } from "react";
import { AGENT_META, type CallRecord } from "@/lib/khataos/calls";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { Activity, Phone, AlertCircle, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/live")({ component: LiveView });

function LiveView() {
  const [call, setCall] = useState<CallRecord | null>(null);
  const customers = useKhata((s) => s.customers);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const r = await fetch("/api/khataos/calls?active=1");
        if (r.ok) {
          const data = await r.json();
          if (mounted) setCall(data);
        }
      } catch {}
    }
    poll();
    const id = setInterval(poll, 1500);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (!call) {
    return (
      <AppScreen>
        <AppHeader title="Live calls" subtitle="Realtime monitor" />
        <div className="px-4 pt-6">
          <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-6 text-center">
            <Activity className="mx-auto h-6 w-6 text-emerald" />
            <h3 className="mt-3 font-display text-base font-semibold">No active calls</h3>
            <p className="mt-1 text-[12px] text-ink-muted">When a customer dials KhataOS, you'll see live transcript, intent, and AI recommendation here.</p>
            <Link to="/app/customer/call" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-[12px] font-semibold text-[#06140b]">
              <Phone className="h-3.5 w-3.5" /> Trigger demo call
            </Link>
          </div>
        </div>
      </AppScreen>
    );
  }

  const customer = customers.find((c) => c.id === call.customerId);
  const lastAgentTurn = [...call.transcript].reverse().find((t) => t.role === "agent");
  const decision = lastAgentTurn?.decision;
  const dur = Math.round(((call.endedAt ?? Date.now()) - call.startedAt) / 1000);

  return (
    <AppScreen>
      <AppHeader title="Live call" subtitle={`${customer?.name ?? call.customerName} · ${dur}s`} right={
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-emerald">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" /> {call.state}
        </span>
      } />
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Trust score" value={String(customer?.trustScore ?? "—")} accent />
          <StatCard label="Outstanding" value={formatINR(customer?.outstanding ?? 0)} />
          <StatCard label="Credit limit" value={formatINR(customer?.creditLimit ?? 0)} />
          <StatCard label="Risk" value={(customer?.riskTag ?? "low").toUpperCase()} />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-elevated/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Current intent · agent · language</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold text-emerald">{call.currentIntent ?? "—"}</span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold">{call.currentAgent ? AGENT_META[call.currentAgent].label : "—"}</span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px]">{call.language ?? "—"}</span>
          </div>
          {call.recommendation && (
            <p className="mt-2 text-[12.5px] leading-snug text-ink"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald" />{call.recommendation}</p>
          )}
          {decision && (
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              decision === "approve" ? "bg-emerald/15 text-emerald" :
              decision === "reject" ? "bg-destructive/15 text-destructive" :
              "bg-amber-500/15 text-amber-400"
            }`}>
              {decision === "approve" ? <CheckCircle2 className="h-3 w-3" /> :
               decision === "reject" ? <XCircle className="h-3 w-3" /> :
               <AlertCircle className="h-3 w-3" />} {decision.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <Section title="Live transcript">
        <ul className="space-y-2">
          {call.transcript.slice(-8).map((t, i) => (
            <li key={i} className={`flex ${t.role === "customer" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug ${
                t.role === "customer" ? "bg-emerald text-[#06140b]" : "bg-elevated border border-border"
              }`}>
                {t.role === "agent" && t.templateId && (
                  <div className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-emerald">{t.templateId}</div>
                )}
                {t.text}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </AppScreen>
  );
}
