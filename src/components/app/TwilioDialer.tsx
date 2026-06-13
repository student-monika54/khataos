// Real Twilio outbound dialer. Creates a call via REST API and polls status.
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Loader2, Radio, AlertCircle, CheckCircle2 } from "lucide-react";

type TwilioStatus =
  | "queued" | "initiated" | "ringing" | "in-progress"
  | "completed" | "busy" | "failed" | "no-answer" | "canceled";

const PHASE_LABEL: Record<string, string> = {
  queued: "Queued at Twilio",
  initiated: "Initiated",
  ringing: "Ringing",
  "in-progress": "Connected",
  completed: "Ended",
  busy: "Busy", failed: "Failed", "no-answer": "No answer", canceled: "Canceled",
};

const ACTIVE = new Set<TwilioStatus>(["queued", "initiated", "ringing", "in-progress"]);

export function TwilioDialer({ defaultTo }: { defaultTo?: string }) {
  const [to, setTo] = useState(defaultTo ?? "");
  const [mediaStream, setMediaStream] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [sid, setSid] = useState<string | null>(null);
  const [status, setStatus] = useState<TwilioStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ from?: string; duration?: string } | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  async function place() {
    setError(null); setStatus(null); setSid(null); setMeta(null);
    setPlacing(true);
    try {
      const res = await fetch("/api/khataos/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, mediaStream }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to place call"); return; }
      setSid(data.sid);
      setStatus(data.status as TwilioStatus);
      setMeta({ from: data.from });
      startPolling(data.sid);
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally { setPlacing(false); }
  }

  function startPolling(callSid: string) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/khataos/outbound?sid=${callSid}`);
        const d = await r.json();
        if (d.status) setStatus(d.status);
        setMeta({ from: d.from, duration: d.duration });
        if (!ACTIVE.has(d.status)) {
          if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch {}
    }, 1500) as unknown as number;
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
    <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/60 p-4">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-emerald" />
        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-emerald">Real Twilio call</div>
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">
        Places an outbound call via Twilio Voice REST API. The dialed number rings, Twilio fetches our TwiML, and the AI pipeline runs the conversation.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="+91XXXXXXXXXX"
          inputMode="tel"
          className="flex-1 rounded-xl border border-border bg-background/60 px-3 py-2 text-[13px] font-mono outline-none focus:border-emerald/60"
          disabled={!!isActive}
        />
        <button
          onClick={isActive ? hangup : place}
          disabled={placing || (!isActive && !/^\+\d{8,15}$/.test(to))}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold disabled:opacity-50 ${
            isActive ? "bg-destructive text-white" : "bg-emerald text-[#06140b]"
          }`}
        >
          {placing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isActive ? <PhoneOff className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
          {isActive ? "End" : "Dial"}
        </button>
      </div>

      <label className="mt-2 flex items-center gap-2 text-[11px] text-ink-muted">
        <input type="checkbox" checked={mediaStream} onChange={(e) => setMediaStream(e.target.checked)} className="accent-emerald" />
        Enable Media Streams (forks live audio over WSS to TWILIO_MEDIA_STREAM_WSS)
      </label>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-[11.5px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {status && (
        <div className="mt-3 rounded-xl border border-border bg-background/50 p-3 text-[12px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ACTIVE.has(status) ? (
                <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
              ) : status === "completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className="font-semibold">{PHASE_LABEL[status] ?? status}</span>
            </div>
            {meta?.duration && <span className="text-ink-subtle">{meta.duration}s</span>}
          </div>
          {sid && <div className="mt-1 font-mono text-[10px] text-ink-subtle truncate">CallSid: {sid}</div>}
          {meta?.from && <div className="text-[10.5px] text-ink-subtle">From {meta.from}</div>}
          <div className="mt-2 grid grid-cols-4 gap-1 text-[9.5px] uppercase tracking-[0.12em]">
            {(["initiated", "ringing", "in-progress", "completed"] as TwilioStatus[]).map((s) => {
              const order: TwilioStatus[] = ["queued", "initiated", "ringing", "in-progress", "completed"];
              const done = order.indexOf(status) >= order.indexOf(s);
              return (
                <div key={s} className={`rounded-md border px-1.5 py-1 text-center ${
                  done ? "border-emerald/40 bg-emerald/10 text-emerald" : "border-border text-ink-subtle"
                }`}>{s.replace("-", " ")}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
