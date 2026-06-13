import { createFileRoute, Link } from "@tanstack/react-router";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { ArrowUpRight, Sparkles, TrendingUp, Radio, AlertTriangle, Clock, Lightbulb, Package, Settings } from "lucide-react";
import { LiveOrdersPanel } from "@/components/app/LiveOrdersPanel";

export const Route = createFileRoute("/app/shopkeeper/")({
  component: ShopHome,
});

function ShopHome() {
  const { customers, orders, inventory, shop } = useKhata((s) => s);
  const outstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);
  const revenue30d = 84_500;
  const todayCollected = customers.reduce((sum, c) => {
    const today = new Date().toDateString();
    return sum + c.txns
      .filter((t) => t.kind === "repayment" && new Date(t.date).toDateString() === today)
      .reduce((a, b) => a + b.amount, 0);
  }, 0);
  const collected = customers.reduce((sum, c) => sum + c.txns.filter(t=>t.kind==="repayment").reduce((a,b)=>a+b.amount,0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
  const collectionRate = Math.round((collected / Math.max(1, collected + outstanding)) * 100);
  const inventoryValue = inventory.reduce((s, i) => s + i.qty * i.cost, 0);
  const expiringSoon = inventory.filter((i) => i.expiry && new Date(i.expiry).getTime() - Date.now() < 3 * 86400000);
  const highRisk = customers.filter((c) => c.riskTag === "high" || c.reliability < 70);
  const upcoming = customers
    .filter((c) => c.outstanding > 0 && c.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 4);

  const insights = [
    { icon: TrendingUp, tint: "text-emerald", text: `Collection rate ${collectionRate}% — ahead of regional average (68%).` },
    { icon: Package, tint: "text-amber-400", text: expiringSoon.length > 0 ? `${expiringSoon.length} SKUs expire in 3 days. Push to Mohan & Priya — both have headroom.` : "Inventory is healthy. No expiry urgency." },
    { icon: Lightbulb, tint: "text-sky-400", text: `Extend +₹2,000 limit to Priya Sharma (94 trust). Likely to spend ₹1,200/month more.` },
  ];

  return (
    <AppScreen>
      <AppHeader title={shop.name} subtitle={`${shop.owner} · Owner`} />
      <div className="px-4 pt-4">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-elevated to-surface p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Revenue · 30 days</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="font-display text-4xl font-semibold tracking-tight">{formatINR(revenue30d)}</div>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald">
              <TrendingUp className="h-3 w-3" /> +12.4%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">Today collected</div>
              <div className="mt-0.5 font-display text-base font-semibold text-emerald">{formatINR(todayCollected)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">Outstanding</div>
              <div className="mt-0.5 font-display text-base font-semibold">{formatINR(outstanding)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">Rate</div>
              <div className="mt-0.5 font-display text-base font-semibold text-emerald">{collectionRate}%</div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="Customers" value={String(customers.length)} hint="active" />
          <StatCard label="Limit pool" value={formatINR(totalCredit)} />
          <StatCard label="Inventory" value={formatINR(inventoryValue)} />
        </div>

        <Link
          to="/app/shopkeeper/live"
          className="mt-4 flex items-center justify-between rounded-2xl border border-emerald/40 bg-gradient-to-r from-emerald/20 to-emerald/5 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald/20 text-emerald">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-[14px] font-semibold">Live call monitor</div>
              <div className="text-[11px] text-ink-muted">Realtime transcript · AI copilot</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-emerald">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" /> READY
          </span>
        </Link>

        <Link
          to="/app/shopkeeper/insights"
          className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-elevated/60 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald/10 text-emerald">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-[14px] font-semibold">Ask Financial Brain</div>
              <div className="text-[11px] text-ink-muted">Risk, opportunities, recommendations</div>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-emerald" />
        </Link>
      </div>

      <Section title="AI business insights">
        <ul className="space-y-2">
          {insights.map((ins, i) => {
            const Icon = ins.icon;
            return (
              <li key={i} className="flex items-start gap-2.5 rounded-2xl border border-border bg-elevated/60 p-3">
                <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${ins.tint}`} />
                <div className="text-[12.5px] leading-snug text-ink">{ins.text}</div>
              </li>
            );
          })}
        </ul>
      </Section>

      {highRisk.length > 0 && (
        <Section title={`High-risk customers · ${highRisk.length}`}>
          <ul className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] divide-y divide-border">
            {highRisk.slice(0, 3).map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <div>
                    <div className="text-[13px] font-semibold">{c.name}</div>
                    <div className="text-[11px] text-ink-muted">Trust {c.trustScore} · Reliability {c.reliability}%</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-semibold text-amber-400">{formatINR(c.outstanding)}</div>
                  <div className="text-[10px] text-ink-muted">overdue</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Upcoming repayments">
        <ul className="overflow-hidden rounded-2xl border border-border bg-elevated/60 divide-y divide-border">
          {upcoming.map((c) => {
            const days = Math.round((new Date(c.dueDate!).getTime() - Date.now()) / 86400000);
            const overdue = days < 0;
            return (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Clock className={`h-4 w-4 ${overdue ? "text-destructive" : days < 3 ? "text-amber-400" : "text-emerald"}`} />
                  <div>
                    <div className="text-[13px] font-semibold">{c.name}</div>
                    <div className="text-[11px] text-ink-muted">{overdue ? `${Math.abs(days)}d overdue` : `due in ${days}d`}</div>
                  </div>
                </div>
                <div className="text-[13px] font-semibold">{formatINR(c.outstanding)}</div>
              </li>
            );
          })}
        </ul>
      </Section>

      {expiringSoon.length > 0 && (
        <Section title="Working capital alert">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">Inventory-linked credit</div>
            <div className="mt-1 text-sm">{expiringSoon[0].qty} {expiringSoon[0].name} expire in {Math.max(1, Math.round((new Date(expiringSoon[0].expiry!).getTime() - Date.now())/86400000))} days.</div>
            <div className="mt-1 text-[12px] text-ink-muted">Recommend: clearance discount + extend credit for trusted customers to recover ₹{Math.round(expiringSoon[0].qty * expiringSoon[0].cost * 0.8)} working capital.</div>
          </div>
        </Section>
      )}

      <Section title="Live voice orders">
        <LiveOrdersPanel compact />
      </Section>

      <Section title="Today's orders">
        <ul className="overflow-hidden rounded-2xl border border-border bg-elevated/60 divide-y divide-border">
          {orders.slice(0, 4).map((o) => {
            const cust = customers.find((c) => c.id === o.customerId);
            return (
              <li key={o.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{cust?.name}</div>
                  <div className="text-[11px] text-ink-muted">
                    {o.items.length} items · {o.onCredit ? "On khata" : "Cash"} · {o.status}
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatINR(o.amount)}</div>
              </li>
            );
          })}
        </ul>
      </Section>
    </AppScreen>
  );
}
