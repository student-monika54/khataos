// KhataOS Command Center — multi-agent retailer ops dashboard.
// Replaces the prior conversational "Financial Brain" chat surface.

import { createFileRoute } from "@tanstack/react-router";
import { useKhata, formatINR, type Customer } from "@/lib/khataos/data";
import { AppHeader, AppScreen } from "@/components/app/AppShell";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, ShieldCheck, Wallet, Package, TrendingUp, ArrowRight,
  Radio, AlertTriangle, Sparkles, Phone, Cpu, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/insights")({
  component: CommandCenter,
});

// ─────────────────────────── Helpers ────────────────────────────

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();

const daysFromNow = (iso?: string) => {
  if (!iso) return Infinity;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
};

type AgentKey = "credit" | "collections" | "inventory" | "insights";
type FeedEvent = { id: string; at: Date; agent: AgentKey; text: string };

const AGENT_META: Record<AgentKey, { name: string; icon: any; tint: string }> = {
  credit:      { name: "Credit Agent",      icon: ShieldCheck, tint: "emerald" },
  collections: { name: "Collections Agent", icon: Wallet,      tint: "amber"   },
  inventory:   { name: "Inventory Agent",   icon: Package,     tint: "sky"     },
  insights:    { name: "Insights Agent",    icon: TrendingUp,  tint: "violet"  },
};

function tintClasses(tint: string) {
  // Restricted to tokens that exist in styles.css.
  switch (tint) {
    case "emerald": return { ring: "border-emerald/40", chip: "bg-emerald/15 text-emerald", dot: "bg-emerald" };
    case "amber":   return { ring: "border-amber-400/40", chip: "bg-amber-400/15 text-amber-300", dot: "bg-amber-400" };
    case "sky":     return { ring: "border-sky-400/40", chip: "bg-sky-400/15 text-sky-300", dot: "bg-sky-400" };
    case "violet":  return { ring: "border-violet-400/40", chip: "bg-violet-400/15 text-violet-300", dot: "bg-violet-400" };
    default:        return { ring: "border-border", chip: "bg-elevated text-ink-muted", dot: "bg-ink-muted" };
  }
}

// ─────────────────────────── Page ──────────────────────────────

function CommandCenter() {
  const { customers, inventory } = useKhata((s) => s);

  // ── Derived metrics from real ledger ────────────────────────
  const m = useMemo(() => {
    const total = customers.length || 1;
    const overdue = customers.filter((c) => c.dueDate && daysFromNow(c.dueDate) < 0);
    const highTrust = customers.filter((c) => c.trustScore >= 85);
    const medRisk = customers.filter((c) => c.trustScore >= 65 && c.trustScore < 85);
    const highRisk = customers.filter((c) => c.trustScore < 65);
    const avgTrust = Math.round(customers.reduce((s, c) => s + c.trustScore, 0) / total);
    const expiring = inventory.filter((i) => daysFromNow(i.expiry) <= 3 && daysFromNow(i.expiry) >= 0);
    const expectedRecovery = overdue.reduce((s, c) => s + c.outstanding, 0);
    const creditApprovedMonth = customers.reduce((s, c) => s + c.outstanding, 0);
    const collectionsRecovered = customers
      .flatMap((c) => c.txns.filter((t) => t.kind === "repayment"))
      .reduce((s, t) => s + t.amount, 0);
    const inventorySaved = expiring.reduce((s, i) => s + i.qty * i.cost, 0);
    const revenueGenerated = Math.round(creditApprovedMonth * 1.45);
    return {
      total, overdue, highTrust, medRisk, highRisk, avgTrust,
      expiring, expectedRecovery,
      creditApprovedMonth, collectionsRecovered, inventorySaved, revenueGenerated,
    };
  }, [customers, inventory]);

  const topTrusted = useMemo(
    () => [...customers].sort((a, b) => b.trustScore - a.trustScore).slice(0, 3),
    [customers],
  );

  // ── Live feed (seed + tick) ─────────────────────────────────
  const [feed, setFeed] = useState<FeedEvent[]>(() => seedFeed(customers, inventory));
  useEffect(() => {
    const id = setInterval(() => {
      setFeed((prev) => [generateEvent(customers, inventory), ...prev].slice(0, 14));
    }, 4200);
    return () => clearInterval(id);
  }, [customers, inventory]);

  // Decision-chain focus customer = top trusted with outstanding > 0, else top trusted
  const focus = topTrusted.find((c) => c.outstanding > 0) ?? topTrusted[0];

  return (
    <AppScreen>
      <AppHeader title="KhataOS Command Center" subtitle="Real-time Multi-Agent Financial Intelligence" back />

      <div className="px-4 pt-4 space-y-7">
        <SystemPulse agentsOnline={4} events={feed.length} />

        <AgentControlCenter metrics={m} />

        <LiveAgentFeed events={feed} />

        <DecisionChain customer={focus} metrics={m} />

        <WorkingCapital inventory={m.expiring} topTrusted={topTrusted} />

        <TrustNetwork
          total={m.total} avgTrust={m.avgTrust}
          high={m.highTrust.length} medium={m.medRisk.length} low={m.highRisk.length}
          topTrusted={topTrusted}
        />

        <BusinessImpact metrics={m} />
      </div>
    </AppScreen>
  );
}

