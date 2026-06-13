import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { AgentTimeline, stagesUpTo, type TimelineStage } from "@/components/app/AgentTimeline";
import { CommerceBrainPanel } from "@/components/app/CommerceBrainPanel";
import { LanguageSelector } from "@/components/app/LanguageSelector";
import { useEffect, useRef, useState } from "react";
import { TwilioDialer } from "@/components/app/TwilioDialer";
import { useKhata, formatINR, recordRepayment } from "@/lib/khataos/data";
import { addCall, AGENT_META, type CallRecord, type TranscriptTurn } from "@/lib/khataos/calls";
import { loadCommerceBrain, onCommerceBrainProgress, runCommerceBrain, type CommerceBrainOutput } from "@/lib/khataos/commerce-brain";
import { useDemoMode, setDemoLanguage, DEMO_SCENARIOS, LANG_META, type DemoLanguage } from "@/lib/khataos/demo-mode";
import { Mic, PhoneOff, Phone, Loader2, Volume2, Sparkles, Download, Play } from "lucide-react";

export const Route = createFileRoute("/app/customer/call")({ component: CallScreen });

type CallPhase = "incoming" | "calling" | "ringing" | "connected" | "listening" | "processing" | "responding" | "ended";

const PHASE_LABEL: Record<CallPhase, string> = {
  incoming: "INCOMING",
  calling: "CALLING",
  ringing: "RINGING",
  connected: "CONNECTED",
  listening: "LISTENING",
  processing: "PROCESSING",
  responding: "RESPONDING",
  ended: "ENDED",
};

