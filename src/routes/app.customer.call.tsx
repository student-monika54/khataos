// Customer Call tab — companion dashboard ONLY.
// All voice interactions happen on the actual Twilio phone call.
// This screen never simulates a call locally: it offers a single CTA
// that either places a real outbound Twilio call to the customer's number
// or hands off to the device dialer via tel:.

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useKhata } from "@/lib/khataos/data";
import { useCalls } from "@/lib/khataos/calls";
import {
  Phone, PhoneCall, CheckCircle2, Clock, Radio, History,
  ShoppingBag, CreditCard, Loader2, AlertCircle, PhoneOff,
} from "lucide-react";

export const Route = createFileRoute("/app/customer/call")({ component: CallScreen });

// KhataOS inbound number. Customers can also dial this directly.
const KHATAOS_NUMBER = "+91 80000 11122";
const KHATAOS_DIAL = "+918000011122";

type TwilioStatus =
  | "queued" | "initiated" | "ringing" | "in-progress"
  | "completed" | "busy" | "failed" | "no-answer" | "canceled";
const ACTIVE = new Set<TwilioStatus>(["queued", "initiated", "ringing", "in-progress"]);
const STATUS_LABEL: Record<string, string> = {
  queued: "Queued", initiated: "Initiated", ringing: "Ringing",
  "in-progress": "On call", completed: "Call ended",
  busy: "Busy", failed: "Failed", "no-answer": "No answer", canceled: "Canceled",
};

