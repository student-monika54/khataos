import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useKhata, formatINR, recordRepayment } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { CheckCircle2, TrendingUp, Sparkles, ArrowUpRight, Calendar, Wallet, CreditCard } from "lucide-react";

export const Route = createFileRoute("/app/customer/credit")({
  component: CreditAndPayments,
});

type Tab = "credit" | "payments";

function CreditAndPayments() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const available = Math.max(0, me.creditLimit - me.outstanding);
  const util = Math.min(100, (me.outstanding / Math.max(1, me.creditLimit)) * 100);
  const [tab, setTab] = useState<Tab>("credit");
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState(false);

  const submit = (full?: boolean) => {
    const n = full ? me.outstanding : parseInt(amount || "0");
    if (n <= 0) return;
    recordRepayment(me.id, n);
    setAmount("");
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  };

  return (
    <AppScreen>
      <AppHeader title="Credit & Payments" subtitle="Your financial relationship" back />

      {/* Segmented toggle */}
      <div className="px-4 pt-4">
        <div className="inline-flex w-full rounded-full border border-border bg-elevated/60 p-1">
          {(["credit", "payments"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-4 py-2 text-[12.5px] font-semibold capitalize transition ${
                tab === t ? "bg-emerald text-[#06140b]" : "text-ink-muted"
              }`}
            >
              {t === "credit" ? "Credit" : "Payments"}
            </button>
          ))}
        </div>
      </div>

      {tab === "credit" ? (
        <>
          <div className="px-4 pt-4">
            <div className="rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/15 via-elevated to-elevated p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-emerald">Available credit</div>
              <div className="mt-1 font-display text-[40px] font-semibold leading-none tracking-tight text-emerald">
                {formatINR(available)}
              </div>
              <div className="mt-1 text-[12px] text-ink-muted">of {formatINR(me.creditLimit)} limit</div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/60">
                <div className="h-full rounded-full bg-emerald" style={{ width: `${100 - util}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-[11px] text-ink-subtle">
                <span>Used {formatINR(me.outstanding)}</span>
                <span>{Math.round(util)}% utilized</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatCard label="Limit" value={formatINR(me.creditLimit)} />
              <StatCard label="Available" value={formatINR(available)} accent />
              <StatCard label="Used %" value={`${Math.round(util)}%`} />
            </div>
          </div>

          <Section title="AI Credit Recommendation">
            <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/60 p-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-emerald">
                <Sparkles className="h-3 w-3" /> Eligibility predictor
              </div>
              <p className="mt-2 text-[13px] leading-snug text-foreground">
                Based on your repayment history, you're eligible for a{" "}
                <span className="font-semibold text-emerald">
                  {formatINR(Math.round(me.creditLimit * 0.15))} credit increase
                </span>{" "}
                next cycle.
              </p>
              <button className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-[12px] font-semibold text-[#06140b]">
                <TrendingUp className="h-3.5 w-3.5" /> Request credit increase
              </button>
            </div>
          </Section>

          <Section title="Credit history">
            <ul className="overflow-hidden rounded-2xl border border-border bg-elevated/60 divide-y divide-border">
              {me.txns.filter((t) => t.kind !== "repayment").map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium capitalize">{t.kind}</div>
                    <div className="truncate text-[11px] text-ink-muted">
                      {t.note ?? "—"} · {new Date(t.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"2-digit" })}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">−{formatINR(t.amount)}</div>
                </li>
              ))}
            </ul>
          </Section>
        </>
      ) : (
        <>
          <div className="px-4 pt-4">
            <div className="rounded-3xl border border-border bg-elevated/60 p-5 text-center">
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Outstanding balance</div>
              <div className="mt-2 font-display text-[44px] font-semibold tracking-tight">
                {formatINR(me.outstanding)}
              </div>
              {me.dueDate && (
                <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-ink-muted">
                  <Calendar className="h-3 w-3" /> Due {new Date(me.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"long" })}
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-elevated/60 p-4">
              <label className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Pay amount</label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-semibold text-ink-muted">₹</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric" placeholder="0"
                  className="w-full bg-transparent font-display text-3xl font-semibold tracking-tight outline-none placeholder:text-ink-subtle"
                />
              </div>
              <div className="mt-3 flex gap-2">
                {[200, 500, 1000].map((v) => (
                  <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-full border border-border bg-surface py-2 text-[12px] font-medium text-ink">
                    {formatINR(v)}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => submit(false)} className="rounded-full border border-border bg-surface py-3 text-sm font-semibold">
                  Partial pay
                </button>
                <button onClick={() => submit(true)} className="rounded-full bg-emerald py-3 text-sm font-semibold text-[#06140b]">
                  Pay full {formatINR(me.outstanding)}
                </button>
              </div>
              {done && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald/15 px-3 py-2 text-[12px] font-medium text-emerald">
                  <CheckCircle2 className="h-4 w-4" /> Repayment recorded — trust +1
                </div>
              )}
            </div>
          </div>

          <Section title="Repayment history">
            <ul className="overflow-hidden rounded-2xl border border-border bg-elevated/60 divide-y divide-border">
              {me.txns.filter((t) => t.kind === "repayment").map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">Repayment</div>
                    <div className="text-[11px] text-ink-muted">{new Date(t.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"2-digit" })}</div>
                  </div>
                  <div className="text-sm font-semibold text-emerald">+{formatINR(t.amount)}</div>
                </li>
              ))}
              {me.txns.filter((t) => t.kind === "repayment").length === 0 && (
                <li className="px-4 py-6 text-center text-[12px] text-ink-muted">No payments yet</li>
              )}
            </ul>
          </Section>
        </>
      )}
    </AppScreen>
  );
}
