import { createFileRoute } from "@tanstack/react-router";
import { useKhata, formatINR, setOrderStatus } from "@/lib/khataos/data";
import { AppHeader, AppScreen } from "@/components/app/AppShell";
import type { Order } from "@/lib/khataos/data";

export const Route = createFileRoute("/app/shopkeeper/orders")({
  component: Orders,
});

const NEXT: Record<Order["status"], Order["status"] | null> = {
  pending: "packed", packed: "ready", ready: "delivered", delivered: null,
};
const LABEL: Record<Order["status"], string> = {
  pending: "Pack", packed: "Mark Ready", ready: "Delivered", delivered: "Delivered ✓",
};

function Orders() {
  const { orders, customers } = useKhata((s) => s);
  return (
    <AppScreen>
      <AppHeader title="Orders" subtitle={`${orders.length} active`} back />
      <ul className="space-y-3 px-4 pt-4">
        {orders.map((o) => {
          const c = customers.find((x) => x.id === o.customerId)!;
          const next = NEXT[o.status];
          return (
            <li key={o.id} className="rounded-2xl border border-border bg-elevated/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-[15px] font-semibold">{c.name}</div>
                  <div className="text-[11px] text-ink-muted">{c.phone}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-semibold">{formatINR(o.amount)}</div>
                  <div className={`text-[11px] font-medium ${o.onCredit ? "text-amber-300" : "text-emerald"}`}>
                    {o.onCredit ? "On khata" : "Cash paid"}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 font-medium text-emerald">
                  Trust {c.trustScore}
                </span>
                <span className="text-ink-subtle">·</span>
                <span className="text-ink-muted">Status: {o.status}</span>
              </div>

              <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-surface/60">
                {o.items.map((it, i) => (
                  <li key={i} className="flex justify-between px-3 py-2 text-[12px]">
                    <span className="truncate">{it.qty}× {it.name}</span>
                    <span className="text-ink-muted">{formatINR(it.qty * it.price)}</span>
                  </li>
                ))}
              </ul>

              {next ? (
                <button
                  onClick={() => setOrderStatus(o.id, next)}
                  className="mt-3 w-full rounded-full bg-emerald py-2.5 text-sm font-semibold text-[#06140b]"
                >
                  {LABEL[o.status]}
                </button>
              ) : (
                <div className="mt-3 text-center text-[12px] font-medium text-emerald">Delivered ✓</div>
              )}
            </li>
          );
        })}
      </ul>
    </AppScreen>
  );
}
