import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { Phone, Package, Loader2, Sparkles, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/app/customer/orders")({
  component: CustomerOrders,
  errorComponent: OrdersErrorBoundary,
});

type DbOrder = {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string | null;
  source: string;
  call_id: string | null;
  items: { name: string; quantity: number; unit?: string; estimatedPrice?: number }[];
  amount: number | null;
  language: string | null;
  transcript: string | null;
  status: "pending_approval" | "approved" | "rejected" | "packed" | "ready" | "delivered";
  reasoning: string | null;
  created_at: string;
};

function OrdersErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AppScreen>
      <AppHeader title="My Orders" back />
      <div className="px-4 pt-8">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/[0.06] p-5 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <div className="mt-2 font-display text-[15px] font-semibold">Unable to load orders right now.</div>
          {error?.message && <p className="mt-2 text-[10.5px] font-mono text-ink-subtle break-all">{error.message}</p>}
          <button onClick={reset} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-[12px] font-semibold text-[#06140b]">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    </AppScreen>
  );
}

function CustomerOrders() {
  const meId = useKhata((s) => s.me.id);
  const shop = useKhata((s) => s.shop);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const r = await fetch(`/api/khataos/orders?customerId=${encodeURIComponent(meId)}`);
        if (!mounted) return;
        if (!r.ok) { setErr(`Status ${r.status}`); setLoading(false); return; }
        const data = await r.json();
        if (Array.isArray(data) && mounted) {
          setOrders(data);
          setErr(null);
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) { setErr(e?.message ?? "Network error"); setLoading(false); }
      }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); };
  }, [meId]);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(id);
    try {
      await fetch("/api/khataos/orders/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      setOrders((cur) => cur.map((o) => o.id === id ? { ...o, status: decision === "approve" ? "approved" : "rejected" } : o));
    } finally { setBusy(null); }
  }

  const pending = orders.filter((o) => o.status === "pending_approval");
  const active = orders.filter((o) => ["approved", "packed", "ready"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "rejected"].includes(o.status));

  return (
    <AppScreen>
      <AppHeader title="My Orders" subtitle="Synced live with your shop" back />

      <div className="px-4 pt-4">
        <div className="rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/60 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-emerald">
            <Sparkles className="h-3 w-3" /> Live pipeline
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Pending", value: pending.length },
              { label: "Active", value: active.length },
              { label: "Delivered", value: orders.filter((o) => o.status === "delivered").length },
              { label: "Rejected", value: orders.filter((o) => o.status === "rejected").length },
            ].map((m) => (
              <div key={m.label}>
                <div className="font-display text-xl font-semibold">{m.value}</div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <Link to="/app/customer/call" className="mt-4 flex items-center justify-between rounded-2xl border border-emerald/40 bg-emerald/10 px-4 py-3">
          <div>
            <div className="text-[12px] font-semibold text-emerald">Place a new order</div>
            <div className="text-[11px] text-ink-muted">Call KhataOS · multilingual voice</div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald text-[#06140b]"><Phone className="h-4 w-4" /></div>
        </Link>

        {err && (
          <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-[11.5px] text-amber-300">
            Live updates paused — {err}
          </div>
        )}
      </div>

      {loading && orders.length === 0 ? (
        <div className="px-4 pt-6">
          <div className="rounded-2xl border border-border bg-elevated/40 p-5 text-center text-[12px] text-ink-muted">
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-emerald" />
            <div className="mt-2">Loading your orders…</div>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {pending.length > 0 && (
            <Section title={`Awaiting your approval · ${pending.length}`}>
              <ul className="space-y-3">
                {pending.map((o) => (
                  <li key={o.id} className="rounded-2xl border border-amber-400/40 bg-amber-400/[0.06] p-4">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-300" />
                      <span className="text-[10px] uppercase tracking-[0.14em] text-amber-300 font-semibold">AI-parsed order · {o.source.replace("_", " ")}</span>
                    </div>
                    {o.transcript && <p className="mt-2 text-[11.5px] italic text-ink-muted line-clamp-2">"{o.transcript}"</p>}
                    <ItemList items={o.items} />
                    {o.amount != null && (
                      <div className="mt-2 flex justify-between border-t border-amber-400/20 pt-2 text-[13px] font-semibold">
                        <span>Estimated total</span><span>{formatINR(Number(o.amount))}</span>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button disabled={busy === o.id} onClick={() => decide(o.id, "reject")} className="flex-1 rounded-full border border-border bg-surface py-2 text-[12.5px] font-semibold disabled:opacity-50">Reject</button>
                      <button disabled={busy === o.id} onClick={() => decide(o.id, "approve")} className="flex-1 rounded-full bg-emerald py-2 text-[12.5px] font-semibold text-[#06140b] disabled:opacity-50">{busy === o.id ? "Sending…" : "Approve & send"}</button>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {active.length > 0 && (
            <Section title={`Active · ${active.length}`}>
              <ul className="space-y-3">
                {active.map((o) => <OrderRow key={o.id} o={o} storeName={shop?.name ?? "Store"} />)}
              </ul>
            </Section>
          )}

          {past.length > 0 && (
            <Section title="Previous orders">
              <ul className="space-y-2">
                {past.map((o) => <OrderRow key={o.id} o={o} storeName={shop?.name ?? "Store"} dim />)}
              </ul>
            </Section>
          )}
        </>
      )}
    </AppScreen>
  );
}

function ItemList({ items }: { items: DbOrder["items"] }) {
  return (
    <ul className="mt-2.5 space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex justify-between text-[12.5px]">
          <span>{it.quantity} {it.unit ?? "pcs"} {it.name}</span>
          {it.estimatedPrice != null && <span className="text-ink-muted">{formatINR(it.estimatedPrice)}</span>}
        </li>
      ))}
    </ul>
  );
}

const STATUS_LABEL: Record<DbOrder["status"], { label: string; tone: string; icon: any }> = {
  pending_approval: { label: "Pending approval", tone: "text-amber-300", icon: Clock },
  approved: { label: "Approved", tone: "text-emerald", icon: CheckCircle2 },
  packed: { label: "Packed", tone: "text-emerald", icon: Package },
  ready: { label: "Ready for pickup", tone: "text-emerald", icon: Package },
  delivered: { label: "Delivered", tone: "text-ink-muted", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "text-destructive", icon: XCircle },
};

function OrderRow({ o, storeName, dim }: { o: DbOrder; storeName: string; dim?: boolean }) {
  const meta = STATUS_LABEL[o.status];
  const Icon = meta.icon;
  return (
    <li className={`rounded-2xl border border-border bg-elevated/60 p-4 ${dim ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-display text-[13.5px] font-semibold">{storeName}</div>
          <div className="text-[10.5px] text-ink-muted">#{o.id.slice(-6)} · {new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-[14.5px] font-semibold">{o.amount != null ? formatINR(Number(o.amount)) : "—"}</div>
          <div className={`mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-semibold ${meta.tone}`}>
            <Icon className="h-3 w-3" /> {meta.label}
          </div>
        </div>
      </div>
      <ItemList items={o.items} />
    </li>
  );
}

function EmptyState() {
  return (
    <div className="px-4 pt-6">
      <div className="rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/60 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald/15 text-emerald"><Package className="h-5 w-5" /></div>
        <div className="mt-3 font-display text-[16px] font-semibold">No orders yet</div>
        <p className="mt-1 text-[12px] text-ink-muted">Place your first order using the KhataOS Voice Assistant.</p>
        <Link to="/app/customer/call" className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-[12.5px] font-semibold text-[#06140b]">
          <Phone className="h-4 w-4" /> Call KhataOS
        </Link>
      </div>
    </div>
  );
}
