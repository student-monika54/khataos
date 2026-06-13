import { createFileRoute, Link } from "@tanstack/react-router";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { ArrowUpRight, Sparkles, TrendingUp, Radio } from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/")({
  component: ShopHome,
});

function ShopHome() {
  const { customers, orders, inventory, shop } = useKhata((s) => s);
  const outstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);
  const revenue30d = 84_500; // demo
  const collected = customers.reduce((sum, c) => sum + c.txns.filter(t=>t.kind==="repayment").reduce((a,b)=>a+b.amount,0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
  const collectionRate = Math.round((collected / Math.max(1, collected + outstanding)) * 100);
  const inventoryValue = inventory.reduce((s, i) => s + i.qty * i.cost, 0);
  const expiringSoon = inventory.filter((i) => i.expiry && new Date(i.expiry).getTime() - Date.now() < 3 * 86400000);

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
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-ink-subtle">Outstanding credit</div>
              <div className="mt-0.5 font-display text-lg font-semibold">{formatINR(outstanding)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-ink-subtle">Collection rate</div>
              <div className="mt-0.5 font-display text-lg font-semibold text-emerald">{collectionRate}%</div>
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
              <div className="text-[11px] text-ink-muted">Realtime transcript · AI recommendation</div>
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

        {expiringSoon.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">Working capital alert</div>
            <div className="mt-1 text-sm">{expiringSoon[0].qty} {expiringSoon[0].name} expire in {Math.max(1, Math.round((new Date(expiringSoon[0].expiry!).getTime() - Date.now())/86400000))} days.</div>
            <div className="mt-1 text-[12px] text-ink-muted">Recommend: clearance discount + extend credit for trusted customers.</div>
          </div>
        )}
      </div>

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
