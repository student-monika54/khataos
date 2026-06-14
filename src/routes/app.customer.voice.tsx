import { createFileRoute } from "@tanstack/react-router";
import { useKhata, formatINR, recordRepayment } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/customer/voice")({
  component: VoiceAgent,
});

type Msg = { role: "user" | "agent"; text: string; lang?: string };

const LANGS = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "kn-IN", label: "ಕನ್ನಡ" },
];

// Detect script for Hindi/Kannada vs English
function detectLang(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";
  return "en-IN";
}

function VoiceAgent() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const available = Math.max(0, me.creditLimit - me.outstanding);
  const [lang, setLang] = useState("en-IN");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = lang;
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      transcriptRef.current = text;
    };
    r.onend = () => {
      setListening(false);
      if (transcriptRef.current.trim()) handleUser(transcriptRef.current.trim());
      transcriptRef.current = "";
    };
    r.onerror = () => setListening(false);
    recRef.current = r;
  }, [lang]);

  async function handleUser(text: string) {
    const detected = detectLang(text);
    setMessages((m) => [...m, { role: "user", text, lang: detected }]);
    setThinking(true);

    // Lightweight repayment intent (offline)
    const repay = text.match(/(\d{2,5})/);
    if (/pay|paid|repay|chuka|बकाया|भुगतान|ಪಾವತಿ/i.test(text) && repay) {
      recordRepayment(me.id, Math.min(me.outstanding, parseInt(repay[1])));
    }

    // 1) PRIMARY PATH — try to extract an order from the utterance.
    //    Gemini runs server-side; if items are detected the order is saved
    //    immediately and shows up on /app/customer/orders (which polls).
    let orderSaved = false;
    try {
      const orderRes = await fetch("/api/khataos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "quick_voice",
          customerId: me.id,
          customerName: me.name,
          phone: me.phone,
          transcript: text,
          language: detected,
        }),
      });
      if (orderRes.ok) {
        const created = await orderRes.json();
        const items = Array.isArray(created?.items) ? created.items : [];
        const lines = items
          .map((it: any) => `${it.quantity} ${it.unit ?? "pcs"} ${it.name}`)
          .join(", ");
        const amt = created?.amount != null ? ` (~₹${Math.round(Number(created.amount))})` : "";
        const reply = `Order placed: ${lines}${amt}. You'll see it under My Orders — awaiting shop approval.`;
        setMessages((m) => [...m, { role: "agent", text: reply, lang: detected }]);
        speak(reply, detected);
        orderSaved = true;
      }
      // 422 = no items detected → fall through to chat assistant
    } catch {/* network – fall through */}

    // 2) FALLBACK — conversational reply for non-order intents
    //    (balance, due date, credit, greetings).
    if (!orderSaved) {
      try {
        const res = await fetch("/api/khataos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "customer_voice",
            message: text,
            language: detected,
            context: {
              customer_name: me.name,
              available_credit_inr: available,
              credit_limit_inr: me.creditLimit,
              outstanding_inr: me.outstanding,
              trust_score: me.trustScore,
              due_date: me.dueDate,
            },
          }),
        });
        const data = await res.json();
        const reply = (data.reply as string) || "Sorry, I didn't catch that. Try saying your order, e.g. '2 kg rice and 1 litre oil'.";
        setMessages((m) => [...m, { role: "agent", text: reply, lang: detected }]);
        speak(reply, detected);
      } catch {
        const err = "Network error — please try again.";
        setMessages((m) => [...m, { role: "agent", text: err }]);
        speak(err, "en-IN");
      }
    }

    setThinking(false);
  }

  function speak(text: string, voiceLang: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voiceLang;
    u.rate = 1;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((v) => v.lang === voiceLang) || voices.find((v) => v.lang.startsWith(voiceLang.split("-")[0]));
    if (v) u.voice = v;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function toggle() {
    if (!recRef.current) return;
    if (listening) { recRef.current.stop(); return; }
    recRef.current.lang = lang;
    transcriptRef.current = "";
    setListening(true);
    try { recRef.current.start(); } catch { setListening(false); }
  }

  return (
    <AppScreen>
      <AppHeader title="Talk to KhataOS" subtitle="Voice agent · multilingual" back />
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Available" value={formatINR(available)} accent />
          <StatCard label="Outstanding" value={formatINR(me.outstanding)} />
        </div>

        {/* Language picker */}
        <div className="mt-4 flex gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`flex-1 rounded-full border px-3 py-2 text-[12px] font-medium transition ${
                lang === l.code ? "border-emerald bg-emerald/15 text-emerald" : "border-border bg-surface text-ink-muted"
              }`}
            >{l.label}</button>
          ))}
        </div>

        {/* Mic */}
        <div className="mt-6 flex flex-col items-center">
          <button
            onClick={toggle}
            disabled={!supported || thinking}
            className={`relative grid h-28 w-28 place-items-center rounded-full transition ${
              listening ? "bg-emerald text-[#06140b]" : "bg-elevated text-emerald border border-emerald/30"
            } ${thinking ? "opacity-60" : ""}`}
          >
            {listening && <span className="absolute inset-0 rounded-full bg-emerald/40 animate-pulse-ring" />}
            {thinking ? <Loader2 className="h-8 w-8 animate-spin" /> :
              listening ? <Square className="h-7 w-7" fill="currentColor" /> :
              <Mic className="h-9 w-9" />}
          </button>
          <div className="mt-3 text-center text-[12px] text-ink-muted">
            {!supported ? "Voice not supported in this browser" :
              thinking ? "Thinking…" :
              listening ? "Listening…" : "Tap to speak"}
          </div>
          {speaking && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald">
              <Volume2 className="h-3 w-3" /> Speaking
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-elevated/40 p-4">
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-emerald">
              <Sparkles className="h-3 w-3" /> Try saying
            </div>
            <ul className="mt-2 space-y-1.5 text-[13px] text-ink">
              <li>• "What's my credit balance?"</li>
              <li>• "मुझे आज ₹500 की खरीद उधार पर चाहिए"</li>
              <li>• "I want to repay 1000 rupees"</li>
              <li>• "ನನ್ನ ಬಾಕಿ ಎಷ್ಟು?"</li>
            </ul>
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <Section title="Conversation">
          <ul className="space-y-2.5">
            {messages.map((m, i) => (
              <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug ${
                  m.role === "user"
                    ? "bg-emerald text-[#06140b]"
                    : "bg-elevated text-ink border border-border"
                }`}>{m.text}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </AppScreen>
  );
}
