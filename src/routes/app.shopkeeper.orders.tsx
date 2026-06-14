// Incoming Orders — retailer dashboard. DB-backed, polls every ~1s.
// The retailer is the ONLY actor that can approve, reject, or advance an
// order through the fulfillment pipeline. Customers see status updates
// here in real time on their own Orders screen.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useKhata, formatINR, setOrderStatus } from "@/lib/khataos/data";
import type { Order } from "@/lib/khataos/data";
import {
  Phone, Sparkles, CheckCircle2, XCircle, Loader2, ShieldCheck,
  Package as PackageIcon, PackageCheck, Truck, Volume2,
} from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/orders")({
  component: IncomingOrders,
});

type Status =
  | "pending_credit_review" | "approved" | "rejected"
  | "packed" | "ready_for_pickup" | "delivered";

type DbOrder = {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string | null;
  source: string;
  items: { name: string; quantity: number; unit?: string; estimatedPrice?: number }[];
  amount: number | null;
  language: string | null;
  status: Status;
  reasoning: string | null;
  trust_score: number | null;
  credit_recommendation: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
};

const BUCKETS: { key: string; title: string; statuses: Status[] }[] = [
  { key: "review", title: "Pending credit review", statuses: ["pending_credit_review"] },
  { key: "approved", title: "Approved · ready to pack", statuses: ["approved"] },
  { key: "packed", title: "Packed", statuses: ["packed"] },
  { key: "ready", title: "Ready for pickup", statuses: ["ready_for_pickup"] },
  { key: "done", title: "Delivered & rejected", statuses: ["delivered", "rejected"] },
];

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

function IncomingOrders() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const known = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const r = await fetch("/api/khataos/orders");
        if (!r.ok) return;
        const data: DbOrder[] = await r.json();
        if (!mounted || !Array.isArray(data)) return;
        if (!first.current) {
          const fresh = data.filter((o) => !known.current.has(o.id));
          if (fresh.length > 0) {
            playChime();
            setFlashId(fresh[0].id);
            setTimeout(() => setFlashId(null), 1800);
          }
        }
        data.forEach((o) => known.current.add(o.id));
        first.current = false;
        setOrders(data);
      } catch {}
    }
    poll();
    const id = setInterval(poll, 1500);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, DbOrder[]> = {};
    for (const b of BUCKETS) map[b.key] = [];
    for (const o of orders) {
      const b = BUCKETS.find((x) => x.statuses.includes(o.status));
      if (b) map[b.key].push(o);
    }
    return map;
  }, [orders]);

  const totalLive = orders.length;
  const inReview = orders.filter((o) => o.status === "pending_credit_review").length;

  return (
    <AppScreen>
      <AppHeader
        title="Incoming Orders"
        subtitle={totalLive > 0 ? `${totalLive} total · ${inReview} awaiting your review` : "Live from the KhataOS voice agent"}
      />

      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/10 to-emerald/[0.02] p-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald">Real-time pipeline</span>
          </div>
          <ol className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px] text-ink-muted">
            {["Review", "Approve", "Pack", "Ready", "Deliver"].map((s) => (
              <li key={s} className="flex flex-col items-center gap-1">
                <span className="h-1.5 w-full rounded-full bg-emerald/40" />
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {totalLive === 0 ? (
        <div className="mx-4 mt-6 rounded-2xl border border-dashed border-border bg-elevated/40 p-8 text-center">
          <Phone className="mx-auto h-6 w-6 text-emerald" />
          <div className="mt-2 font-display text-[14px] font-semibold">Waiting for the next call</div>
          <p className="mt-1 text-[12px] text-ink-muted">
            Voice orders from customers appear here the moment the agent extracts them.
          </p>
        </div>
      ) : (
        BUCKETS.map((b) => {
          const list = grouped[b.key];
          if (!list || list.length === 0) return null;
          return (
            <Section key={b.key} title={`${b.title} · ${list.length}`}>
              <ul className="space-y-2.5">
                {list.map((o) => (
                  <OrderCard key={o.id} o={o} flash={flashId === o.id} />
                ))}
              </ul>
            </Section>
          );
        })
      )}

      <CompletedOrders />
    </AppScreen>
  );
}

const STATUS_LABEL: Record<Status, { label: string; tint: string; icon: any }> = {
  pending_credit_review: { label: "Pending credit review", tint: "text-amber-300", icon: Loader2 },
  approved: { label: "Approved", tint: "text-emerald", icon: ShieldCheck },
  rejected: { label: "Rejected", tint: "text-destructive", icon: XCircle },
  packed: { label: "Packed", tint: "text-emerald", icon: PackageIcon },
  ready_for_pickup: { label: "Ready for pickup", tint: "text-emerald", icon: PackageCheck },
  delivered: { label: "Delivered", tint: "text-ink-muted", icon: Truck },
};

const REC_TINT: Record<string, string> = {
  approve: "bg-emerald/15 text-emerald border-emerald/30",
  review: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  reject: "bg-destructive/15 text-destructive border-destructive/30",
};

function OrderCard({ o, flash }: { o: DbOrder; flash: boolean }) {
  const meta = STATUS_LABEL[o.status];
  const Icon = meta.icon;
  const spin = o.status === "pending_credit_review";
  const ring = flash ? "ring-2 ring-emerald shadow-[0_0_24px_rgba(16,185,129,0.35)]" : "";
  const border = o.status === "pending_credit_review" ? "border-amber-400/50 bg-amber-400/[0.05]"
    : o.status === "rejected" ? "border-destructive/50 bg-destructive/[0.06]"
    : o.status === "delivered" ? "border-border bg-elevated/40 opacity-80"
    : "border-emerald/30 bg-elevated/70";

  return (
    <li className={`rounded-2xl border ${border} ${ring} p-3.5 transition-all duration-300`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-emerald" />
            <span className="text-[10px] uppercase tracking-[0.14em] text-emerald font-semibold">
              {o.source.replace(/_/g, " ")}
            </span>
            {flash && <Volume2 className="h-3 w-3 text-emerald animate-pulse" />}
          </div>
          <div className="mt-0.5 font-display text-[14px] font-semibold truncate">{o.customer_name}</div>
          {o.phone && <div className="text-[10.5px] text-ink-muted truncate">{o.phone}</div>}
        </div>
        <div className="text-right">
          <div className="font-display text-[15px] font-semibold">{o.amount != null ? formatINR(Number(o.amount)) : "—"}</div>
          {o.trust_score != null && (
            <div className="text-[10px] text-emerald font-semibold">Trust {Math.round(Number(o.trust_score))}</div>
          )}
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {o.items.map((it, i) => (
          <li key={i} className="rounded-full bg-surface border border-border px-2 py-0.5 text-[11px]">
            {it.quantity} {it.unit ?? "pcs"} {it.name}
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${meta.tint}`}>
          <Icon className={`h-3.5 w-3.5 ${spin ? "animate-spin" : ""}`} />
          {meta.label}
        </span>
        <div className="text-[10px] text-ink-subtle">{new Date(o.created_at).toLocaleTimeString()}</div>
      </div>

      {(o.credit_recommendation || o.decision_reason) && (
        <div className="mt-2 rounded-xl border border-border/60 bg-surface/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Financial brain</span>
            {o.credit_recommendation && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${REC_TINT[o.credit_recommendation] ?? "border-border text-ink-muted"}`}>
                {o.credit_recommendation}
              </span>
            )}
          </div>
          {o.decision_reason && (
            <p className="mt-1 text-[11.5px] leading-snug text-ink-muted">{o.decision_reason}</p>
          )}
        </div>
      )}

      <ActionButtons orderId={o.id} status={o.status} />
    </li>
  );
}

