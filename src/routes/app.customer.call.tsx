import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { TwilioDialer } from "@/components/app/TwilioDialer";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { useCalls, type CallRecord, type CartLine } from "@/lib/khataos/calls";
import {
  Mic, MicOff, PhoneOff, Phone, ArrowLeft, CheckCircle2, Clock,
  Radio, History, ShoppingBag, CreditCard, Sparkles,
} from "lucide-react";
import { voiceMenu } from "@/lib/khataos/voice-menu";
import { parseCartCommand, parseAmount, parseCommitment } from "@/lib/khataos/cart-parser";
import type { LangCode } from "@/lib/khataos/ivr";

export const Route = createFileRoute("/app/customer/call")({ component: CallScreen });

type Screen = "idle" | "language" | "live" | "ended";

const LANG: Record<LangCode, { native: string; en: string; code: string }> = {
  en: { native: "English", en: "English", code: "en-IN" },
  hi: { native: "हिंदी", en: "Hindi", code: "hi-IN" },
  kn: { native: "ಕನ್ನಡ", en: "Kannada", code: "kn-IN" },
};

function speak(text: string, langCode: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode;
  window.speechSynthesis.speak(u);
}

type Turn = { role: "agent" | "customer" | "system"; text: string; at: number };

function CallScreen() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const allCalls = useCalls((s) => s);
  const nav = useNavigate();

  // Idle-page derived data
  const myCalls = useMemo(
    () => allCalls.filter((c) => c.customerId === me.id || c.customerName === me.name).slice(0, 4),
    [allCalls, me.id, me.name],
  );
  const lastOrderTurn = useMemo(() => {
    for (const c of allCalls) {
      const t = [...c.transcript].reverse().find((x) => x.intent === "KHATA_ORDER" || x.templateId === "ORDER_CONFIRMATION");
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

  // Live call state
  const [screen, setScreen] = useState<Screen>("idle");
  const [lang, setLang] = useState<LangCode>("en");
  const [callId, setCallId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [mode, setMode] = useState<"menu" | "ordering" | "credit_amount" | "commitment">("menu");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [listening, setListening] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const m = useMemo(() => voiceMenu(lang), [lang]);
  const langCode = LANG[lang].code;

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  function pushTurn(t: Turn) { setTurns((prev) => [...prev, t]); }
  function agentSay(text: string) {
    pushTurn({ role: "agent", text, at: Date.now() });
    speak(text, langCode);
    if (callId) {
      fetch("/api/khataos/calls", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "say", callId, text, templateId: "AGENT_REPLY" }),
      }).catch(() => {});
    }
  }
  function userSaid(text: string) {
    pushTurn({ role: "customer", text, at: Date.now() });
    if (callId) {
      fetch("/api/khataos/calls", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "say", callId, text }),
      }).catch(() => {});
    }
  }

  // === Web Speech API ===
  function startListening() {
    if (typeof window === "undefined") return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { agentSay("Voice not supported in this browser. Please type instead."); return; }
    const rec = new SR();
    rec.lang = langCode;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript as string;
      handleUtterance(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }
  function stopListening() {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }

  async function handleUtterance(rawText: string) {
    const text = rawText.trim();
    if (!text) return;
    userSaid(text);

    // Mode: collecting credit amount
    if (mode === "credit_amount") {
      const amt = parseAmount(text);
      if (amt == null) { agentSay(m.askCreditAmount); return; }
      await requestCredit(amt);
      setMode("menu");
      return;
    }

    // Mode: collecting payment commitment
    if (mode === "commitment") {
      const c = parseCommitment(text);
      if (!c) { agentSay(m.askCommitment); return; }
      await sendCommitment(c.days, c.text);
      setMode("menu");
      return;
    }

    // Menu-style intents
    const lower = text.toLowerCase();
    if (/\b(balance|baki|bakaaya|outstanding|baaki)\b/.test(lower)) {
      agentSay(m.balance(me.outstanding, Math.max(0, me.creditLimit - me.outstanding)));
      return;
    }
    if (/\b(credit|udhar|udhaar|loan)\b/.test(lower) && mode !== "ordering") {
      setMode("credit_amount");
      agentSay(m.askCreditAmount);
      return;
    }
    if (/\b(pay|payment|paavati|chukaana)\b/.test(lower) && mode !== "ordering") {
      setMode("commitment");
      agentSay(m.askCommitment);
      return;
    }
    if (/\b(order|saaman|samaan|kharidi|place)\b/.test(lower) && mode !== "ordering") {
      setMode("ordering");
      agentSay(m.whatOrder);
      return;
    }

    // Cart parser path
    const cmd = parseCartCommand(text);
    if (!cmd) { agentSay(m.notUnderstood); return; }

    if (cmd.action === "endcall") return endCall();
    if (cmd.action === "view") {
      if (cart.length === 0) { agentSay(m.cartEmpty); return; }
      const lines = cart.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(", ");
      const total = cart.reduce((s, l) => s + l.qty * l.price, 0);
      agentSay(m.cartSummary(lines, total));
      return;
    }
    if (cmd.action === "checkout") {
      if (cart.length === 0) { agentSay(m.cartEmpty); return; }
      await checkout();
      return;
    }
    if (cmd.action === "add") {
      setCart((prev) => {
        const i = prev.findIndex((l) => l.skuId === cmd.sku.id);
        if (i >= 0) { const n = [...prev]; n[i] = { ...n[i], qty: n[i].qty + cmd.qty }; return n; }
        return [...prev, { skuId: cmd.sku.id, name: cmd.sku.name, qty: cmd.qty, unit: cmd.sku.unit, price: cmd.sku.pricePerUnit }];
      });
      setMode("ordering");
      agentSay(m.itemAdded(cmd.sku.name, cmd.qty, cmd.sku.unit));
      return;
    }
    if (cmd.action === "remove") {
      setCart((prev) => prev.filter((l) => l.skuId !== cmd.sku.id));
      agentSay(m.itemRemoved(cmd.sku.name));
      return;
    }
    if (cmd.action === "update") {
      setCart((prev) => prev.map((l) => l.skuId === cmd.sku.id ? { ...l, qty: cmd.qty } : l));
      agentSay(m.itemUpdated(cmd.sku.name, cmd.qty, cmd.sku.unit));
      return;
    }
  }

  async function checkout() {
    if (!callId) return;
    setBusy(true);
    const lines = cart.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(", ");
    const total = cart.reduce((s, l) => s + l.qty * l.price, 0);
    agentSay(m.checkoutReview(lines, total));
    const res = await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkout", callId, cart, language: LANG[lang].en,
        customer: { id: me.id, name: me.name, phone: me.phone, trustScore: me.trustScore, outstanding: me.outstanding, creditLimit: me.creditLimit, reliability: me.reliability },
      }),
    });
    const data = await res.json();
    setTimeout(() => {
      const reply = data.decision === "approve" ? m.orderApproved
        : data.decision === "conditional" ? m.orderConditional(data.recommendedAmount ?? total)
        : m.orderRejected(data.reasoning ?? "");
      agentSay(reply);
      setCart([]); setMode("menu"); setBusy(false);
    }, 900);
  }

  async function requestCredit(amount: number) {
    if (!callId) return;
    setBusy(true);
    const res = await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "credit", callId, amount,
        customer: { id: me.id, name: me.name, phone: me.phone, trustScore: me.trustScore, outstanding: me.outstanding, creditLimit: me.creditLimit, reliability: me.reliability },
      }),
    });
    const data = await res.json();
    const reply = data.decision === "approve" ? m.creditApproved(amount)
      : data.decision === "conditional" ? m.creditConditional(data.recommendedAmount ?? amount)
      : m.creditRejected;
    agentSay(reply);
    setBusy(false);
  }

  async function sendCommitment(days: number, text: string) {
    if (!callId) return;
    await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "payment", callId, commitment: { days, text } }),
    });
    agentSay(m.commitmentSaved(text));
  }

  async function startCall() { setScreen("language"); }

  async function pickLanguage(code: LangCode) {
    setLang(code);
    setScreen("live");
    setTurns([]); setCart([]); setMode("menu");
    const res = await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start", language: LANG[code].en,
        customer: { id: me.id, name: me.name, phone: me.phone, trustScore: me.trustScore, outstanding: me.outstanding, creditLimit: me.creditLimit, reliability: me.reliability },
      }),
    });
    const data = await res.json();
    setCallId(data.callId);
    const greeting = voiceMenu(code).mainMenu;
    setTurns([{ role: "agent", text: greeting, at: Date.now() }]);
    speak(greeting, LANG[code].code);
  }

  async function endCall() {
    stopListening();
    if (callId) {
      await fetch("/api/khataos/calls", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", callId }),
      });
    }
    agentSay(m.farewell);
    setScreen("ended");
    setTimeout(() => nav({ to: "/app/customer" }), 1800);
  }

  function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    setInput("");
    handleUtterance(v);
  }

  // ============ IDLE: companion screen ============
  if (screen === "idle") {
    return (
      <AppScreen>
        <AppHeader title="Voice Commerce" subtitle="Talk to KhataOS to place orders & manage credit" />
        <div className="px-4 pt-3 space-y-4">
          {/* Hero Call button */}
          <div className="rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/15 via-emerald/5 to-transparent p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald">
              <Radio className="h-3 w-3 animate-pulse" /> Voice agent online
            </div>
            <div className="mt-2 font-display text-xl">Place orders by talking</div>
            <p className="mt-1 text-[12px] text-ink-muted">
              Just say what you need — "do kilo atta", "ek litre tel". KhataOS handles credit, the shopkeeper, and delivery.
            </p>
            <button
              onClick={startCall}
              className="mt-4 w-full rounded-2xl bg-emerald text-[#06140b] py-3.5 font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Phone className="h-5 w-5" /> Call KhataOS
            </button>
            <div className="mt-2 text-center text-[10.5px] text-ink-subtle">+91 80000 11122 · English · हिंदी · ಕನ್ನಡ</div>
          </div>

          {/* Last Order */}
          <Section title="Last order from voice" action={<Link to="/app/customer/orders" className="text-[11px] text-emerald">View all</Link>}>
            {lastOrderTurn ? (
              <div className="rounded-2xl border border-border bg-elevated p-3.5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-emerald">
                  <ShoppingBag className="h-3 w-3" /> via voice call
                </div>
                <div className="mt-1.5 text-[13px]">{lastOrderTurn.turn.text}</div>
                <div className="mt-1 text-[10.5px] text-ink-muted">{relTime(lastOrderTurn.turn.at)} · {lastOrderTurn.call.language ?? "—"}</div>
              </div>
            ) : (
              <EmptyTile icon={ShoppingBag} label="No voice orders yet. Tap Call KhataOS and say what you need." />
            )}
          </Section>

          {/* Last Credit Decision */}
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
                <div className="mt-1.5 text-[12.5px]">{lastCreditTurn.turn.reasoning ?? lastCreditTurn.turn.text}</div>
                <div className="mt-1 text-[10.5px] text-ink-muted">{relTime(lastCreditTurn.turn.at)}</div>
              </div>
            ) : (
              <EmptyTile icon={CreditCard} label="No credit decisions yet." />
            )}
          </Section>

          {/* Recent calls */}
          <Section title="Recent calls" action={myCalls.length ? <span className="text-[10px] text-ink-subtle">{myCalls.length}</span> : null}>
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
                          <div className="text-[12.5px] font-medium capitalize">{(c.currentIntent ?? "voice call").toLowerCase().replace(/_/g, " ")}</div>
                          <div className="text-[10.5px] text-ink-muted">{c.language ?? "—"} · {relTime(c.startedAt)}{c.durationSec ? ` · ${c.durationSec}s` : ""}</div>
                        </div>
                      </div>
                      {c.outcome && <span className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">{c.outcome.replace(/_/g, " ")}</span>}
                    </div>
                    {c.summary && <p className="mt-1.5 text-[11.5px] text-ink-muted line-clamp-2">{c.summary}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyTile icon={History} label="No call history yet." />
            )}
          </Section>

          {/* Real dial fallback (advanced) */}
          <Section title="Or call from a real phone">
            <TwilioDialer defaultTo={me.phone?.startsWith("+") ? me.phone : ""} />
          </Section>
        </div>
      </AppScreen>
    );
  }

  // ============ LANGUAGE ============
  if (screen === "language") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-emerald">Connecting…</div>
        <h1 className="mt-2 font-display text-2xl">Choose your language</h1>
        <p className="mt-1 text-[12px] text-ink-muted">Bhasha chuniye · Bhaashe aayke maadi</p>
        <div className="mt-8 w-full max-w-xs space-y-3">
          {(["en","hi","kn"] as LangCode[]).map((c, i) => (
            <button key={c} onClick={() => pickLanguage(c)} className="w-full rounded-2xl border border-emerald/30 bg-elevated px-5 py-4 text-left hover:border-emerald/60 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-lg">{LANG[c].native}</div>
                  <div className="text-[11px] text-ink-muted">{LANG[c].en}</div>
                </div>
                <div className="h-9 w-9 rounded-full bg-emerald/20 grid place-items-center text-emerald font-semibold">{i + 1}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setScreen("idle")} className="mt-8 inline-flex items-center gap-1 text-[12px] text-ink-muted">
          <ArrowLeft className="h-3 w-3" /> Cancel
        </button>
      </div>
    );
  }

  // ============ ENDED ============
  if (screen === "ended") {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-center px-8">
        <div>
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald/20 grid place-items-center">
            <PhoneOff className="h-6 w-6 text-emerald" />
          </div>
          <h2 className="mt-4 font-display text-xl">Call completed</h2>
          <p className="mt-1 text-sm text-ink-muted">Your order will appear in the Orders tab.</p>
        </div>
      </div>
    );
  }

  // ============ LIVE — voice-first conversational UI ============
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-emerald/5">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-emerald/20 grid place-items-center">
            <Sparkles className="h-4 w-4 text-emerald" />
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-tight">KhataOS Voice Agent</div>
            <div className="text-[10.5px] text-ink-muted flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${listening ? "bg-red-500 animate-pulse" : "bg-emerald"}`} />
              {listening ? "Listening…" : busy ? "Thinking…" : `On call · ${LANG[lang].native}`}
            </div>
          </div>
        </div>
        <button onClick={endCall} className="grid h-10 w-10 place-items-center rounded-full bg-destructive text-white">
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>

      {/* Internal cart pill — read-only summary, no controls */}
      {cart.length > 0 && (
        <div className="mx-4 mb-2 rounded-2xl border border-emerald/30 bg-emerald/10 px-3.5 py-2.5">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-emerald mb-1">Building order via voice</div>
          <div className="text-[12px]">
            {cart.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(" · ")}
            <span className="text-ink-muted"> · {formatINR(cart.reduce((s, l) => s + l.qty * l.price, 0))}</span>
          </div>
          <div className="mt-1 text-[10px] text-ink-subtle">Say "checkout" when done</div>
        </div>
      )}

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "customer" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
              t.role === "agent" ? "bg-elevated border border-border" :
              t.role === "customer" ? "bg-emerald text-[#06140b]" :
              "bg-amber-500/10 border border-amber-400/30 text-[12px]"
            }`}>
              {t.role === "agent" && (
                <div className="text-[9px] uppercase tracking-[0.14em] text-emerald mb-0.5">KhataOS</div>
              )}
              {t.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-elevated border border-border px-3.5 py-2.5 text-[12px] text-ink-muted">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-bounce [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-bounce [animation-delay:0.3s]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Voice control */}
      <div className="border-t border-border bg-background/95 backdrop-blur px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={listening ? stopListening : startListening}
            className={`grid h-14 w-14 place-items-center rounded-full transition ${
              listening ? "bg-red-500 text-white animate-pulse" : "bg-emerald text-[#06140b]"
            }`}
            aria-label={listening ? "Stop listening" : "Start speaking"}
          >
            {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          <form onSubmit={submitTyped} className="flex-1 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Or type what you'd say…"
              className="flex-1 rounded-xl border border-border bg-elevated px-3 py-2.5 text-[13px] outline-none focus:border-emerald/50"
            />
            <button type="submit" className="rounded-xl bg-emerald/15 text-emerald px-3 py-2.5 text-[12px] font-semibold">
              Send
            </button>
          </form>
        </div>
        <div className="text-center text-[10.5px] text-ink-subtle">
          Try: "place order" · "do kilo atta" · "checkout" · "balance" · "request credit"
        </div>
      </div>
    </div>
  );
}

function EmptyTile({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-elevated/40 p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-ink-subtle" />
      <p className="mt-1.5 text-[11.5px] text-ink-muted">{label}</p>
    </div>
  );
}

function relTime(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); return `${d}d ago`;
}