function CallScreen() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const demo = useDemoMode();
  const nav = useNavigate();

  const [phase, setPhase] = useState<CallPhase>("incoming");
  const [callId] = useState(() => `sim_${Date.now()}`);
  const [startedAt] = useState(() => Date.now());
  const [duration, setDuration] = useState(0);
  const [listening, setListening] = useState(false);

  const [activeStage, setActiveStage] = useState<TimelineStage | undefined>();
  const [completedStages, setCompletedStages] = useState<TimelineStage[]>([]);
  const [commerce, setCommerce] = useState<CommerceBrainOutput | undefined>();
  const [agent, setAgent] = useState<string | undefined>();
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [reply, setReply] = useState<string>("");
  const [lastLatency, setLastLatency] = useState<number | undefined>();
  const [speechConfidence, setSpeechConfidence] = useState<number | undefined>();

  const [brainPct, setBrainPct] = useState(0);
  const [brainStatus, setBrainStatus] = useState("WebLLM not loaded");
  const [brainReady, setBrainReady] = useState(false);
  const [loadingBrain, setLoadingBrain] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const off = onCommerceBrainProgress((p, t) => {
      setBrainPct(p); setBrainStatus(t);
      if (p >= 1) setBrainReady(true);
    });
    return () => { off(); };
  }, []);

  useEffect(() => {
    if (phase === "incoming" || phase === "ended") return;
    const id = setInterval(() => setDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  useEffect(() => {
    const SR = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return;
    const r = new SR(); r.continuous = false; r.interimResults = false;
    r.lang = LANG_META[demo.language].code;
    r.onresult = (e: any) => {
      setSpeechConfidence(e.results[0][0].confidence);
      onUserSpeech(e.results[0][0].transcript);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
  }, [demo.language]);

  async function startBrain() {
    setLoadingBrain(true);
    try { await loadCommerceBrain(); } catch (e: any) { setBrainStatus("Falling back to rules: " + (e?.message ?? "")); }
    setLoadingBrain(false);
  }

  function speak(text: string, lang: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  }

  async function accept() {
    setPhase("calling");
    await new Promise((r) => setTimeout(r, 600));
    setPhase("ringing");
    await new Promise((r) => setTimeout(r, 900));
    setPhase("connected");
    const greet = demo.language === "Hindi"
      ? `Namaste ${me.name}. KhataOS suniye, kaise madad karu?`
      : demo.language === "English"
      ? `Hello ${me.name}. This is KhataOS. How can I help you today?`
      : `Namaste ${me.name}. KhataOS speaking. How can I help?`;
    setTurns([{ role: "agent", text: greet, at: Date.now(), templateId: "GREETING", agent: "InsightsAgent", language: demo.language }]);
    setTemplateId("GREETING"); setAgent("InsightsAgent");
    speak(greet, LANG_META[demo.language].code);
    setTimeout(() => setPhase("listening"), 1500);
  }

  function decline() { nav({ to: "/app/customer" }); }

  async function onUserSpeech(text: string) {
    setPhase("processing");
    setActiveStage("stt");
    setCompletedStages(["user"]);
    await new Promise((r) => setTimeout(r, 250));

    setActiveStage("commerce");
    setCompletedStages(["user", "stt"]);
    const t0 = Date.now();
    const c = await runCommerceBrain(text);
    setLastLatency(Date.now() - t0);
    setCommerce(c);

    const customerTurn: TranscriptTurn = {
      role: "customer", text, at: Date.now(),
      intent: c.intent, language: c.language, items: c.items,
      confidence: c.confidence,
      languageConfidence: c.languageConfidence,
      intentConfidence: c.intentConfidence,
    };
    setTurns((t) => [...t, customerTurn]);

    // Walk through trust → credit/collections agents visually.
    setCompletedStages((s) => [...s, "commerce"]);
    setActiveStage("trust");
    await new Promise((r) => setTimeout(r, 300));

    const isCredit = c.intent === "KHATA_ORDER" || c.intent === "CREDIT_REQUEST";
    const isCollections = c.intent === "REPAYMENT" || c.intent === "SETTLEMENT" || c.intent === "COLLECTIONS_FOLLOWUP";
    setCompletedStages((s) => [...s, "trust"]);
    setActiveStage(isCredit ? "credit" : isCollections ? "collections" : "template");
    await new Promise((r) => setTimeout(r, 250));

    const res = await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "speak", callId,
        customer: { id: me.id, name: me.name, phone: me.phone, trustScore: me.trustScore, outstanding: me.outstanding, creditLimit: me.creditLimit, reliability: me.reliability },
        text,
      }),
    });
    if (!res.ok) { setPhase("listening"); setActiveStage(undefined); return; }
    const data = await res.json();

    if (isCredit) setCompletedStages((s) => [...s, "credit"]);
    else if (isCollections) setCompletedStages((s) => [...s, "collections"]);

    setActiveStage("template");
    setAgent(data.financial?.agent);
    setTemplateId(data.templateId);
    setReply(data.reply);
    const agentTurn: TranscriptTurn = {
      role: "agent", text: data.reply, at: Date.now(),
      intent: data.commerce?.intent, agent: data.financial?.agent,
      templateId: data.templateId, templateLang: data.templateLang,
      language: data.commerce?.language,
      languageConfidence: data.commerce?.languageConfidence,
      intentConfidence: data.commerce?.intentConfidence,
      decision: data.financial?.decision,
      reasoning: data.financial?.reasoning,
    };
    setTurns((t) => [...t, agentTurn]);
    await new Promise((r) => setTimeout(r, 250));

    setCompletedStages((s) => [...s, "template"]);
    setActiveStage("tts");
    setPhase("responding");
    const lang = LANG_META[(c.language as DemoLanguage)]?.code ?? "en-IN";
    speak(data.reply, lang);
    if (c.intent === "REPAYMENT" && c.amount) recordRepayment(me.id, c.amount);

    setTimeout(() => {
      setCompletedStages(stagesUpTo("tts"));
      setActiveStage(undefined);
      setPhase("listening");
    }, 1400);
  }

  function toggleMic() {
    if (!recRef.current) return;
    if (listening) { recRef.current.stop(); return; }
    setListening(true);
    try { recRef.current.start(); } catch { setListening(false); }
  }

  function end() {
    const rec: CallRecord = {
      id: callId, customerId: me.id, customerName: me.name, phone: me.phone,
      state: "completed", startedAt, endedAt: Date.now(),
      durationSec: Math.round((Date.now() - startedAt) / 1000),
      transcript: turns, language: commerce?.language,
      currentIntent: commerce?.intent, currentAgent: agent as any,
      outcome: turns.some((t) => t.decision === "approve") ? "credit_approved" : "info",
      summary: turns.filter((t) => t.role === "agent").slice(-1)[0]?.text ?? "Call completed",
      source: "simulated",
    };
    addCall(rec);
    fetch("/api/khataos/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end", callId }) });
    setPhase("ended");
    setTimeout(() => nav({ to: "/app/customer" }), 1500);
  }

  if (phase === "incoming") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-emerald/10 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald animate-pulse">Incoming · KhataOS</div>
          <div className="mt-6 h-28 w-28 rounded-full bg-emerald/20 grid place-items-center">
            <Phone className="h-10 w-10 text-emerald" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold">KhataOS Assistant</h1>
          <p className="mt-1 text-sm text-ink-muted">+91 80000 11122 · AI Khata</p>
          <p className="mt-3 text-[12px] text-ink-subtle">Voice agent · Multilingual · Commerce + Financial Brain</p>
          {demo.enabled && (
            <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald">
              Judge mode · scripted scenarios ready
            </div>
          )}
        </div>
        <div className="px-5 pb-6">
          <TwilioDialer defaultTo={me.phone?.startsWith("+") ? me.phone : ""} />
        </div>
        <div className="flex items-center justify-around px-8 pb-10">
          <button onClick={decline} className="grid h-16 w-16 place-items-center rounded-full bg-destructive text-white">
            <PhoneOff className="h-7 w-7" />
          </button>
          <button onClick={accept} className="grid h-16 w-16 place-items-center rounded-full bg-emerald text-[#06140b]">
            <Phone className="h-7 w-7" />
          </button>
        </div>
      </div>
    );
  }

  if (phase === "calling" || phase === "ringing") {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-center px-8">
        <div>
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald/20 grid place-items-center">
            <Phone className="h-8 w-8 text-emerald animate-pulse" />
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-emerald">{PHASE_LABEL[phase]}</div>
          <h2 className="mt-1 font-display text-xl">Connecting to KhataOS…</h2>
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-center px-8">
        <div>
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald/20 grid place-items-center">
            <PhoneOff className="h-6 w-6 text-emerald" />
          </div>
          <h2 className="mt-4 font-display text-xl">Call completed</h2>
          <p className="mt-1 text-sm text-ink-muted">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")} · saved to history</p>
        </div>
      </div>
    );
  }

  const headerSub = `${Math.floor(duration/60)}:${String(duration%60).padStart(2,"0")} · ${PHASE_LABEL[phase]}${speechConfidence != null ? ` · ${Math.round(speechConfidence * 100)}% STT` : ""}`;

  return (
    <AppScreen>
      <AppHeader title="On call · KhataOS" subtitle={headerSub} right={
        <button onClick={end} className="grid h-9 w-9 place-items-center rounded-full bg-destructive text-white">
          <PhoneOff className="h-4 w-4" />
        </button>
      } />
      <div className="px-4 pt-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Available" value={formatINR(Math.max(0, me.creditLimit - me.outstanding))} accent />
          <StatCard label="Outstanding" value={formatINR(me.outstanding)} />
        </div>

        <LanguageSelector
          selected={demo.language}
          detected={commerce?.language}
          confidence={commerce?.confidence}
          onChange={setDemoLanguage}
        />

        <CommerceBrainPanel
          ready={brainReady} status={brainStatus} pct={brainPct}
          lastOutput={commerce} lastLatencyMs={lastLatency}
        />

        <AgentTimeline active={activeStage} completed={completedStages} intent={commerce?.intent} />

        {!brainReady && (
          <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-ink-muted truncate">Boost intent accuracy with on-device 1B model</div>
              {loadingBrain || brainPct > 0 ? (
                <span className="text-[12px] font-semibold text-emerald">{Math.round(brainPct * 100)}%</span>
              ) : (
                <button onClick={startBrain} className="inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-3 py-1.5 text-[11px] font-semibold text-emerald">
                  <Download className="h-3 w-3" /> Load WebLLM
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center pt-2">
          <button onClick={toggleMic} className={`relative grid h-24 w-24 place-items-center rounded-full transition ${
            listening ? "bg-emerald text-[#06140b]" : "bg-elevated text-emerald border border-emerald/30"
          }`}>
            {phase === "processing" ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
            {listening && <span className="absolute inset-0 rounded-full bg-emerald/30 animate-ping" />}
          </button>
          <div className="mt-2 text-[12px] text-ink-muted">
            {phase === "processing" ? `${(agent && AGENT_META[agent as keyof typeof AGENT_META]?.label) ?? "Financial Brain"} thinking…` :
             phase === "responding" ? "Speaking response…" :
             listening ? "Listening…" : "Tap mic or pick a scenario below"}
          </div>
        </div>

        {reply && phase !== "processing" && (
          <div className="rounded-2xl border border-emerald/40 bg-emerald/10 p-3 text-[13px] text-foreground">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-emerald">
              <Volume2 className="h-3 w-3" /> {templateId}
            </div>
            <p className="mt-1.5">{reply}</p>
          </div>
        )}
      </div>

      {turns.length > 0 && (
        <Section title="Live transcript">
          <ul className="space-y-2">
            {turns.map((t, i) => (
              <li key={i} className={`flex ${t.role === "customer" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug ${
                  t.role === "customer" ? "bg-emerald text-[#06140b]" : "bg-elevated border border-border"
                }`}>
                  {t.role === "agent" && t.agent && (
                    <div className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-emerald">{t.agent} · {t.templateId}</div>
                  )}
                  {t.text}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {demo.enabled && (
        <Section title="Judge mode · scripted scenarios">
          <div className="grid grid-cols-1 gap-2 text-[12px]">
            {DEMO_SCENARIOS.map((s) => (
              <button key={s.id} onClick={() => { setDemoLanguage(s.language); onUserSpeech(s.customerLine); }}
                className="rounded-xl border border-border bg-elevated/60 px-3 py-2.5 text-left hover:border-emerald/40">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-semibold text-foreground">{s.title}</div>
                  <Play className="h-3 w-3 text-emerald" />
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">{s.description}</div>
                <div className="mt-1 text-[10.5px] italic text-ink-subtle">"{s.customerLine}"</div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {!demo.enabled && (
        <Section title="Try saying">
          <div className="grid grid-cols-1 gap-2 text-[12px]">
            {[
              "Do kilo atta aur ek litre tel khate mein daal do",
              "What's my outstanding?",
              "Mujhe 800 rupaye ka udhaar chahiye",
              "Maine 1000 rupaye bhej diye",
            ].map((s) => (
              <button key={s} onClick={() => onUserSpeech(s)} className="rounded-xl border border-border bg-elevated/60 px-3 py-2 text-left text-ink-muted hover:text-foreground hover:border-emerald/40">
                <Sparkles className="inline h-3 w-3 text-emerald mr-1.5" />{s}
              </button>
            ))}
          </div>
        </Section>
      )}

      <div className="px-4 pt-4">
        <Link to="/app/shopkeeper/live" className="block text-center text-[11px] text-ink-subtle hover:text-emerald">
          Watch this call from the shopkeeper side →
        </Link>
      </div>
    </AppScreen>
  );
}
