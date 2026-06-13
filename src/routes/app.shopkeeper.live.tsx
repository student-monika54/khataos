import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader, AppScreen, Section, StatCard } from "@/components/app/AppShell";
import { CopilotDrawer } from "@/components/app/CopilotDrawer";
import { AgentTimeline, stagesUpTo } from "@/components/app/AgentTimeline";
import { LiveOrdersPanel } from "@/components/app/LiveOrdersPanel";
import { useEffect, useState } from "react";
import { AGENT_META, type CallRecord, type TranscriptTurn } from "@/lib/khataos/calls";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { Activity, Phone, AlertCircle, ShieldCheck, CheckCircle2, XCircle, Bug } from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/live")({ component: LiveView });

function LiveView() {
  const [call, setCall] = useState<CallRecord | null>(null);
  const customers = useKhata((s) => s.customers);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const r = await fetch("/api/khataos/calls?active=1");
        if (r.ok) {
          const data = await r.json();
          if (mounted) setCall(data);
        }
      } catch {}
    }
    poll();
    const id = setInterval(poll, 800);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (!call) {
    return (
      <AppScreen>
        <AppHeader title="Live calls" subtitle="Realtime monitor" />
        <div className="px-4 pt-6 space-y-4">
          <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-6 text-center">
            <Activity className="mx-auto h-6 w-6 text-emerald" />
            <h3 className="mt-3 font-display text-base font-semibold">No active calls</h3>
            <p className="mt-1 text-[12px] text-ink-muted">When a customer dials KhataOS, you'll see live transcript, intent, AI copilot, and pipeline activity here.</p>
            <Link to="/app/customer/call" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-[12px] font-semibold text-[#06140b]">
              <Phone className="h-3.5 w-3.5" /> Trigger demo call
            </Link>
          </div>
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Live voice orders</div>
            <LiveOrdersPanel />
          </div>
        </div>
      </AppScreen>
    );
  }

  const customer = customers.find((c) => c.id === call.customerId);
  const lastAgentTurn = [...call.transcript].reverse().find((t) => t.role === "agent");
  const decision = lastAgentTurn?.decision;
  const dur = Math.round(((call.endedAt ?? Date.now()) - call.startedAt) / 1000);

  return (
    <AppScreen>
      <AppHeader title="Live call" subtitle={`${customer?.name ?? call.customerName} · ${dur}s`} right={
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-emerald">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" /> {call.state}
        </span>
      } />
      <div className="px-4 pt-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Trust score" value={String(customer?.trustScore ?? "—")} accent />
          <StatCard label="Outstanding" value={formatINR(customer?.outstanding ?? 0)} />
          <StatCard label="Credit limit" value={formatINR(customer?.creditLimit ?? 0)} />
          <StatCard label="Risk" value={(customer?.riskTag ?? "low").toUpperCase()} />
        </div>

        <div className="rounded-2xl border border-emerald/40 bg-emerald/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.14em] text-emerald">Selected language · locked for call</div>
            <span className="rounded-full bg-emerald px-2 py-0.5 text-[10px] font-bold text-[#06140b]">IVR</span>
          </div>
          <div className="mt-1 font-display text-xl font-semibold text-emerald">{call.language ?? "Pending menu selection…"}</div>
          <p className="mt-1 text-[11px] text-ink-muted">Caller chose via DTMF (1=English, 2=Hindi, 3=Kannada). Press 9 on the phone to switch.</p>
        </div>

        <div className="rounded-2xl border border-border bg-elevated/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Current intent · agent · template</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold text-emerald">{call.currentIntent ?? "—"}</span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold">{call.currentAgent ? AGENT_META[call.currentAgent].label : "—"}</span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px]">{lastAgentTurn?.templateId ?? "—"}</span>
          </div>
          {call.recommendation && (
            <p className="mt-2 text-[12.5px] leading-snug text-ink"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald" />{call.recommendation}</p>
          )}
          {decision && (
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              decision === "approve" ? "bg-emerald/15 text-emerald" :
              decision === "reject" ? "bg-destructive/15 text-destructive" :
              "bg-amber-500/15 text-amber-400"
            }`}>
              {decision === "approve" ? <CheckCircle2 className="h-3 w-3" /> :
               decision === "reject" ? <XCircle className="h-3 w-3" /> :
               <AlertCircle className="h-3 w-3" />} {decision.toUpperCase()}
            </div>
          )}
        </div>

        <CopilotDrawer customer={customer} intent={call.currentIntent} />

        <AgentTimeline
          active={undefined}
          completed={stagesUpTo("tts")}
          intent={call.currentIntent}
        />
      </div>

      <Section title="Live voice orders">
        <LiveOrdersPanel />
      </Section>

      <Section title="Pipeline debug · latest customer turn">
        <DebugCard turn={[...call.transcript].reverse().find((t) => t.role === "customer")} agentTurn={lastAgentTurn} />
      </Section>

      <Section title="Per-turn trace (rolling)">
        <div className="rounded-2xl border border-emerald/20 bg-elevated/60 p-3 text-[11px]">
          <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
            Stage-by-stage routing
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto_auto_auto] gap-x-2 gap-y-1 font-mono">
            <div className="text-ink-subtle">Transcript</div>
            <div className="text-ink-subtle text-right">Lang</div>
            <div className="text-ink-subtle text-right">L-conf</div>
            <div className="text-ink-subtle text-right">Intent</div>
            <div className="text-ink-subtle text-right">I-conf</div>
            <div className="text-ink-subtle text-right">Agent</div>
            <div className="text-ink-subtle text-right">Template</div>
            <div className="text-ink-subtle text-right">FB</div>
            {call.transcript.slice(-8).map((t, i) => (
              <FragmentRow key={i} t={t} />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Live transcript">
        <ul className="space-y-2">
          {call.transcript.slice(-8).map((t, i) => (
            <li key={i} className={`flex ${t.role === "customer" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug ${
                t.role === "customer" ? "bg-emerald text-[#06140b]" : "bg-elevated border border-border"
              }`}>
                {t.role === "agent" && t.templateId && (
                  <div className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-emerald">
                    {t.templateId}{t.templateLang ? ` · ${t.templateLang}` : ""}
                  </div>
                )}
                {t.text}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </AppScreen>
  );
}

function FragmentRow({ t }: { t: TranscriptTurn }) {
  const isCust = t.role === "customer";
  const fb = t.fallback || t.noIntentMatch;
  return (
    <>
      <div className={`truncate ${isCust ? "text-ink" : "text-emerald"}`}>
        <span className="mr-1 opacity-60">{isCust ? "U›" : "A›"}</span>{t.text}
      </div>
      <div className="text-right text-ink-muted">{t.language ?? "—"}</div>
      <div className="text-right text-ink-muted">{t.languageConfidence ? t.languageConfidence.toFixed(2) : "—"}</div>
      <div className="text-right text-ink-muted">
        {t.noIntentMatch ? <span className="text-amber-400">NO_INTENT_MATCH</span> : (t.intent ?? "—")}
      </div>
      <div className="text-right text-ink-muted">{t.intentConfidence ? t.intentConfidence.toFixed(2) : "—"}</div>
      <div className="text-right text-ink-muted">{t.agent ?? "—"}</div>
      <div className="text-right text-ink-muted">{t.templateId ? `${t.templateId}${t.templateLang ? `:${t.templateLang}` : ""}` : "—"}</div>
      <div className="text-right">{fb ? <span className="text-amber-400 font-semibold">YES</span> : <span className="text-ink-subtle">no</span>}</div>
    </>
  );
}

function DebugCard({ turn, agentTurn }: { turn?: TranscriptTurn; agentTurn?: TranscriptTurn }) {
  if (!turn) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-4 text-center text-[12px] text-ink-muted">
        Waiting for first customer utterance…
      </div>
    );
  }
  const noMatch = turn.noIntentMatch || turn.intent === "UNKNOWN";
  const fallbackFired = !!agentTurn?.fallback;
  const lang = turn.language ?? "—";
  const expectedStt = turn.expectedSttLocale
    ?? (lang === "Hindi" || lang === "Hinglish" ? "hi-IN"
        : lang === "Kannada" ? "kn-IN" : lang === "English" ? "en-IN" : "—");
  const actualStt = turn.sttLocale ?? "—";
  const sttModel = turn.sttModel ?? "—";
  const sttMatch = actualStt === expectedStt;
  const voiceLabel = lang === "Hindi" || lang === "Hinglish" ? "Polly.Aditi (hi-IN)"
    : lang === "Kannada" ? "Google.kn-IN-Standard-A (kn-IN)"
    : lang === "English" ? "Polly.Raveena (en-IN)" : "—";
  const items = turn.items ?? [];
  const rawT = turn.rawTranscript ?? turn.text;
  const tLen = turn.transcriptLength ?? rawT.length;
  const sConf = turn.speechConfidence;
  const provider = turn.sttProvider ?? "twilio";
  const dgOnline = provider === "deepgram";
  const rows: [string, React.ReactNode][] = [
    ["Speech Provider", dgOnline
      ? <span className="rounded-md bg-emerald/15 px-2 py-0.5 text-emerald font-semibold">DEEPGRAM ✓ Connected</span>
      : <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-400 font-semibold">TWILIO (Deepgram offline)</span>],
    ["Deepgram Model", <span className="text-ink">{turn.deepgramModel ?? "—"}</span>],
    ["Deepgram Language", <span className="text-ink">{turn.deepgramLanguage ?? "—"}{turn.deepgramDetectedLanguage ? ` · detected ${turn.deepgramDetectedLanguage}` : ""}</span>],
    ["Deepgram Latency", <span className="text-ink">{turn.deepgramLatencyMs != null ? `${turn.deepgramLatencyMs} ms` : "—"}</span>],
    ...(turn.deepgramError ? [["Deepgram Error", <span className="text-amber-400">{turn.deepgramError}</span>] as [string, React.ReactNode]] : []),
    ["Selected Language", <span className="text-ink">{lang}</span>],
    ["Expected STT Locale", <span className="text-ink">{expectedStt}</span>],
    ["Actual STT Locale", <span className={sttMatch ? "text-emerald" : "text-amber-400 font-semibold"}>{actualStt}{sttMatch ? " ✓" : ""}</span>],
    ["STT Model", <span className="text-ink">{sttModel}</span>],
    ["Raw Transcript", rawT
      ? <span className="text-ink">"{rawT}"</span>
      : <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-400 font-semibold">EMPTY</span>],
    ["Transcript Length", <span className={tLen === 0 ? "text-amber-400 font-semibold" : "text-ink"}>{tLen} chars</span>],
    ["Transcript Confidence", sConf != null
      ? <span className={sConf < 0.5 ? "text-amber-400 font-semibold" : "text-emerald"}>{Math.round(sConf * 100)}%{sConf < 0.5 ? " · LOW" : ""}</span>
      : <span className="text-ink-subtle">—</span>],
    ["Voice Output", <span className="text-ink">{voiceLabel}</span>],
    ["Detected Intent", noMatch
      ? <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-400 font-semibold">NO_INTENT_MATCH</span>
      : <span className="text-emerald font-semibold">{turn.intent}</span>],
    ["Intent Confidence", <span className="text-ink">{turn.intentConfidence != null ? `${Math.round(turn.intentConfidence * 100)}%` : "—"}</span>],
    ["Selected Agent", <span className="text-ink">{turn.agent ? AGENT_META[turn.agent].label : "—"}</span>],
    ["Selected Template", <span className="text-ink">{agentTurn?.templateId ? `${agentTurn.templateLang ?? "?"}.${agentTurn.templateId}` : "—"}</span>],
    ["Order Items", items.length
      ? <span className="text-ink">{items.map((i) => `${i.quantity} ${i.name}`).join(", ")} <span className="text-ink-subtle">({items.length})</span></span>
      : <span className="text-ink-subtle">none</span>],
    ["Fallback Triggered", fallbackFired
      ? <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-400 font-semibold">YES</span>
      : <span className="rounded-md bg-emerald/15 px-2 py-0.5 text-emerald font-semibold">NO</span>],
  ];
  return (
    <div className="rounded-2xl border border-emerald/30 bg-elevated/70 p-4 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald">
        <Bug className="h-3.5 w-3.5" /> Pipeline trace
      </div>
      <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[12.5px]">
        {rows.map(([k, v], i) => (
          <div key={i} className="contents">
            <dt className="text-ink-subtle">{k}</dt>
            <dd className="font-mono break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {noMatch && (
        <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11.5px] text-amber-300">
          Classifier returned <span className="font-semibold">UNKNOWN</span>. Investigate this stage before changing language routing — verify the raw transcript above is what the user actually said. If it looks garbled, the issue is Twilio STT, not intent detection.
        </p>
      )}
    </div>
  );
}
