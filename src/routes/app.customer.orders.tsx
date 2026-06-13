import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useKhata, formatINR } from "@/lib/khataos/data";
import {
  Phone, Package, CheckCircle2, XCircle, Loader2, Sparkles,
  Volume2, Clock, AlertTriangle, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/app/customer/orders")({
  component: CustomerOrders,
  errorComponent: OrdersErrorBoundary,
});

type LiveOrderStage =
  | "listening" | "processing" | "checking_credit"
  | "approved" | "rejected" | "conditional" | "ready_for_fulfillment";
type LiveOrderItem = { name: string; quantity: string };
type LiveOrder = {
  id: string; callId: string; customerId: string; customerName: string; phone?: string;
  items: LiveOrderItem[]; amount?: number; trustScore?: number;
  outstanding?: number; creditLimit?: number;
  stage: LiveOrderStage; decision?: "approve" | "reject" | "conditional";
  reasoning?: string; language?: string; createdAt: number; updatedAt: number;
};

const TIMELINE: { key: LiveOrderStage; label: string }[] = [
  { key: "processing", label: "Order Received" },
  { key: "checking_credit", label: "Credit Review" },
  { key: "approved", label: "Approved" },
  { key: "ready_for_fulfillment", label: "Ready for Pickup" },
];

function stageIndex(s: LiveOrderStage) {
  if (s === "listening" || s === "processing") return 0;
  if (s === "checking_credit") return 1;
  if (s === "approved" || s === "conditional") return 2;
  if (s === "ready_for_fulfillment") return 3;
  return 0;
}

function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.36);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function OrdersErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AppScreen>
      <AppHeader title="My Orders" back />
      <div className="px-4 pt-8">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/[0.06] p-5 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <div className="mt-2 font-display text-[15px] font-semibold">Unable to load orders right now.</div>
          <p className="mt-1 text-[12px] text-ink-muted">Please try again later.</p>
          {error?.message && <p className="mt-2 text-[10.5px] font-mono text-ink-subtle break-all">{error.message}</p>}
          <button
            onClick={reset}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-[12px] font-semibold text-[#06140b]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    </AppScreen>
  );
}

