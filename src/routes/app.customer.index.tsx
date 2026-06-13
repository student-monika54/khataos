import { createFileRoute, Link } from "@tanstack/react-router";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { Mic, ArrowUpRight, TrendingUp, Phone } from "lucide-react";

export const Route = createFileRoute("/app/customer/")({
  component: CustomerHome,
});

function CustomerHome() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const available = Math.max(0, me.creditLimit - me.outstanding);

  return (
    <AppScreen>
      <AppHeader title={`Namaste, ${me.name.split(" ")[0]}`} subtitle="Your KhataOS dashboard" />
      <div className="px-4 pt-4">
        {/* Hero trust card */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/15 via-elevated to-elevated p-5">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald/20 blur-3xl" />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.14em] text-emerald">Trust Score</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-5xl font-semibold tracking-tight">{me.trustScore}</span>
              <span className="text-sm text-ink-muted">/100</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-[11px] font-medium text-emerald">
                <TrendingUp className="h-3 w-3" /> +3 this week
              </span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background/60">
              <div className="h-full rounded-full bg-emerald" style={{ width: `${me.trustScore}%` }} />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
              Reliable repayments at Sharma Kirana. Eligible for limit increase next cycle.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard label="Available Credit" value={formatINR(available)} hint={`of ${formatINR(me.creditLimit)}`} accent />
          <StatCard label="Outstanding" value={formatINR(me.outstanding)} hint={me.dueDate ? `Due ${new Date(me.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}` : "—"} />
        </div>

        {/* Primary CTA — Call */}
        <Link
          to="/app/customer/call"
          className="mt-5 flex items-center justify-between rounded-2xl border border-emerald/40 bg-gradient-to-r from-emerald to-emerald/80 px-5 py-4 text-[#06140b] shadow-[0_10px_40px_-10px_rgba(34,197,94,0.5)]"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Live Call</div>
            <div className="font-display text-lg font-semibold">Call KhataOS</div>
            <div className="text-[12px] opacity-80">Voice AI · Commerce + Financial Brain</div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#06140b] text-emerald">
            <Phone className="h-5 w-5" />
          </div>
        </Link>

        <Link to="/app/customer/voice" className="mt-2 flex items-center justify-between rounded-2xl border border-border bg-elevated/60 px-4 py-3">
          <div>
            <div className="text-[12px] font-semibold">Quick voice query</div>
            <div className="text-[11px] text-ink-muted">Tap to speak · हिन्दी · English · ಕನ್ನಡ</div>
          </div>
          <Mic className="h-4 w-4 text-emerald" />
        </Link>
      </div>

      <Section title="Recent Activity" action={
        <Link to="/app/customer/credit" className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald">View all <ArrowUpRight className="h-3 w-3" /></Link>
      }>
        <ul className="overflow-hidden rounded-2xl border border-border bg-elevated/60 divide-y divide-border">
          {me.txns.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {t.kind === "repayment" ? "Repayment" : t.kind === "credit" ? "Credit purchase" : "Order"}
                </div>
                <div className="truncate text-[11px] text-ink-muted">
                  {t.note ?? "—"} · {new Date(t.date).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
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
