import { createFileRoute } from "@tanstack/react-router";
import { useKhata } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { Sparkline } from "@/components/app/Sparkline";
import { ShieldCheck, TrendingUp, Calendar, Wallet, Activity, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/app/customer/trust")({
  component: TrustProfile,
});

function Ring({ value }: { value: number }) {
  const r = 60, c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg viewBox="0 0 140 140" className="h-44 w-44">
      <circle cx="70" cy="70" r={r} stroke="oklch(0.28 0.008 260)" strokeWidth="10" fill="none" />
      <circle cx="70" cy="70" r={r} stroke="oklch(0.74 0.18 152)" strokeWidth="10" fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 70 70)" />
      <text x="70" y="74" textAnchor="middle" className="fill-foreground" style={{ font: "600 32px 'Space Grotesk'" }}>{value}</text>
      <text x="70" y="92" textAnchor="middle" className="fill-[oklch(0.66_0.01_250)]" style={{ font: "500 10px Inter", letterSpacing: "0.14em" }}>TRUST SCORE</text>
    </svg>
  );
}

// Deterministic 12-month synthesis from the current score so the chart
// stays stable across renders without persisted history.
function synthTimeline(seed: number, current: number, months = 12) {
  const out: number[] = [];
  let v = Math.max(40, current - 18);
  for (let i = 0; i < months; i++) {
    const noise = ((Math.sin(seed * (i + 1) * 1.7) + 1) / 2) * 6 - 2;
    const drift = (current - v) * 0.18;
    v = Math.max(35, Math.min(99, v + drift + noise));
    out.push(Math.round(v));
  }
  out[out.length - 1] = current;
  return out;
}

function TrustProfile() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const trustSeries = synthTimeline(me.trustScore, me.trustScore);
  const utilSeries = synthTimeline(me.reliability, Math.round((me.outstanding / me.creditLimit) * 100));
  const reliabilitySeries = synthTimeline(me.reliability + 3, me.reliability);
  const trustDelta = trustSeries[trustSeries.length - 1] - trustSeries[0];

  const factors = [
    { icon: Wallet, label: "Payment reliability", value: `${me.reliability}%`, hint: "On-time repayments" },
    { icon: Calendar, label: "Repayment behaviour", value: me.reliability > 85 ? "Excellent" : "Steady", hint: "Average days to pay" },
    { icon: TrendingUp, label: "Credit utilization", value: `${Math.round((me.outstanding / me.creditLimit) * 100)}%`, hint: "Of limit used" },
    { icon: ShieldCheck, label: "Risk tier", value: (me.riskTag ?? "low").toUpperCase(), hint: "AI assessed" },
  ];

  const eligibilityNext = Math.min(99, me.trustScore + Math.round(me.reliability / 12));
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  return (
    <AppScreen>
      <AppHeader title="Trust Profile" subtitle="AI-assessed financial reputation" back />
      <div className="px-4 pt-4 flex flex-col items-center">
        <Ring value={me.trustScore} />
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-3 py-1 text-[12px] font-medium text-emerald">
          <TrendingUp className="h-3 w-3" /> +{trustDelta} this year · eligible for limit raise
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 px-4">
        {factors.map((f) => (
          <StatCard key={f.label} label={f.label} value={f.value} hint={f.hint} />
        ))}
      </div>

      <Section title="Trust timeline · 12 months">
        <div className="rounded-2xl border border-border bg-elevated/60 p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Current score</div>
              <div className="font-display text-2xl font-semibold text-emerald">{me.trustScore}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Year delta</div>
              <div className="font-display text-lg font-semibold text-emerald">+{trustDelta}</div>
            </div>
          </div>
          <div className="mt-3">
            <Sparkline values={trustSeries} height={70} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-ink-subtle">
            {months.filter((_, i) => i % 2 === 0).map((m) => <span key={m}>{m}</span>)}
          </div>
        </div>
      </Section>

      <Section title="Credit utilization">
        <div className="rounded-2xl border border-border bg-elevated/60 p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">% of limit used over time</div>
          <Sparkline values={utilSeries} height={48} color="oklch(0.74 0.16 50)" />
        </div>
      </Section>

      <Section title="Repayment behaviour">
        <div className="rounded-2xl border border-border bg-elevated/60 p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">On-time repayment rate</div>
          <Sparkline values={reliabilitySeries} height={48} color="oklch(0.74 0.14 240)" />
        </div>
      </Section>

      <Section title="Eligibility predictor">
        <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-emerald">Next month projection</div>
              <div className="mt-1 font-display text-3xl font-semibold">{eligibilityNext}</div>
              <div className="mt-0.5 text-[11px] text-ink-muted">If current behaviour continues</div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald/15 text-emerald">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald" />
            Estimated new credit limit: <span className="font-semibold text-foreground">₹{Math.round(me.creditLimit * 1.15).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </Section>

      <Section title="How it's calculated">
        <div className="rounded-2xl border border-border bg-elevated/60 p-4">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            The KhataOS Trust Agent combines repayment history, credit utilization, purchase consistency and shopkeeper sentiment. It updates in real time and is portable across stores in the KhataOS network.
          </p>
        </div>
      </Section>
    </AppScreen>
  );
}
