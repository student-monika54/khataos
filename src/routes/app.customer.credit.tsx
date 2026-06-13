import { createFileRoute } from "@tanstack/react-router";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";

export const Route = createFileRoute("/app/customer/credit")({
  component: CreditScreen,
});

function CreditScreen() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const available = Math.max(0, me.creditLimit - me.outstanding);
  const util = Math.min(100, (me.outstanding / Math.max(1, me.creditLimit)) * 100);

  return (
    <AppScreen>
      <AppHeader title="Credit" subtitle="Khata at Sharma Kirana" back />
      <div className="px-4 pt-4">
        <div className="rounded-3xl border border-border bg-elevated/60 p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Available credit</div>
          <div className="mt-1 font-display text-[40px] font-semibold leading-none tracking-tight text-emerald">
            {formatINR(available)}
          </div>
          <div className="mt-1 text-[12px] text-ink-muted">of {formatINR(me.creditLimit)} limit</div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/60">
            <div className="h-full rounded-full bg-emerald" style={{ width: `${100 - util}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-ink-subtle">
            <span>Outstanding {formatINR(me.outstanding)}</span>
            <span>{Math.round(util)}% used</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="Trust" value={String(me.trustScore)} accent />
          <StatCard label="Reliability" value={`${me.reliability}%`} />
          <StatCard label="Cycle" value="30d" />
        </div>
      </div>

      <Section title="Repayment History">
        <ul className="overflow-hidden rounded-2xl border border-border bg-elevated/60 divide-y divide-border">
          {me.txns.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium capitalize">{t.kind}</div>
                <div className="truncate text-[11px] text-ink-muted">
                  {t.note ?? "—"} · {new Date(t.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"2-digit" })}
                </div>
              </div>
              <div className={`text-sm font-semibold ${t.kind === "repayment" ? "text-emerald" : "text-foreground"}`}>
                {t.kind === "repayment" ? "+" : "−"}{formatINR(t.amount)}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </AppScreen>
  );
}
