import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { CallPipeline, type PipelineStage } from "@/components/app/CallPipeline";
import { useEffect, useRef, useState } from "react";
import { useKhata, formatINR, recordRepayment } from "@/lib/khataos/data";
import { addCall, AGENT_META, type CallRecord, type TranscriptTurn } from "@/lib/khataos/calls";
import { loadCommerceBrain, onCommerceBrainProgress, runCommerceBrain, type CommerceBrainOutput } from "@/lib/khataos/commerce-brain";
import { Mic, PhoneOff, Phone, Loader2, Volume2, Sparkles, Download } from "lucide-react";

export const Route = createFileRoute("/app/customer/call")({ component: CallScreen });

function CallScreen() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const nav = useNavigate();
  const [phase, setPhase] = useState<"incoming" | "in_call" | "ended">("incoming");
  const [callId] = useState(() => `sim_${Date.now()}`);
  const [startedAt] = useState(() => Date.now());
  const [duration, setDuration] = useState(0);
  const [listening, setListening] = useState(false);
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [commerce, setCommerce] = useState<CommerceBrainOutput | undefined>();
  const [agent, setAgent] = useState<string | undefined>();
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [reply, setReply] = useState<string>("");
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
    if (phase !== "in_call") return;
    const id = setInterval(() => setDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  useEffect(() => {
    const SR = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return;
    const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = "en-IN";
    r.onresult = (e: any) => { onUserSpeech(e.results[0][0].transcript); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
  }, []);

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

  function accept() {
    setPhase("in_call");
    const greet = `Namaste ${me.name}. KhataOS suniye, kaise madad karu?`;
    setTurns([{ role: "agent", text: greet, at: Date.now(), templateId: "GREETING", agent: "InsightsAgent", language: "Hinglish" }]);
    setTemplateId("GREETING"); setAgent("InsightsAgent");
    speak(greet, "hi-IN");
  }

  function decline() {
    nav({ to: "/app/customer" });
  }

  async function onUserSpeech(text: string) {
    setStage("commerce");
    const customerTurn: TranscriptTurn = { role: "customer", text, at: Date.now() };
    setTurns((t) => [...t, customerTurn]);
    const c = await runCommerceBrain(text);
    setCommerce(c);
    setStage("financial");

    const res = await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "speak", callId,
        customer: { id: me.id, name: me.name, phone: me.phone, trustScore: me.trustScore, outstanding: me.outstanding, creditLimit: me.creditLimit, reliability: me.reliability },
        text,
      }),
    });
    if (!res.ok) { setStage("idle"); return; }
    const data = await res.json();
    setStage("template");
    setAgent(data.financial?.agent);
    setTemplateId(data.templateId);
    setReply(data.reply);
    const agentTurn: TranscriptTurn = {
      role: "agent", text: data.reply, at: Date.now(),
      intent: data.commerce?.intent, agent: data.financial?.agent,
      templateId: data.templateId, decision: data.financial?.decision,
      reasoning: data.financial?.reasoning,
    };
    setTurns((t) => [...t, { ...customerTurn, intent: c.intent, language: c.language, items: c.items }, agentTurn].slice(turns.length));
    setStage("done");
    const lang = c.language === "Hindi" || c.language === "Hinglish" ? "hi-IN" : "en-IN";
    speak(data.reply, lang);
    if (c.intent === "REPAYMENT" && c.amount) recordRepayment(me.id, c.amount);
    setTimeout(() => setStage("idle"), 1200);
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
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald animate-pulse">Incoming call · KhataOS</div>
          <div className="mt-6 h-28 w-28 rounded-full bg-emerald/20 grid place-items-center">
            <Phone className="h-10 w-10 text-emerald" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold">KhataOS Assistant</h1>
          <p className="mt-1 text-sm text-ink-muted">+91 80000 11122 · AI Khata</p>
          <p className="mt-3 text-[12px] text-ink-subtle">Voice agent · Multilingual · Commerce + Financial Brain</p>
        </div>
        <div className="flex items-center justify-around px-8 pb-16">
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

  return (
    <AppScreen>
      <AppHeader title="On call · KhataOS" subtitle={`${Math.floor(duration/60)}:${String(duration%60).padStart(2,"0")} · ${commerce?.language ?? "EN"}`} right={
        <button onClick={end} className="grid h-9 w-9 place-items-center rounded-full bg-destructive text-white">
          <PhoneOff className="h-4 w-4" />
        </button>
      } />
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Available" value={formatINR(Math.max(0, me.creditLimit - me.outstanding))} accent />
          <StatCard label="Outstanding" value={formatINR(me.outstanding)} />
        </div>

        <div className="mt-4">
          <CallPipeline stage={stage} commerce={commerce} agent={agent} templateId={templateId} />
        </div>

        {!brainReady && (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-elevated/40 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-emerald">Commerce Brain (WebLLM)</div>
                <div className="mt-0.5 text-[11px] text-ink-muted truncate">{brainStatus}</div>
              </div>
              {loadingBrain || brainPct > 0 ? (
                <span className="text-[12px] font-semibold text-emerald">{Math.round(brainPct * 100)}%</span>
              ) : (
                <button onClick={startBrain} className="inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-3 py-1.5 text-[11px] font-semibold text-emerald">
                  <Download className="h-3 w-3" /> Load 1B model
                </button>
              )}
            </div>
            {brainPct > 0 && brainPct < 1 && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
                <div className="h-full bg-emerald" style={{ width: `${brainPct * 100}%` }} />
              </div>
            )}
            <p className="mt-2 text-[10px] text-ink-subtle">Rules engine handles intent if WebLLM isn't loaded yet.</p>
          </div>
        )}

        <div className="mt-4 flex flex-col items-center">
          <button onClick={toggleMic} className={`relative grid h-24 w-24 place-items-center rounded-full transition ${
            listening ? "bg-emerald text-[#06140b]" : stage !== "idle" ? "bg-elevated text-emerald border border-emerald/30" : "bg-elevated text-emerald border border-emerald/30"
          }`}>
            {stage === "commerce" || stage === "financial" || stage === "template" ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
            {listening && <span className="absolute inset-0 rounded-full bg-emerald/30 animate-ping" />}
          </button>
          <div className="mt-2 text-[12px] text-ink-muted">
            {stage === "commerce" ? "Parsing intent…" :
             stage === "financial" ? `${(agent && AGENT_META[agent as keyof typeof AGENT_META]?.label) ?? "Financial Brain"} thinking…` :
             stage === "template" ? "Composing reply…" :
             listening ? "Listening…" : "Tap to speak"}
          </div>
        </div>

        {reply && stage === "done" && (
          <div className="mt-3 rounded-2xl border border-emerald/40 bg-emerald/10 p-3 text-[13px] text-foreground">
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

      <div className="px-4 pt-4">
        <Link to="/app/shopkeeper/live" className="block text-center text-[11px] text-ink-subtle hover:text-emerald">
          Watch this call from the shopkeeper side →
        </Link>
      </div>
    </AppScreen>
  );
}
