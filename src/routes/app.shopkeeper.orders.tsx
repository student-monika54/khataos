// Incoming Orders — the operational heart of the shopkeeper app.
// Shows every order arriving from the KhataOS voice agent, grouped by
// stage: New → Pending Credit → Approved → Ready for Fulfillment →
// Completed. Updates in real time via the live-orders polling endpoint.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useKhata, formatINR, setOrderStatus } from "@/lib/khataos/data";
import type { Order } from "@/lib/khataos/data";
import {
  Phone, Sparkles, CheckCircle2, XCircle, Loader2, AlertCircle, Volume2,
  Package as PackageIcon,
} from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/orders")({
  component: IncomingOrders,
});

type LiveStage =
  | "listening" | "processing" | "checking_credit"
  | "approved" | "rejected" | "conditional" | "ready_for_fulfillment";
type LiveItem = { name: string; quantity: string };
type LiveOrder = {
  id: string; callId: string; customerId: string; customerName: string; phone?: string;
  items: LiveItem[]; amount?: number; trustScore?: number;
  outstanding?: number; creditLimit?: number;
  stage: LiveStage; decision?: "approve" | "reject" | "conditional";
  reasoning?: string; language?: string; createdAt: number; updatedAt: number;
};

const BUCKETS: { key: string; title: string; match: (s: LiveStage) => boolean; tone: string }[] = [
  { key: "new", title: "New voice orders", match: (s) => s === "listening" || s === "processing", tone: "text-emerald" },
  { key: "credit", title: "Pending credit approval", match: (s) => s === "checking_credit", tone: "text-amber-300" },
  { key: "approved", title: "Approved", match: (s) => s === "approved", tone: "text-emerald" },
  { key: "rejected", title: "Rejected", match: (s) => s === "rejected", tone: "text-destructive" },
  { key: "ready", title: "Ready for fulfillment", match: (s) => s === "ready_for_fulfillment", tone: "text-emerald" },
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
  const [live, setLive] = useState<LiveOrder[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const known = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const r = await fetch("/api/khataos/orders/live");
        if (!r.ok) return;
        const data: LiveOrder[] = await r.json();
        if (!mounted) return;
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
        setLive(data);
      } catch {}
    }
    poll();
    const id = setInterval(poll, 900);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, LiveOrder[]> = {};
    for (const b of BUCKETS) map[b.key] = [];
    for (const o of live) {
      const b = BUCKETS.find((x) => x.match(o.stage));
      if (b) map[b.key].push(o);
    }
    return map;
  }, [live]);

  const totalLive = live.length;
  const inFlight = live.filter((o) => o.stage === "checking_credit" || o.stage === "processing").length;

  return (
    <AppScreen>
      <AppHeader
        title="Incoming Orders"
        subtitle={totalLive > 0 ? `${totalLive} from voice agent · ${inFlight} in progress` : "Live from the KhataOS voice agent"}
      />

      {/* Pipeline overview */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/10 to-emerald/[0.02] p-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald">Real-time pipeline</span>
          </div>
          <ol className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px] text-ink-muted">
            {["Call", "Extracted", "Credit", "Decision", "Fulfill"].map((s) => (
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
                  <LiveOrderCard key={o.id} o={o} flash={flashId === o.id} />
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

function LiveOrderCard({ o, flash }: { o: LiveOrder; flash: boolean }) {
  const approved = o.stage === "approved" || o.stage === "ready_for_fulfillment";
  const rejected = o.stage === "rejected";
  const conditional = o.stage === "conditional";
  const ring = flash ? "ring-2 ring-emerald shadow-[0_0_24px_rgba(16,185,129,0.35)]" : "";
  const border = approved ? "border-emerald/50 bg-emerald/[0.06]"
    : rejected ? "border-destructive/50 bg-destructive/[0.06]"
    : conditional ? "border-amber-500/50 bg-amber-500/[0.06]"
    : "border-emerald/30 bg-elevated/70";

  return (
    <li className={`rounded-2xl border ${border} ${ring} p-3.5 transition-all duration-300`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-emerald" />
            <span className="text-[10px] uppercase tracking-[0.14em] text-emerald font-semibold">Voice order</span>
            {flash && <Volume2 className="h-3 w-3 text-emerald animate-pulse" />}
          </div>
          <div className="mt-0.5 font-display text-[14px] font-semibold truncate">{o.customerName}</div>
          {o.phone && <div className="text-[10.5px] text-ink-muted truncate">{o.phone}</div>}
        </div>
        <div className="text-right">
          <div className="font-display text-[15px] font-semibold">{o.amount ? formatINR(o.amount) : "—"}</div>
          {o.trustScore != null && <div className="text-[10px] text-emerald font-semibold">Trust {o.trustScore}</div>}
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {o.items.map((it, i) => (
          <li key={i} className="rounded-full bg-surface border border-border px-2 py-0.5 text-[11px]">
            {it.quantity} {it.name}
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <StageBadge stage={o.stage} />
        <div className="text-[10px] text-ink-subtle">{new Date(o.createdAt).toLocaleTimeString()}</div>
      </div>

      {o.reasoning && (
        <p className="mt-2 text-[11.5px] leading-snug text-ink-muted">
          <span className="text-emerald font-semibold">Why: </span>{o.reasoning}
        </p>
      )}
    </li>
  );
}

const STAGE_LABEL: Record<LiveStage, string> = {
  listening: "Listening",
  processing: "Extracting order",
  checking_credit: "Checking credit",
  approved: "Approved",
  conditional: "Conditional",
  rejected: "Rejected",
  ready_for_fulfillment: "Ready for fulfillment",
};

function StageBadge({ stage }: { stage: LiveStage }) {
  const map: Record<LiveStage, { icon: any; tint: string }> = {
    listening: { icon: Loader2, tint: "text-ink-muted" },
    processing: { icon: Loader2, tint: "text-emerald" },
    checking_credit: { icon: Loader2, tint: "text-amber-300" },
    approved: { icon: CheckCircle2, tint: "text-emerald" },
    ready_for_fulfillment: { icon: CheckCircle2, tint: "text-emerald" },
    rejected: { icon: XCircle, tint: "text-destructive" },
    conditional: { icon: AlertCircle, tint: "text-amber-400" },
  };
  const { icon: Icon, tint } = map[stage];
  const spinning = stage === "checking_credit" || stage === "processing" || stage === "listening";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${tint}`}>
      <Icon className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} />
      {STAGE_LABEL[stage]}
    </span>
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
    <Section title={`Today's orders · ${orders.length}`}>
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
