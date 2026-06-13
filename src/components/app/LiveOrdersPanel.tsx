// LiveOrdersPanel — polls /api/khataos/orders/live and shows real-time
// voice orders with stage progression. Plays a soft chime when a new
// order arrives. Designed for the shopkeeper dashboard + live monitor.

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Phone, Sparkles, Volume2 } from "lucide-react";
import { formatINR } from "@/lib/khataos/data";

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

const STAGE_LABEL: Record<LiveOrderStage, string> = {
  listening: "Listening",
  processing: "Processing order",
  checking_credit: "Checking credit",
  approved: "Approved",
  conditional: "Conditional",
  rejected: "Rejected",
  ready_for_fulfillment: "Ready for fulfillment",
};

const STAGES_ORDER: LiveOrderStage[] = [
  "listening", "processing", "checking_credit", "ready_for_fulfillment",
];

function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.36);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

export function LiveOrdersPanel({ compact = false }: { compact?: boolean }) {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const r = await fetch("/api/khataos/orders/live");
        if (!r.ok) return;
        const data: LiveOrder[] = await r.json();
        if (!mounted) return;
        // Detect brand-new orders → chime + flash
        if (!firstLoad.current) {
          const newOnes = data.filter((o) => !knownIds.current.has(o.id));
          if (newOnes.length > 0) {
            playChime();
            setFlashId(newOnes[0].id);
            setTimeout(() => setFlashId(null), 1800);
          }
        }
        data.forEach((o) => knownIds.current.add(o.id));
        firstLoad.current = false;
        setOrders(data);
      } catch {}
    }
    poll();
    const id = setInterval(poll, 900);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-5 text-center">
        <Phone className="mx-auto h-5 w-5 text-emerald" />
        <div className="mt-2 font-display text-[13px] font-semibold">No live voice orders yet</div>
        <p className="mt-1 text-[11px] text-ink-muted">When a customer places an order over the phone, it will appear here in real time.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {orders.slice(0, compact ? 3 : 8).map((o) => (
        <OrderCard key={o.id} o={o} flash={flashId === o.id} />
      ))}
    </ul>
  );
}

function OrderCard({ o, flash }: { o: LiveOrder; flash: boolean }) {
  const pending = o.stage === "checking_credit" || o.stage === "processing" || o.stage === "listening";
  const approved = o.stage === "ready_for_fulfillment" || o.stage === "approved";
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
          <div className="font-display text-[15px] font-semibold">
            {o.amount ? formatINR(o.amount) : "—"}
          </div>
          {o.trustScore != null && (
            <div className="text-[10px] text-emerald font-semibold">Trust {o.trustScore}</div>
          )}
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {o.items.map((it, i) => (
          <li key={i} className="rounded-full bg-surface border border-border px-2 py-0.5 text-[11px]">
            {it.quantity} {it.name}
          </li>
        ))}
      </ul>

      <StageStrip stage={o.stage} />

      <div className="mt-2 flex items-center justify-between gap-2">
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

function StageStrip({ stage }: { stage: LiveOrderStage }) {
  const idx = stage === "rejected" ? STAGES_ORDER.length - 1
    : stage === "conditional" ? STAGES_ORDER.length - 1
    : Math.max(0, STAGES_ORDER.indexOf(stage));
  return (
    <div className="mt-2.5 grid grid-cols-4 gap-1">
      {STAGES_ORDER.map((s, i) => {
        const done = i <= idx;
        const tone = stage === "rejected" && i === idx ? "bg-destructive"
          : stage === "conditional" && i === idx ? "bg-amber-400"
          : done ? "bg-emerald"
          : "bg-border";
        return <div key={s} className={`h-1 rounded-full ${tone} ${i === idx ? "animate-pulse" : ""}`} />;
      })}
    </div>
  );
}

function StageBadge({ stage }: { stage: LiveOrderStage }) {
  const map: Record<LiveOrderStage, { icon: any; tint: string }> = {
    listening: { icon: Loader2, tint: "text-ink-muted" },
    processing: { icon: Loader2, tint: "text-emerald" },
    checking_credit: { icon: Loader2, tint: "text-emerald" },
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
