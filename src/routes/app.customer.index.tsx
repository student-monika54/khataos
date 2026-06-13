import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { AppHeader, AppScreen, StatCard, Section } from "@/components/app/AppShell";
import {
  Mic, ArrowUpRight, TrendingUp, Phone, Package, Wallet, Sparkles, Calendar,
} from "lucide-react";

export const Route = createFileRoute("/app/customer/")({
  component: CustomerHome,
});

type LiveOrder = {
  id: string; customerId: string; items: { name: string; quantity: string }[];
  amount?: number; stage: string; createdAt: number;
};

function CustomerHome() {
  const me = useKhata((s) => s.customers.find((c) => c.id === s.me.id)!);
  const available = Math.max(0, me.creditLimit - me.outstanding);
  const util = Math.round((me.outstanding / Math.max(1, me.creditLimit)) * 100);

  const [activeCount, setActiveCount] = useState(0);
  const firstLoad = useRef(true);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const r = await fetch("/api/khataos/orders/live");
        if (!r.ok) return;
        const data: LiveOrder[] = await r.json();
        if (!mounted) return;
        const mine = data.filter((o) => o.customerId === me.id || o.customerId?.startsWith("c_"));
        setActiveCount(mine.filter((o) => o.stage !== "rejected" && o.stage !== "ready_for_fulfillment").length);
        firstLoad.current = false;
      } catch {}
    }
    poll();
    const id = setInterval(poll, 1500);
    return () => { mounted = false; clearInterval(id); };
  }, [me.id]);

  return (
    <AppScreen>
      <AppHeader title={`Namaste, ${me.name.split(" ")[0]}`} subtitle="Your KhataOS dashboard" />
      <div className="px-4 pt-4">
        {/* Hero — Trust + Credit */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/15 via-elevated to-elevated p-5">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-emerald">Trust Score</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-semibold tracking-tight">{me.trustScore}</span>
                  <span className="text-xs text-ink-muted">/100</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.14em] text-emerald">Available</div>
                <div className="mt-1 font-display text-3xl font-semibold tracking-tight text-emerald">
                  {formatINR(available)}
                </div>
                <div className="text-[10.5px] text-ink-muted">of {formatINR(me.creditLimit)}</div>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background/60">
              <div className="h-full rounded-full bg-emerald" style={{ width: `${me.trustScore}%` }} />
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-emerald">
              <TrendingUp className="h-3 w-3" /> Eligible for credit increase next cycle
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="Outstanding" value={formatINR(me.outstanding)}
            hint={me.dueDate ? `Due ${new Date(me.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}` : "—"} />
          <StatCard label="Active orders" value={String(activeCount)} hint="In progress" accent={activeCount > 0} />
          <StatCard label="Utilized" value={`${util}%`} hint="of limit" />
        </div>

        {/* Primary CTA */}
        <Link
          to="/app/customer/call"
          className="mt-5 flex items-center justify-between rounded-2xl border border-emerald/40 bg-gradient-to-r from-emerald to-emerald/80 px-5 py-4 text-[#06140b] shadow-[0_10px_40px_-10px_rgba(34,197,94,0.5)]"
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Voice</div>
            <div className="font-display text-lg font-semibold">Call KhataOS</div>
            <div className="text-[12px] opacity-80">Place orders · हिन्दी · English · ಕನ್ನಡ</div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#06140b] text-emerald">
            <Phone className="h-5 w-5" />
          </div>
        </Link>

        {/* Quick actions grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <QuickAction to="/app/customer/orders" icon={Package} label="View Orders" sub={activeCount > 0 ? `${activeCount} active` : "Track in real-time"} />
          <QuickAction to="/app/customer/credit" icon={Wallet} label="Pay Outstanding" sub={formatINR(me.outstanding)} />
          <QuickAction to="/app/customer/credit" icon={TrendingUp} label="Credit Increase" sub="Eligible · check" />
          <QuickAction to="/app/customer/voice" icon={Mic} label="Quick Voice" sub="Ask anything" />
        </div>
      </div>

      <Section title="Financial recommendations">
        <div className="rounded-2xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.08] to-elevated/60 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-emerald">
            <Sparkles className="h-3 w-3" /> AI suggestion
          </div>
          <p className="mt-2 text-[13px] leading-snug text-foreground">
            Pay <span className="font-semibold text-emerald">{formatINR(Math.min(me.outstanding, 500))}</span> before {me.dueDate ? new Date(me.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" }) : "due"} to push your trust score above 90 and unlock a higher credit limit.
          </p>
        </div>
      </Section>

      <Section title="Recent activity" action={
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

function QuickAction({ to, icon: Icon, label, sub }: { to: string; icon: any; label: string; sub: string }) {
  return (
    <Link to={to as any} className="flex items-center gap-3 rounded-2xl border border-border bg-elevated/60 px-3.5 py-3 transition hover:border-emerald/40">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald/15 text-emerald">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-semibold">{label}</div>
        <div className="truncate text-[10.5px] text-ink-muted">{sub}</div>
      </div>
    </Link>
  );
}
