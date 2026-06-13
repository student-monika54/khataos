import { createFileRoute } from "@tanstack/react-router";
import { useKhata, formatINR, recordRepayment } from "@/lib/khataos/data";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/customer/repayments")({
  component: Repayments,
});

function Repayments() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
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
      <AppHeader title="Repayments" subtitle="Settle your khata" back />
      <div className="px-4 pt-4">
        <div className="rounded-3xl border border-border bg-elevated/60 p-5 text-center">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Outstanding</div>
          <div className="mt-2 font-display text-[44px] font-semibold tracking-tight">
            {formatINR(me.outstanding)}
          </div>
          {me.dueDate && (
            <div className="mt-1 text-[12px] text-ink-muted">
              Next due {new Date(me.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"long" })}
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

      <Section title="Payment history">
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
        </ul>
      </Section>
    </AppScreen>
  );
}