function relTime(t: number) {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CallScreen() {
  const customers = useKhata((s) => s.customers);
  const meId = useKhata((s) => s.me.id);
  const me = useMemo(() => customers.find((c) => c.id === meId)!, [customers, meId]);
  const allCalls = useCalls((s) => s);

  const myCalls = useMemo(
    () => allCalls.filter((c) => c.customerId === me.id || c.customerName === me.name).slice(0, 5),
    [allCalls, me.id, me.name],
  );

  const lastOrderTurn = useMemo(() => {
    for (const c of allCalls) {
      const t = [...c.transcript].reverse().find(
        (x) => x.intent === "KHATA_ORDER" || x.templateId === "ORDER_CONFIRMATION",
      );
      if (t) return { call: c, turn: t };
    }
    return null;
  }, [allCalls]);

  const lastCreditTurn = useMemo(() => {
    for (const c of allCalls) {
      const t = [...c.transcript].reverse().find((x) => x.decision);
      if (t) return { call: c, turn: t };
    }
    return null;
  }, [allCalls]);

  // Real Twilio outbound state
  const [placing, setPlacing] = useState(false);
  const [sid, setSid] = useState<string | null>(null);
  const [status, setStatus] = useState<TwilioStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  async function placeCall() {
    setError(null); setStatus(null); setSid(null);
    const to = me.phone?.startsWith("+") ? me.phone.replace(/\s+/g, "") : "";
    if (!to) {
      // No phone on file → fall back to launching device dialer to KhataOS number.
      window.location.href = `tel:${KHATAOS_DIAL}`;
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/khataos/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Twilio not configured → seamlessly fall back to tel:
        if (/twilio|not configured|missing/i.test(data.error ?? "")) {
          window.location.href = `tel:${KHATAOS_DIAL}`;
          return;
        }
        setError(data.error ?? "Could not start call");
        return;
      }
      setSid(data.sid);
      setStatus(data.status as TwilioStatus);
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        try {
          const r = await fetch(`/api/khataos/outbound?sid=${data.sid}`);
          const d = await r.json();
          if (d.status) setStatus(d.status);
          if (!ACTIVE.has(d.status)) {
            if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
          }
        } catch {}
      }, 1500) as unknown as number;
    } catch (e: any) {
      // Network / fetch error → fall back to native dialer so the customer can still call.
      window.location.href = `tel:${KHATAOS_DIAL}`;
    } finally {
      setPlacing(false);
    }
  }

  async function hangup() {
    if (!sid) return;
    try {
      await fetch("/api/khataos/outbound/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid }),
      });
    } catch {}
  }

  const isActive = status && ACTIVE.has(status);

  return (
    <AppScreen>
      <AppHeader title="Voice Commerce" subtitle="Talk to KhataOS to order, check balance, request credit" />
      <div className="px-4 pt-3 space-y-4 pb-6">
        {/* ============ Big Call CTA ============ */}
        <div className="rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/15 via-emerald/5 to-transparent p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald">
            <Radio className="h-3 w-3 animate-pulse" /> Voice agent online
          </div>
          <div className="mt-2 font-display text-xl">Place orders by talking</div>
          <p className="mt-1 text-[12px] text-ink-muted">
            Tap below — KhataOS will call your phone. Say what you need in your language: "do kilo atta",
            "balance kitna hai", "500 rupaye udhaar". The agent confirms credit and notifies the shopkeeper.
          </p>

          <button
            onClick={isActive ? hangup : placeCall}
            disabled={placing}
            className={`mt-4 w-full rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 ${
              isActive ? "bg-destructive text-white" : "bg-emerald text-[#06140b]"
            }`}
          >
            {placing ? <Loader2 className="h-5 w-5 animate-spin" />
              : isActive ? <PhoneOff className="h-5 w-5" />
              : <Phone className="h-5 w-5" />}
            {placing ? "Connecting…" : isActive ? "End call" : "Call KhataOS"}
          </button>

          <a
            href={`tel:${KHATAOS_DIAL}`}
            className="mt-2 block text-center text-[11px] text-ink-muted hover:text-emerald"
          >
            Or dial directly · <span className="font-mono text-ink">{KHATAOS_NUMBER}</span>
          </a>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-[11.5px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {status && (
            <div className="mt-3 rounded-xl border border-border bg-background/50 p-3 text-[12px]">
              <div className="flex items-center gap-2">
                {ACTIVE.has(status) ? (
                  <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
                ) : status === "completed" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span className="font-semibold">{STATUS_LABEL[status] ?? status}</span>
              </div>
              {sid && <div className="mt-1 font-mono text-[10px] text-ink-subtle truncate">CallSid: {sid}</div>}
              <p className="mt-2 text-[11px] text-ink-muted">
                Pick up your phone — the agent will guide you in English, हिंदी or ಕನ್ನಡ.
              </p>
            </div>
          )}

          <div className="mt-3 text-center text-[10.5px] text-ink-subtle">
            English · हिंदी · ಕನ್ನಡ · 24/7
          </div>
        </div>

        {/* ============ Last voice order ============ */}
        <Section
          title="Last order from voice"
          action={<Link to="/app/customer/orders" className="text-[11px] text-emerald">View all</Link>}
        >
          {lastOrderTurn ? (
            <div className="rounded-2xl border border-border bg-elevated p-3.5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-emerald">
                <ShoppingBag className="h-3 w-3" /> via voice call
              </div>
              <div className="mt-1.5 text-[13px]">{lastOrderTurn.turn.text}</div>
              <div className="mt-1 text-[10.5px] text-ink-muted">
                {relTime(lastOrderTurn.turn.at)} · {lastOrderTurn.call.language ?? "—"}
              </div>
            </div>
          ) : (
            <EmptyTile icon={ShoppingBag} label="No voice orders yet. Tap Call KhataOS and say what you need." />
          )}
        </Section>

        {/* ============ Last credit decision ============ */}
        <Section title="Last credit decision">
          {lastCreditTurn ? (
            <div className={`rounded-2xl border p-3.5 ${
              lastCreditTurn.turn.decision === "approve" ? "border-emerald/30 bg-emerald/10"
              : lastCreditTurn.turn.decision === "conditional" ? "border-amber-400/30 bg-amber-500/10"
              : "border-destructive/30 bg-destructive/10"
            }`}>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em]">
                <CreditCard className="h-3 w-3" /> Financial brain · {lastCreditTurn.turn.decision}
              </div>
              <div className="mt-1.5 text-[12.5px]">
                {lastCreditTurn.turn.reasoning ?? lastCreditTurn.turn.text}
              </div>
              <div className="mt-1 text-[10.5px] text-ink-muted">{relTime(lastCreditTurn.turn.at)}</div>
            </div>
          ) : (
            <EmptyTile icon={CreditCard} label="No credit decisions yet." />
          )}
        </Section>

        {/* ============ Recent calls ============ */}
        <Section
          title="Recent calls"
          action={myCalls.length ? <span className="text-[10px] text-ink-subtle">{myCalls.length}</span> : null}
        >
          {myCalls.length ? (
            <ul className="space-y-2">
              {myCalls.map((c) => (
                <li key={c.id} className="rounded-2xl border border-border bg-elevated/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-full grid place-items-center ${
                        c.state === "completed" ? "bg-emerald/15 text-emerald" : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {c.state === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div className="text-[12.5px] font-medium capitalize">
                          {(c.currentIntent ?? "voice call").toLowerCase().replace(/_/g, " ")}
                        </div>
                        <div className="text-[10.5px] text-ink-muted">
                          {c.language ?? "—"} · {relTime(c.startedAt)}
                          {c.durationSec ? ` · ${c.durationSec}s` : ""}
                        </div>
                      </div>
                    </div>
                    {c.outcome && (
                      <span className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
                        {c.outcome.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  {c.summary && <p className="mt-1.5 text-[11.5px] text-ink-muted line-clamp-2">{c.summary}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyTile icon={History} label="No call history yet." />
          )}
        </Section>

        <div className="text-center text-[10.5px] text-ink-subtle pt-1">
          <PhoneCall className="inline h-3 w-3 mr-1" />
          All voice interactions happen on the phone call — this screen just tracks them.
        </div>
      </div>
    </AppScreen>
  );
}

function EmptyTile({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-4 text-center">
      <Icon className="h-4 w-4 text-ink-subtle inline-block" />
      <p className="mt-1 text-[11.5px] text-ink-muted">{label}</p>
    </div>
  );
}
