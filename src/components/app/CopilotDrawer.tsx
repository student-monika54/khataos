// Realtime shopkeeper copilot — generates short recommendations
// based on the live call's customer profile and current intent.

import { Lightbulb, ShieldCheck, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import type { Customer } from "@/lib/khataos/data";
import { formatINR } from "@/lib/khataos/data";

export function CopilotDrawer({
  customer, intent,
}: { customer?: Customer; intent?: string }) {
  if (!customer) return null;
  const utilization = Math.round((customer.outstanding / Math.max(1, customer.creditLimit)) * 100);
  const recs = buildRecs(customer, intent);

  return (
    <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald">
          <Lightbulb className="h-3 w-3" /> Shopkeeper copilot
        </div>
        <span className="text-[10px] text-ink-subtle">{customer.name}</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
        <Mini label="Reliability" value={`${customer.reliability}%`} ok={customer.reliability >= 80} />
        <Mini label="Utilization" value={`${utilization}%`} ok={utilization < 70} />
        <Mini label="Trust" value={String(customer.trustScore)} ok={customer.trustScore >= 75} />
      </div>

      <ul className="mt-2 space-y-1.5">
        {recs.map((r, i) => {
          const Icon = r.icon;
          return (
            <li key={i} className="flex items-start gap-2 rounded-xl border border-border bg-background/40 p-2">
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${r.tint}`} />
              <div className="min-w-0 text-[11.5px] leading-snug text-ink">{r.text}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Mini({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.12em] text-ink-subtle leading-none">{label}</div>
      <div className={`mt-0.5 text-[12px] font-semibold leading-none ${ok ? "text-emerald" : "text-amber-400"}`}>{value}</div>
    </div>
  );
}

function buildRecs(c: Customer, intent?: string) {
  const recs: { icon: any; tint: string; text: string }[] = [];
  recs.push({
    icon: ShieldCheck, tint: "text-emerald",
    text: `Repayment reliability ${c.reliability}% — ${c.reliability >= 90 ? "best-in-class. Eligible for limit increase." : c.reliability >= 75 ? "trusted customer. Safe to extend more credit." : "monitor closely."}`,
  });
  const headroom = Math.max(0, c.creditLimit - c.outstanding);
  if (intent === "CREDIT_REQUEST" || intent === "KHATA_ORDER") {
    recs.push({
      icon: TrendingUp, tint: "text-emerald",
      text: `Recommended credit extension: up to ${formatINR(Math.min(headroom, Math.round(c.creditLimit * 0.2)))} given current utilization.`,
    });
  }
  recs.push({
    icon: Clock, tint: "text-sky-400",
    text: `Payment usually received within ${c.reliability >= 90 ? "3" : c.reliability >= 75 ? "5" : "9"} days of due date.`,
  });
  if (c.riskTag === "high") {
    recs.push({
      icon: AlertTriangle, tint: "text-amber-400",
      text: `High-risk tier. Suggest collateral, settlement plan, or escalate to owner.`,
    });
  } else {
    recs.push({
      icon: ShieldCheck, tint: "text-emerald",
      text: `${(c.riskTag ?? "low").toUpperCase()}-risk customer. Auto-approval safe.`,
    });
  }
  return recs;
}