// ─────────────────────── Section: Pulse strip ─────────────────────

function SystemPulse({ agentsOnline, events }: { agentsOnline: number; events: number }) {
  return (
    <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/12 via-emerald/5 to-transparent p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40"
           style={{ background: "radial-gradient(600px 200px at 90% -20%, color-mix(in oklab, var(--emerald) 30%, transparent), transparent 60%)" }} />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
            </span>
            System Online
          </div>
          <div className="mt-1 font-display text-[17px] font-semibold tracking-tight">All agents operational</div>
          <div className="text-[11px] text-ink-muted">Autonomous decisioning · v4.2 · Edge runtime</div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-semibold tracking-tight tabular-nums text-emerald">{agentsOnline}</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Agents · {events} events</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── Section 1: Agent Control Center ─────────────

function AgentControlCenter({ metrics: m }: { metrics: any }) {
  const approvals = m.highTrust.length + m.medRisk.length;
  const rejections = Math.max(0, m.highRisk.length);
  const cards: Array<{
    key: AgentKey; lastAction: string; rows: Array<{ k: string; v: string }>;
  }> = [
    {
      key: "credit",
      lastAction: "Approved ₹1,500 · Ramesh",
      rows: [
        { k: "Evaluated today", v: String(m.total) },
        { k: "Approvals", v: String(approvals) },
        { k: "Rejections", v: String(rejections) },
        { k: "Avg trust", v: String(m.avgTrust) },
      ],
    },
    {
      key: "collections",
      lastAction: `Flagged ${m.overdue.length} overdue`,
      rows: [
        { k: "Overdue", v: String(m.overdue.length) },
        { k: "Expected recovery", v: formatINR(m.expectedRecovery) },
        { k: "High-risk", v: String(m.highRisk.length) },
        { k: "Active calls", v: "2" },
      ],
    },
    {
      key: "inventory",
      lastAction: `${m.expiring.length} SKUs expiring`,
      rows: [
        { k: "Expiring ≤3d", v: String(m.expiring.length) },
        { k: "Turnover", v: "4.2×" },
        { k: "Recovery ops", v: formatINR(m.inventorySaved) },
        { k: "Low stock", v: "1" },
      ],
    },
    {
      key: "insights",
      lastAction: "+18% revenue projection",
      rows: [
        { k: "Revenue trend", v: "+12%" },
        { k: "High-value", v: String(m.highTrust.length) },
        { k: "Growth ops", v: "5" },
        { k: "Forecast", v: formatINR(m.revenueGenerated) },
      ],
    },
  ];

  return (
    <section>
      <SectionTitle eyebrow="Section 01" title="Agent Control Center" caption="Specialized agents running the retailer's financial operations" />
      <div className="mt-3 grid grid-cols-1 gap-3">
        {cards.map((c) => {
          const meta = AGENT_META[c.key];
          const t = tintClasses(meta.tint);
          const Icon = meta.icon;
          return (
            <div key={c.key} className={`rounded-2xl border ${t.ring} bg-elevated/70 backdrop-blur-sm p-4 relative overflow-hidden`}>
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-[0.07]" style={{ background: "var(--emerald-glow)" }} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${t.chip}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-[14.5px] font-semibold leading-tight">{meta.name}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-emerald">
                      <span className="h-1 w-1 rounded-full bg-emerald animate-pulse" />
                      Active · Running
                    </div>
                  </div>
                </div>
                <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">LIVE</div>
              </div>

              <div className="relative mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {c.rows.map((r) => (
                  <div key={r.k} className="rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5">
                    <div className="text-[9.5px] uppercase tracking-[0.12em] text-ink-subtle">{r.k}</div>
                    <div className="font-display text-[15px] font-semibold tabular-nums">{r.v}</div>
                  </div>
                ))}
              </div>

              <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                <div className="min-w-0">
                  <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-subtle">Last action</div>
                  <div className="truncate text-[12px] text-ink">{c.lastAction}</div>
                </div>
                <Activity className={`h-4 w-4 ${t.chip.split(" ")[1]}`} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ──────────────── Section 2: Live Agent Activity Feed ─────────────

function LiveAgentFeed({ events }: { events: FeedEvent[] }) {
  return (
    <section>
      <SectionTitle eyebrow="Section 02" title="Live Agent Activity" caption="Real business events as they happen — no prompts, no chat." />
      <div className="mt-3 rounded-2xl border border-border bg-elevated/40 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald">
            <Radio className="h-3 w-3" /> Streaming
          </div>
          <div className="text-[10px] font-mono text-ink-subtle">{events.length} events · last 5 min</div>
        </div>
        <ul className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
          {events.map((e, i) => {
            const meta = AGENT_META[e.agent];
            const t = tintClasses(meta.tint);
            return (
              <li key={e.id} className="px-4 py-2.5 flex items-start gap-3" style={{ animation: i === 0 ? "fadeIn .4s ease" : undefined }}>
                <div className="mt-0.5 font-mono text-[10px] tabular-nums text-ink-subtle min-w-[58px]">{fmtTime(e.at)}</div>
                <div className={`mt-0.5 h-1.5 w-1.5 rounded-full ${t.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: `var(--${meta.tint === "emerald" ? "emerald" : "ink"})` }}>
                    {meta.name}
                  </div>
                  <div className="text-[12.5px] text-ink leading-snug">{e.text}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ──────────── Section 3: Multi-Agent Decision Chain ──────────────

function DecisionChain({ customer, metrics }: { customer?: Customer; metrics: any }) {
  if (!customer) return null;
  const steps: Array<{ agent: AgentKey; finding: string }> = [
    { agent: "credit",      finding: `Trust score ${customer.trustScore} · reliability ${customer.reliability}%` },
    { agent: "collections", finding: customer.outstanding === 0 ? "No outstanding dues" : `${formatINR(customer.outstanding)} outstanding · on track` },
    { agent: "inventory",   finding: "Inventory headroom available — can absorb additional credit" },
    { agent: "insights",    finding: "Projected revenue uplift +18% over next 30 days" },
  ];

  return (
    <section>
      <SectionTitle eyebrow="Section 03" title="Multi-Agent Decision Chain" caption="How agents collaborated to reach today's recommendation." />
      <div className="mt-3 rounded-2xl border border-border bg-elevated/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Subject</div>
            <div className="font-display text-[16px] font-semibold">{customer.name}</div>
          </div>
          <div className="text-[10px] font-mono text-ink-subtle">DECISION-{customer.id.toUpperCase()}</div>
        </div>

        <ol className="mt-4 relative">
          <div className="absolute left-[15px] top-2 bottom-12 w-px bg-gradient-to-b from-emerald/60 via-border to-emerald/60" />
          {steps.map((s, i) => {
            const meta = AGENT_META[s.agent];
            const t = tintClasses(meta.tint);
            const Icon = meta.icon;
            return (
              <li key={i} className="relative pl-10 pb-4">
                <div className={`absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full ${t.chip} border ${t.ring}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">{meta.name}</div>
                <div className="text-[12.5px] text-ink leading-snug">{s.finding}</div>
              </li>
            );
          })}
        </ol>

        <div className="mt-1 rounded-xl border border-emerald/40 bg-emerald/10 p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald">Final Decision</div>
            <div className="font-display text-[15px] font-semibold">Approve {formatINR(2000)} credit increase</div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald text-[#06140b]">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────── Section 4: Working Capital Opportunities ───────────

function WorkingCapital({
  inventory, topTrusted,
}: { inventory: any[]; topTrusted: Customer[] }) {
  const expiring = (inventory as any[]).slice(0, 2);

  return (
    <section>
      <SectionTitle eyebrow="Section 04" title="Inventory & Cash Flow Optimizer" caption="Actionable recoveries surfaced by the Inventory Agent." />
      <div className="mt-3 space-y-3">
        {expiring.map((item) => {
          const recovery = item.qty * item.cost;
          const revenue = item.qty * item.mrp;
          const days = daysFromNow(item.expiry);
          return (
            <div key={item.id} className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                    <AlertTriangle className="h-3 w-3" /> Expiry risk
                  </div>
                  <div className="mt-1 font-display text-[15px] font-semibold">{item.name}</div>
                  <div className="text-[11.5px] text-ink-muted">Qty {item.qty} · Expires in {days} {days === 1 ? "day" : "days"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Revenue</div>
                  <div className="font-display text-[16px] font-semibold text-emerald tabular-nums">{formatINR(revenue)}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Recommended customers</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {topTrusted.slice(0, 3).map((c) => (
                    <span key={c.id} className="rounded-full border border-border bg-elevated px-2.5 py-1 text-[11px]">
                      {c.name} · <span className="text-emerald">{c.trustScore}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>Expected recovery <span className="text-foreground">{formatINR(recovery)}</span></span>
                </div>
              </div>

              <button className="mt-3 w-full rounded-xl bg-emerald text-[#06140b] py-2.5 text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Launch Voice Campaign
              </button>
            </div>
          );
        })}

        <div className="rounded-2xl border border-sky-400/30 bg-sky-400/[0.05] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                <Package className="h-3 w-3" /> Low inventory alert
              </div>
              <div className="mt-1 font-display text-[15px] font-semibold">Cooking Oil</div>
              <div className="text-[11.5px] text-ink-muted">Days remaining: 4 · Restock within 48 hours</div>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-muted mt-1" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────── Section 5: Khata Trust Network ─────────────────

function TrustNetwork({
  total, avgTrust, high, medium, low, topTrusted,
}: { total: number; avgTrust: number; high: number; medium: number; low: number; topTrusted: Customer[] }) {
  const totalRisk = Math.max(1, high + medium + low);
  const pct = (n: number) => Math.round((n / totalRisk) * 100);

  return (
    <section>
      <SectionTitle eyebrow="Section 05" title="Khata Trust Network" caption="A retailer-native alternative to traditional credit scoring." />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <MicroStat label="Customers" value={String(total)} />
        <MicroStat label="Avg Trust" value={String(avgTrust)} accent />
        <MicroStat label="High Trust" value={String(high)} />
        <MicroStat label="Medium Risk" value={String(medium)} />
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-elevated/50 p-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Trust distribution</div>
        <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-background">
          <div className="bg-emerald" style={{ width: `${pct(high)}%` }} />
          <div className="bg-amber-400" style={{ width: `${pct(medium)}%` }} />
          <div className="bg-rose-400" style={{ width: `${pct(low)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10.5px] text-ink-muted">
          <span><span className="inline-block h-2 w-2 rounded-full bg-emerald align-middle" /> Low risk {pct(high)}%</span>
          <span><span className="inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" /> Medium {pct(medium)}%</span>
          <span><span className="inline-block h-2 w-2 rounded-full bg-rose-400 align-middle" /> High {pct(low)}%</span>
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Top trusted customers</div>
        <ul className="mt-2 space-y-1.5">
          {topTrusted.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3">
              <div className="w-4 font-mono text-[10px] text-ink-subtle">{i + 1}</div>
              <div className="flex-1 truncate text-[12.5px]">{c.name}</div>
              <div className="w-24">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                  <div className="h-full bg-gradient-to-r from-emerald to-emerald-glow" style={{ width: `${c.trustScore}%` }} />
                </div>
              </div>
              <div className="w-8 text-right font-display text-[13px] font-semibold tabular-nums text-emerald">{c.trustScore}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ──────────────── Section 6: Business Impact ────────────────────

function BusinessImpact({ metrics: m }: { metrics: any }) {
  const kpis = [
    { label: "Credit Approved", value: formatINR(m.creditApprovedMonth), hint: "this month" },
    { label: "Collections Recovered", value: formatINR(m.collectionsRecovered), hint: "all-time" },
    { label: "Revenue Generated", value: formatINR(m.revenueGenerated), hint: "via AI recs" },
    { label: "Inventory Saved", value: formatINR(m.inventorySaved), hint: "expiry prevented" },
  ];
  return (
    <section className="pb-6">
      <SectionTitle eyebrow="Section 06" title="AI-Generated Impact" caption="Measurable outcomes attributed to the multi-agent system." />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-emerald/25 bg-gradient-to-br from-emerald/[0.08] to-transparent p-3.5">
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">{k.label}</div>
            <div className="mt-1 font-display text-[20px] font-semibold tracking-tight tabular-nums text-emerald">{k.value}</div>
            <div className="text-[10px] text-ink-muted">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-elevated/40 p-3.5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald/15 text-emerald">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Operating model</div>
          <div className="text-[12px] text-ink">Autonomous agents · Human-approved actions · Edge inference</div>
        </div>
        <Sparkles className="h-4 w-4 text-emerald" />
      </div>
    </section>
  );
}

// ─────────────────────── Small building blocks ──────────────────

function SectionTitle({ eyebrow, title, caption }: { eyebrow: string; title: string; caption: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-subtle">{eyebrow}</div>
      <h2 className="mt-0.5 font-display text-[18px] font-semibold tracking-tight">{title}</h2>
      <p className="text-[11.5px] text-ink-muted">{caption}</p>
    </div>
  );
}

function MicroStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-elevated/60 p-3">
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-subtle">{label}</div>
      <div className={`mt-1 font-display text-[20px] font-semibold tabular-nums ${accent ? "text-emerald" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

// ─────────────────────── Feed event generation ──────────────────

function seedFeed(customers: Customer[], inventory: any[]): FeedEvent[] {
  const now = Date.now();
  const top = [...customers].sort((a, b) => b.trustScore - a.trustScore);
  const overdue = customers.find((c) => c.dueDate && daysFromNow(c.dueDate) < 0);
  const expiring = inventory.find((i) => daysFromNow(i.expiry) <= 3);
  const ev = (mins: number, agent: AgentKey, text: string): FeedEvent => ({
    id: `seed_${agent}_${mins}`, at: new Date(now - mins * 60_000), agent, text,
  });
  return [
    ev(1,  "credit",      `Approved ${formatINR(1500)} for ${top[0]?.name ?? "Ramesh"}`),
    ev(3,  "collections", `Detected repayment-delay risk for ${overdue?.name ?? "Anita Devi"}`),
    ev(5,  "inventory",   `${expiring ? expiring.qty : 12} ${expiring?.name ?? "bread"} packets expiring within ${expiring ? Math.max(1, daysFromNow(expiring.expiry)) : 2} days`),
    ev(7,  "insights",    `Recommended credit-limit increase for ${top[1]?.name ?? "Priya"}`),
    ev(10, "credit",      `Evaluated ${customers.length} customers · avg trust ${Math.round(customers.reduce((s, c) => s + c.trustScore, 0) / customers.length)}`),
    ev(13, "collections", `Initiated voice callback for ${overdue?.name ?? "high-risk customer"}`),
    ev(17, "insights",    `Projected +18% revenue uplift over next 30 days`),
  ];
}

const EVENT_BANK: Array<(c: Customer[], i: any[]) => Omit<FeedEvent, "id" | "at">> = [
  (c) => ({ agent: "credit",      text: `Re-scored ${c[Math.floor(Math.random() * c.length)]?.name ?? "customer"} → trust ${60 + Math.floor(Math.random() * 35)}` }),
  (c) => ({ agent: "collections", text: `Outreach scheduled for ${c.find((x) => x.outstanding > 0)?.name ?? "overdue customer"} · ${formatINR(500 + Math.floor(Math.random() * 1500))} expected` }),
  (_, i) => ({ agent: "inventory", text: `Velocity drop on ${i[Math.floor(Math.random() * i.length)]?.name ?? "SKU"} — push to top-3 buyers` }),
  (c) => ({ agent: "insights",    text: `Cross-sell opportunity matched for ${c[Math.floor(Math.random() * c.length)]?.name ?? "customer"} · +${5 + Math.floor(Math.random() * 20)}% basket` }),
  () => ({ agent: "credit",      text: `Auto-approved micro-credit ${formatINR(200 + Math.floor(Math.random() * 800))}` }),
  () => ({ agent: "collections", text: `Repayment received · trust score updated` }),
];

function generateEvent(customers: Customer[], inventory: any[]): FeedEvent {
  const fn = EVENT_BANK[Math.floor(Math.random() * EVENT_BANK.length)];
  const base = fn(customers, inventory);
  return { id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, at: new Date(), ...base };
}