const NEXT_LABEL: Partial<Record<Status, { next: Status; label: string }>> = {
  approved: { next: "packed", label: "Mark packed" },
  packed: { next: "ready_for_pickup", label: "Mark ready for pickup" },
  ready_for_pickup: { next: "delivered", label: "Mark delivered" },
};

function ActionButtons({ orderId, status }: { orderId: string; status: Status }) {
  const [busy, setBusy] = useState(false);

  async function send(next: Status) {
    setBusy(true);
    try {
      await fetch("/api/khataos/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: next }),
      });
    } finally { setBusy(false); }
  }

  if (status === "pending_credit_review") {
    return (
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => send("rejected")}
          disabled={busy}
          className="flex-1 rounded-full border border-border bg-surface py-2 text-[12.5px] font-semibold disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => send("approved")}
          disabled={busy}
          className="flex-1 rounded-full bg-emerald py-2 text-[12.5px] font-semibold text-[#06140b] disabled:opacity-50"
        >
          {busy ? "Updating…" : "Approve order"}
        </button>
      </div>
    );
  }

  const step = NEXT_LABEL[status];
  if (!step) return null;
  return (
    <button
      onClick={() => send(step.next)}
      disabled={busy}
      className="mt-3 w-full rounded-full bg-emerald py-2 text-[12.5px] font-semibold text-[#06140b] disabled:opacity-50"
    >
      {busy ? "Updating…" : step.label}
    </button>
  );
}

const NEXT: Record<Order["status"], Order["status"] | null> = {
  pending: "packed", packed: "ready", ready: "delivered", delivered: null,
};
const LABEL: Record<Order["status"], string> = {
  pending: "Pack", packed: "Mark ready", ready: "Mark delivered", delivered: "Delivered ✓",
};

function CompletedOrders() {
  const { orders, customers } = useKhata((s) => s);
  if (orders.length === 0) return null;
  return (
    <Section title={`Counter orders · ${orders.length}`}>
      <ul className="space-y-3">
        {orders.map((o) => {
          const c = customers.find((x) => x.id === o.customerId)!;
          const next = NEXT[o.status];
          return (
            <li key={o.id} className="rounded-2xl border border-border bg-elevated/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <PackageIcon className="h-3 w-3 text-ink-muted" />
                    <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">Counter order</span>
                  </div>
                  <div className="mt-0.5 font-display text-[14px] font-semibold">{c.name}</div>
                  <div className="text-[11px] text-ink-muted">{c.phone}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[15px] font-semibold">{formatINR(o.amount)}</div>
                  <div className={`text-[11px] font-medium ${o.onCredit ? "text-amber-300" : "text-emerald"}`}>
                    {o.onCredit ? "On khata" : "Cash"}
                  </div>
                </div>
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
    </Section>
  );
}