function CustomerOrders() {
  // Defensive store reads — never crash if shape is unexpected.
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id));
  const shop = useKhata((s) => s.shop);
  const ledgerOrders = useKhata((s) =>
    me ? (s.orders ?? []).filter((o) => o.customerId === me.id) : [],
  );

  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const known = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!me) return;
    let mounted = true;
    let cancelled = false;

    async function poll() {
      try {
        const r = await fetch("/api/khataos/orders/live");
        if (!mounted || cancelled) return;
        if (!r.ok) {
          console.error("[CustomerOrders] API status", r.status);
          setApiError(`Status ${r.status}`);
          setLoading(false);
          return;
        }
        const data: unknown = await r.json();
        const list: LiveOrder[] = Array.isArray(data) ? (data as LiveOrder[]) : [];
        const mine = list.filter((o) =>
          o && (o.customerId === me!.id || (typeof o.customerId === "string" && o.customerId.startsWith("c_"))),
        );
        if (firstLoad.current) {
          console.log("[CustomerOrders] customerId=", me!.id, "ordersReturned=", list.length, "matched=", mine.length);
        } else {
          const fresh = mine.filter((o) => !known.current.has(o.id));
          if (fresh.length > 0) {
            playChime();
            setFlashId(fresh[0].id);
            setTimeout(() => setFlashId(null), 2000);
          }
        }
        mine.forEach((o) => known.current.add(o.id));
        firstLoad.current = false;
        setApiError(null);
        setOrders(mine);
        setLoading(false);
      } catch (e: any) {
        console.error("[CustomerOrders] fetch error", e);
        if (!mounted || cancelled) return;
        setApiError(e?.message ?? "Network error");
        setLoading(false);
      }
    }
    poll();
    const id = setInterval(poll, 1500);
    return () => { mounted = false; cancelled = true; clearInterval(id); };
  }, [me?.id, reloadKey]);

  if (!me) {
    return (
      <AppScreen>
        <AppHeader title="My Orders" back />
        <EmptyState />
      </AppScreen>
    );
  }

  const active = orders.filter((o) => o.stage !== "rejected");
  const rejected = orders.filter((o) => o.stage === "rejected");
  const hasAnything = orders.length > 0 || ledgerOrders.length > 0;

  return (
    <AppScreen>
      <AppHeader title="My Orders" subtitle="Real-time order tracking" back />

      <div className="px-4 pt-4">
        {/* Pipeline summary */}
        <div className="rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/60 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-emerald">
            <Sparkles className="h-3 w-3" /> Live pipeline
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Active", value: active.length, tone: "text-emerald" },
              { label: "Approved", value: orders.filter((o) => o.stage === "approved" || o.stage === "ready_for_fulfillment").length, tone: "text-foreground" },
              { label: "Ready", value: orders.filter((o) => o.stage === "ready_for_fulfillment").length, tone: "text-foreground" },
              { label: "Rejected", value: rejected.length, tone: "text-destructive" },
            ].map((m) => (
              <div key={m.label}>
                <div className={`font-display text-xl font-semibold ${m.tone}`}>{m.value}</div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          to="/app/customer/call"
          className="mt-4 flex items-center justify-between rounded-2xl border border-emerald/40 bg-emerald/10 px-4 py-3"
        >
          <div>
            <div className="text-[12px] font-semibold text-emerald">Place a new order</div>
            <div className="text-[11px] text-ink-muted">Call KhataOS · multilingual voice</div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald text-[#06140b]">
            <Phone className="h-4 w-4" />
          </div>
        </Link>

        {apiError && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-amber-400">Live updates paused</div>
              <div className="truncate text-[11px] text-ink-muted">{apiError}</div>
            </div>
            <button
              onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}
              className="inline-flex items-center gap-1 rounded-full bg-surface border border-border px-3 py-1.5 text-[11px] font-medium"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
      </div>

      {loading && !hasAnything && !apiError ? (
        <div className="px-4 pt-6">
          <div className="rounded-2xl border border-border bg-elevated/40 p-5 text-center text-[12px] text-ink-muted">
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-emerald" />
            <div className="mt-2">Loading your orders…</div>
          </div>
        </div>
      ) : !hasAnything && !apiError ? (
        <EmptyState />
      ) : (
        <>
          <Section title="Active orders">
            {active.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-5 text-center">
                <Package className="mx-auto h-5 w-5 text-emerald" />
                <div className="mt-2 font-display text-[13px] font-semibold">No active orders</div>
                <p className="mt-1 text-[11px] text-ink-muted">Call KhataOS to place your next voice order.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {active.map((o) => (
                  <OrderCard key={o.id} o={o} flash={flashId === o.id} storeName={shop?.name ?? "KhataOS Store"} />
                ))}
              </ul>
            )}
          </Section>

          {rejected.length > 0 && (
            <Section title="Cancelled / rejected">
              <ul className="space-y-3">
                {rejected.map((o) => (
                  <OrderCard key={o.id} o={o} flash={false} storeName={shop?.name ?? "KhataOS Store"} />
                ))}
              </ul>
            </Section>
          )}

          <Section title="Past orders">
            {ledgerOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-4 text-center text-[12px] text-ink-muted">
                No past orders yet.
              </div>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-border bg-elevated/60 divide-y divide-border">
                {ledgerOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {(o.items ?? []).map((i) => i.name).join(", ") || "Order"}
                      </div>
                      <div className="truncate text-[11px] text-ink-muted">
                        {shop?.name ?? "Store"} · {new Date(o.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short" })} · {o.status}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{formatINR(o.amount)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </AppScreen>
  );
}

function EmptyState() {
  return (
    <div className="px-4 pt-6">
      <div className="rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/60 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald/15 text-emerald">
          <Package className="h-5 w-5" />
        </div>
        <div className="mt-3 font-display text-[16px] font-semibold">No orders yet</div>
        <p className="mt-1 text-[12px] text-ink-muted">
          Place your first order using the KhataOS Voice Assistant.
        </p>
        <Link
          to="/app/customer/call"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-[12.5px] font-semibold text-[#06140b]"
        >
          <Phone className="h-4 w-4" /> Call KhataOS
        </Link>
      </div>
    </div>
  );
}

function OrderCard({ o, flash, storeName }: { o: LiveOrder; flash: boolean; storeName: string }) {
  const idx = stageIndex(o.stage);
  const rejected = o.stage === "rejected";
  const ring = flash ? "ring-2 ring-emerald shadow-[0_0_24px_rgba(16,185,129,0.35)]" : "";
  const border = rejected ? "border-destructive/50 bg-destructive/[0.06]"
    : idx >= 2 ? "border-emerald/50 bg-emerald/[0.06]"
    : "border-emerald/30 bg-elevated/70";
  const items = Array.isArray(o.items) ? o.items : [];

  return (
    <li className={`rounded-2xl border ${border} ${ring} p-4 transition-all duration-300`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-emerald" />
            <span className="text-[10px] uppercase tracking-[0.14em] text-emerald font-semibold">Voice order</span>
            {flash && <Volume2 className="h-3 w-3 text-emerald animate-pulse" />}
          </div>
          <div className="mt-0.5 font-display text-[14px] font-semibold truncate">{storeName}</div>
          <div className="text-[10.5px] text-ink-muted">#{(o.id ?? "").slice(-6)}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-[15px] font-semibold">{o.amount ? formatINR(o.amount) : "—"}</div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-ink-subtle">
            <Clock className="h-3 w-3" /> {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <li key={i} className="rounded-full bg-surface border border-border px-2 py-0.5 text-[11px]">
              {it.quantity} {it.name}
            </li>
          ))}
        </ul>
      )}

      <ol className="mt-3 space-y-1.5">
        {TIMELINE.map((step, i) => {
          const done = !rejected && i <= idx;
          const active = !rejected && i === idx && o.stage !== "ready_for_fulfillment";
          const failed = rejected && i === 1;
          const Icon = failed ? XCircle : done ? CheckCircle2 : active ? Loader2 : Clock;
          return (
            <li key={step.key} className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 ${
                failed ? "text-destructive"
                : done ? "text-emerald"
                : active ? "text-emerald animate-spin"
                : "text-ink-subtle"
              }`} />
              <span className={`text-[12px] ${
                failed ? "text-destructive font-semibold"
                : done ? "text-foreground font-medium"
                : active ? "text-emerald font-semibold"
                : "text-ink-subtle"
              }`}>{failed ? "Credit Rejected" : step.label}</span>
            </li>
          );
        })}
      </ol>

      {o.reasoning && (
        <p className="mt-3 rounded-xl bg-surface/80 px-3 py-2 text-[11.5px] leading-snug text-ink-muted">
          <span className="text-emerald font-semibold">AI: </span>{o.reasoning}
        </p>
      )}
    </li>
  );
}
