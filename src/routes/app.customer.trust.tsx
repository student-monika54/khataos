import { createFileRoute } from "@tanstack/react-router";
import { useKhata } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import { ShieldCheck, TrendingUp, Calendar, Wallet } from "lucide-react";

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

function TrustProfile() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const factors = [
    { icon: Wallet, label: "Payment reliability", value: `${me.reliability}%`, hint: "On-time repayments" },
    { icon: Calendar, label: "Repayment behaviour", value: me.reliability > 85 ? "Excellent" : "Steady", hint: "Average days to pay" },
    { icon: TrendingUp, label: "Credit utilization", value: `${Math.round((me.outstanding / me.creditLimit) * 100)}%`, hint: "Of limit used" },
    { icon: ShieldCheck, label: "Risk tier", value: (me.riskTag ?? "low").toUpperCase(), hint: "AI assessed" },
  ];

  return (
    <AppScreen>
      <AppHeader title="Trust Profile" subtitle="AI-assessed financial reputation" back />
      <div className="px-4 pt-4 flex flex-col items-center">
        <Ring value={me.trustScore} />
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-3 py-1 text-[12px] font-medium text-emerald">
          <TrendingUp className="h-3 w-3" /> Eligible for limit increase
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 px-4">
        {factors.map((f) => (
          <StatCard key={f.label} label={f.label} value={f.value} hint={f.hint} />
        ))}
      </div>

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
