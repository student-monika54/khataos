import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { TwilioDialer } from "@/components/app/TwilioDialer";
import { useKhata, formatINR, recordCreditPurchase } from "@/lib/khataos/data";
import { Mic, PhoneOff, Phone, ArrowLeft, Plus, Minus, Check, ShoppingCart, CreditCard, Wallet, Truck, Calendar, X } from "lucide-react";
import { CATALOG, type Sku } from "@/lib/khataos/catalog";
import { voiceMenu } from "@/lib/khataos/voice-menu";
import type { LangCode } from "@/lib/khataos/ivr";
import type { CartLine } from "@/lib/khataos/calls";

export const Route = createFileRoute("/app/customer/call")({ component: CallScreen });

type Screen = "incoming" | "language" | "menu" | "cart" | "balance" | "credit" | "payment" | "status" | "ended";

const LANG_LABEL: Record<LangCode, { native: string; en: string; code: string }> = {
  en: { native: "English", en: "English", code: "en-IN" },
  hi: { native: "हिंदी", en: "Hindi", code: "hi-IN" },
  kn: { native: "ಕನ್ನಡ", en: "Kannada", code: "kn-IN" },
};

function speak(text: string, langCode: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode;
  u.rate = 1.25;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

function CallScreen() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const nav = useNavigate();

  const [screen, setScreen] = useState<Screen>("incoming");
  const [lang, setLang] = useState<LangCode>("en");
  const [callId, setCallId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastReply, setLastReply] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [creditAmount, setCreditAmount] = useState<number>(500);
  const [decision, setDecision] = useState<{ decision: string; reasoning: string; recommendedAmount?: number; amount?: number } | null>(null);
  const startedAt = useRef<number>(Date.now());

  const m = useMemo(() => voiceMenu(lang), [lang]);
  const total = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const langCode = LANG_LABEL[lang].code;

  function say(text: string) {
    setLastReply(text);
    speak(text, langCode);
  }

  async function startCall() {
    setScreen("language");
  }

  async function pickLanguage(code: LangCode) {
    setLang(code);
    const meta = voiceMenu(code);
    setScreen("menu");
    const res = await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        language: LANG_LABEL[code].en,
        customer: { id: me.id, name: me.name, phone: me.phone, trustScore: me.trustScore, outstanding: me.outstanding, creditLimit: me.creditLimit, reliability: me.reliability },
      }),
    });
    const data = await res.json();
    setCallId(data.callId);
    startedAt.current = Date.now();
    speak(meta.mainMenu, LANG_LABEL[code].code);
    setLastReply(meta.mainMenu);
  }

  function backToMenu() {
    setDecision(null);
    setScreen("menu");
    say(m.mainMenu);
  }

  function addItem(sku: Sku, qty: number) {
    setCart((c) => {
      const i = c.findIndex((l) => l.skuId === sku.id);
      if (i >= 0) {
        const next = [...c]; next[i] = { ...next[i], qty: next[i].qty + qty }; return next;
      }
      return [...c, { skuId: sku.id, name: sku.name, qty, unit: sku.unit, price: sku.pricePerUnit }];
    });
    say(m.itemAdded(sku.name, qty, sku.unit));
  }
  function removeItem(skuId: string) {
    const line = cart.find((l) => l.skuId === skuId);
    setCart((c) => c.filter((l) => l.skuId !== skuId));
    if (line) say(m.itemRemoved(line.name));
  }
  function updateQty(skuId: string, qty: number) {
    if (qty <= 0) return removeItem(skuId);
    setCart((c) => c.map((l) => (l.skuId === skuId ? { ...l, qty } : l)));
  }

  async function checkout() {
    if (!callId || cart.length === 0) return;
    setBusy(true);
    say(m.checkoutReview(cart.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(", "), total));
    const res = await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkout", callId, cart, language: LANG_LABEL[lang].en,
        customer: { id: me.id, name: me.name, phone: me.phone, trustScore: me.trustScore, outstanding: me.outstanding, creditLimit: me.creditLimit, reliability: me.reliability },
      }),
    });
    const data = await res.json();
    setDecision(data);
    const reply = data.decision === "approve" ? m.orderApproved
      : data.decision === "conditional" ? m.orderConditional(data.recommendedAmount ?? total)
      : m.orderRejected(data.reasoning ?? "");

    // Persist to DB so Orders tab (and retailer) reflect it across devices.
    const orderItems = cart.map((l) => ({
      name: l.name, quantity: l.qty, unit: l.unit, estimatedPrice: l.price,
    }));
    fetch("/api/khataos/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "in_app_call",
        customerId: me.id,
        customerName: me.name,
        phone: me.phone,
        callId,
        items: orderItems,
        amount: total,
        reasoning: data.reasoning,
      }),
    }).catch(() => {});

    // Deduct from local available credit + log in credit history.
    recordCreditPurchase(
      me.id,
      total,
      cart.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
      cart.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(", "),
    );

    setTimeout(() => { say(reply); setBusy(false); setCart([]); }, 250);
  }

  function checkBalance() {
    setScreen("balance");
    say(m.balance(me.outstanding, Math.max(0, me.creditLimit - me.outstanding)));
  }

  async function requestCredit() {
    if (!callId) return;
    setBusy(true);
    const res = await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "credit", callId, amount: creditAmount,
        customer: { id: me.id, name: me.name, phone: me.phone, trustScore: me.trustScore, outstanding: me.outstanding, creditLimit: me.creditLimit, reliability: me.reliability },
      }),
    });
    const data = await res.json();
    setDecision(data);
    const reply = data.decision === "approve" ? m.creditApproved(creditAmount)
      : data.decision === "conditional" ? m.creditConditional(data.recommendedAmount ?? creditAmount)
      : m.creditRejected;
    say(reply); setBusy(false);
  }

  async function commit(days: number, text: string) {
    if (!callId) return;
    await fetch("/api/khataos/calls", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "payment", callId, commitment: { days, text } }),
    });
    say(m.commitmentSaved(text));
  }

  async function endCall() {
    if (callId) {
      await fetch("/api/khataos/calls", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", callId }),
      });
    }
    say(m.farewell);
    setScreen("ended");
    setTimeout(() => nav({ to: "/app/customer" }), 1800);
  }

  // ===== UI =====

  if (screen === "incoming") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-emerald/10 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald animate-pulse">KhataOS Voice Commerce</div>
          <div className="mt-6 h-28 w-28 rounded-full bg-emerald/20 grid place-items-center">
            <Phone className="h-10 w-10 text-emerald" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold">Call KhataOS</h1>
          <p className="mt-1 text-sm text-ink-muted">+91 80000 11122</p>
          <p className="mt-3 text-[12px] text-ink-subtle">Place orders · Check balance · Request credit · All in your language</p>
        </div>
        <div className="px-5 pb-6"><TwilioDialer defaultTo={me.phone?.startsWith("+") ? me.phone : ""} /></div>
        <div className="flex items-center justify-around px-8 pb-10">
          <button onClick={() => nav({ to: "/app/customer" })} className="grid h-16 w-16 place-items-center rounded-full bg-destructive text-white">
            <PhoneOff className="h-7 w-7" />
          </button>
          <button onClick={startCall} className="grid h-16 w-16 place-items-center rounded-full bg-emerald text-[#06140b]">
            <Phone className="h-7 w-7" />
          </button>
        </div>
      </div>
    );
  }

  if (screen === "language") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-emerald">Step 1</div>
        <h1 className="mt-2 font-display text-2xl">Choose your language</h1>
        <p className="mt-1 text-[12px] text-ink-muted">Bhasha chuniye · Bhaashe aayke maadi</p>
        <div className="mt-8 w-full max-w-xs space-y-3">
          {(["en","hi","kn"] as LangCode[]).map((c, i) => (
            <button key={c} onClick={() => pickLanguage(c)} className="w-full rounded-2xl border border-emerald/30 bg-elevated px-5 py-4 text-left hover:border-emerald/60 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-lg">{LANG_LABEL[c].native}</div>
                  <div className="text-[11px] text-ink-muted">Press {i + 1} · {LANG_LABEL[c].en}</div>
                </div>
                <div className="h-9 w-9 rounded-full bg-emerald/20 grid place-items-center text-emerald font-semibold">{i + 1}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "ended") {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-center px-8">
        <div>
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald/20 grid place-items-center"><PhoneOff className="h-6 w-6 text-emerald" /></div>
          <h2 className="mt-4 font-display text-xl">Call completed</h2>
          <p className="mt-1 text-sm text-ink-muted">Thank you for using KhataOS</p>
        </div>
      </div>
    );
  }

  const headerRight = (
    <button onClick={endCall} className="grid h-9 w-9 place-items-center rounded-full bg-destructive text-white"><PhoneOff className="h-4 w-4" /></button>
  );

  // MAIN MENU
  if (screen === "menu") {
    const items: { key: Screen | "end"; icon: any; label: string; sub: string; onClick: () => void }[] = [
      { key: "cart",    icon: ShoppingCart, label: "Place Order",       sub: "Add items to your khata", onClick: () => { setScreen("cart"); say(m.whatOrder); } },
      { key: "balance", icon: Wallet,       label: "Check Balance",     sub: formatINR(me.outstanding) + " outstanding", onClick: checkBalance },
      { key: "credit",  icon: CreditCard,   label: "Request Credit",    sub: "AI-powered approval", onClick: () => { setScreen("credit"); say(m.askCreditAmount); } },
      { key: "status",  icon: Truck,        label: "Track Order",       sub: "Latest order status", onClick: () => { setScreen("status"); } },
      { key: "payment", icon: Calendar,     label: "Payment Commitment", sub: "Promise to pay", onClick: () => { setScreen("payment"); say(m.askCommitment); } },
      { key: "end",     icon: PhoneOff,     label: "End Call",          sub: "Disconnect", onClick: endCall },
    ];
    return (
      <AppScreen>
        <AppHeader title={`On call · ${LANG_LABEL[lang].native}`} subtitle="KhataOS voice menu" right={headerRight} />
        <div className="px-4 pt-3 space-y-3">
          {lastReply && (
            <div className="rounded-2xl border border-emerald/30 bg-emerald/10 p-3 text-[13px]">
              <div className="text-[9px] uppercase tracking-[0.14em] text-emerald mb-1">KhataOS</div>
              {lastReply}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((it, idx) => (
              <button key={it.key} onClick={it.onClick}
                className="rounded-2xl border border-border bg-elevated p-3.5 text-left hover:border-emerald/40 transition">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-full bg-emerald/15 grid place-items-center text-emerald"><it.icon className="h-4 w-4" /></div>
                  <div className="text-[10px] text-ink-subtle">Press {idx + 1}</div>
                </div>
                <div className="mt-2 font-semibold text-[13px]">{it.label}</div>
                <div className="text-[10.5px] text-ink-muted">{it.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </AppScreen>
    );
  }

  // CART
  if (screen === "cart") {
    return (
      <AppScreen>
        <AppHeader title="Place Order" subtitle={`${cart.length} items · ${formatINR(total)}`} right={headerRight} />
        <div className="px-4 pt-3 space-y-3">
          <button onClick={backToMenu} className="inline-flex items-center gap-1 text-[12px] text-ink-muted"><ArrowLeft className="h-3 w-3" /> Main menu</button>
          {lastReply && (
            <div className="rounded-2xl border border-emerald/30 bg-emerald/10 p-2.5 text-[12.5px]">{lastReply}</div>
          )}

          {cart.length > 0 && (
            <Section title="Your cart">
              <ul className="space-y-2">
                {cart.map((l) => (
                  <li key={l.skuId} className="flex items-center justify-between rounded-xl border border-border bg-elevated/60 px-3 py-2">
                    <div>
                      <div className="text-[13px] font-medium">{l.name}</div>
                      <div className="text-[10.5px] text-ink-muted">{formatINR(l.price)} / {l.unit}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(l.skuId, l.qty - 1)} className="h-7 w-7 rounded-full border border-border grid place-items-center"><Minus className="h-3 w-3" /></button>
                      <div className="text-[13px] font-semibold w-10 text-center">{l.qty} {l.unit}</div>
                      <button onClick={() => updateQty(l.skuId, l.qty + 1)} className="h-7 w-7 rounded-full border border-emerald/40 grid place-items-center text-emerald"><Plus className="h-3 w-3" /></button>
                      <button onClick={() => removeItem(l.skuId)} className="h-7 w-7 rounded-full border border-destructive/40 grid place-items-center text-destructive"><X className="h-3 w-3" /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <button disabled={busy} onClick={checkout} className="mt-3 w-full rounded-xl bg-emerald text-[#06140b] py-3 font-semibold disabled:opacity-50">
                {busy ? "Sending to shopkeeper…" : `Checkout · ${formatINR(total)}`}
              </button>
            </Section>
          )}

          {decision && (
            <div className={`rounded-2xl border p-3 text-[12.5px] ${decision.decision === "approve" ? "border-emerald/40 bg-emerald/10" : decision.decision === "conditional" ? "border-amber-400/40 bg-amber-500/10" : "border-destructive/40 bg-destructive/10"}`}>
              <div className="text-[10px] uppercase tracking-[0.14em] mb-1">Financial brain · {decision.decision}</div>
              {decision.reasoning}
            </div>
          )}

          <Section title="Catalog">
            <div className="grid grid-cols-2 gap-2">
              {CATALOG.map((s) => (
                <button key={s.id} onClick={() => addItem(s, s.defaultQty)} className="rounded-xl border border-border bg-elevated/60 px-3 py-2.5 text-left hover:border-emerald/40">
                  <div className="text-[13px] font-medium">{s.name}</div>
                  <div className="text-[10.5px] text-ink-muted">{formatINR(s.pricePerUnit)} / {s.unit}</div>
                </button>
              ))}
            </div>
          </Section>
        </div>
      </AppScreen>
    );
  }

  // BALANCE
  if (screen === "balance") {
    return (
      <AppScreen>
        <AppHeader title="Balance" subtitle="Outstanding & available credit" right={headerRight} />
        <div className="px-4 pt-3 space-y-3">
          <button onClick={backToMenu} className="inline-flex items-center gap-1 text-[12px] text-ink-muted"><ArrowLeft className="h-3 w-3" /> Main menu</button>
          <div className="rounded-2xl border border-emerald/30 bg-emerald/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-emerald">Outstanding</div>
            <div className="text-3xl font-display">{formatINR(me.outstanding)}</div>
            <div className="mt-2 text-[11px] text-ink-muted">Available credit · {formatINR(Math.max(0, me.creditLimit - me.outstanding))}</div>
          </div>
          {lastReply && <div className="rounded-2xl border border-border bg-elevated/60 p-3 text-[12.5px]">{lastReply}</div>}
        </div>
      </AppScreen>
    );
  }

  // CREDIT
  if (screen === "credit") {
    return (
      <AppScreen>
        <AppHeader title="Request Credit" subtitle="AI-powered approval" right={headerRight} />
        <div className="px-4 pt-3 space-y-3">
          <button onClick={backToMenu} className="inline-flex items-center gap-1 text-[12px] text-ink-muted"><ArrowLeft className="h-3 w-3" /> Main menu</button>
          {lastReply && <div className="rounded-2xl border border-emerald/30 bg-emerald/10 p-2.5 text-[12.5px]">{lastReply}</div>}
          <div className="rounded-2xl border border-border bg-elevated p-4 space-y-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Amount in ₹</div>
            <div className="grid grid-cols-4 gap-2">
              {[200, 500, 1000, 2000].map((a) => (
                <button key={a} onClick={() => setCreditAmount(a)} className={`rounded-xl border py-2 text-[13px] font-semibold ${creditAmount === a ? "border-emerald bg-emerald/15 text-emerald" : "border-border"}`}>₹{a}</button>
              ))}
            </div>
            <button disabled={busy} onClick={requestCredit} className="w-full rounded-xl bg-emerald text-[#06140b] py-3 font-semibold disabled:opacity-50">
              {busy ? "Evaluating…" : `Request ${formatINR(creditAmount)}`}
            </button>
          </div>
          {decision && (
            <div className={`rounded-2xl border p-3 text-[12.5px] ${decision.decision === "approve" ? "border-emerald/40 bg-emerald/10" : decision.decision === "conditional" ? "border-amber-400/40 bg-amber-500/10" : "border-destructive/40 bg-destructive/10"}`}>
              <div className="text-[10px] uppercase tracking-[0.14em] mb-1">{decision.decision}</div>
              {decision.reasoning}
            </div>
          )}
        </div>
      </AppScreen>
    );
  }

  // PAYMENT COMMITMENT
  if (screen === "payment") {
    return (
      <AppScreen>
        <AppHeader title="Payment Commitment" subtitle="When will you pay?" right={headerRight} />
        <div className="px-4 pt-3 space-y-3">
          <button onClick={backToMenu} className="inline-flex items-center gap-1 text-[12px] text-ink-muted"><ArrowLeft className="h-3 w-3" /> Main menu</button>
          {lastReply && <div className="rounded-2xl border border-emerald/30 bg-emerald/10 p-2.5 text-[12.5px]">{lastReply}</div>}
          <div className="grid grid-cols-1 gap-2">
            {[{ d: 1, t: "Tomorrow" }, { d: 3, t: "3 days" }, { d: 7, t: "Next week" }].map((o) => (
              <button key={o.d} onClick={() => commit(o.d, o.t)} className="rounded-xl border border-border bg-elevated/60 px-4 py-3 text-left flex items-center justify-between hover:border-emerald/40">
                <span className="text-[13px] font-medium">I will pay {o.t.toLowerCase()}</span>
                <Check className="h-4 w-4 text-emerald" />
              </button>
            ))}
          </div>
        </div>
      </AppScreen>
    );
  }

  // ORDER STATUS
  if (screen === "status") {
    return (
      <AppScreen>
        <AppHeader title="Track Order" subtitle="Latest order status" right={headerRight} />
        <div className="px-4 pt-3 space-y-3">
          <button onClick={backToMenu} className="inline-flex items-center gap-1 text-[12px] text-ink-muted"><ArrowLeft className="h-3 w-3" /> Main menu</button>
          <div className="rounded-2xl border border-border bg-elevated p-4 text-[13px]">
            View live progress in your Orders tab. Each call-placed order moves through Credit Review → Approved → Ready for Fulfillment.
          </div>
        </div>
      </AppScreen>
    );
  }

  return null;
}
