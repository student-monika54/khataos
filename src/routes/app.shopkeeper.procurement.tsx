import { createFileRoute } from "@tanstack/react-router";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { AppHeader, AppScreen, Section, StatCard } from "@/components/app/AppShell";
import { Upload, AlertTriangle, Package } from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/procurement")({
  component: Procurement,
});

function Procurement() {
  const inventory = useKhata((s) => s.inventory);
  const value = inventory.reduce((s, i) => s + i.qty * i.cost, 0);
  const expSoon = inventory.filter((i) => i.expiry && new Date(i.expiry).getTime() - Date.now() < 3 * 86400000);
  const expValue = expSoon.reduce((s, i) => s + i.qty * i.cost, 0);

  return (
    <AppScreen>
      <AppHeader title="Procurement & Stock" subtitle="Working capital intelligence" back />
      <div className="px-4 pt-4 grid grid-cols-3 gap-3">
        <StatCard label="Stock value" value={formatINR(value)} accent />
        <StatCard label="At expiry risk" value={formatINR(expValue)} />
        <StatCard label="SKUs" value={String(inventory.length)} />
      </div>

      <div className="px-4 mt-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-elevated/40 px-4 py-6 text-sm font-medium text-ink-muted hover:border-emerald/40 hover:text-emerald">
          <Upload className="h-4 w-4" /> Upload invoice / distributor bill
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-subtle">
          AI extracts product, qty, cost, MRP & expiry. Demo only.
        </p>
      </div>

      {expSoon.length > 0 && (
        <Section title="Working capital alerts">
          <ul className="space-y-2.5">
            {expSoon.map((i) => {
              const days = Math.max(0, Math.round((new Date(i.expiry!).getTime() - Date.now()) / 86400000));
              return (
                <li key={i.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display text-[14px] font-semibold">{i.name}</div>
                      <div className="text-[11px] text-ink-muted">{i.qty} units · MRP {formatINR(i.mrp)}</div>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                      <AlertTriangle className="h-3 w-3" /> {days}d
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-background/40 p-3 text-[12px] text-ink-muted">
                    <span className="font-semibold text-foreground">AI recommendation:</span> Discount 15%, push to trusted customers via voice agent.
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Inventory">
        <ul className="overflow-hidden rounded-2xl border border-border bg-elevated/60 divide-y divide-border">
          {inventory.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface text-ink-muted">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{i.name}</div>
                <div className="text-[11px] text-ink-muted">{i.qty} units · cost {formatINR(i.cost)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatINR(i.qty * i.cost)}</div>
                {i.expiry && <div className="text-[10px] text-ink-subtle">exp {new Date(i.expiry).toLocaleDateString("en-IN", {day:"numeric",month:"short"})}</div>}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </AppScreen>
  );
}
