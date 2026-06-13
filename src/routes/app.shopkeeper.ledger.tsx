import { createFileRoute } from "@tanstack/react-router";
import { useKhata, formatINR } from "@/lib/khataos/data";
import { AppHeader, AppScreen } from "@/components/app/AppShell";
import { useState } from "react";

export const Route = createFileRoute("/app/shopkeeper/ledger")({
  component: Ledger,
});

function Ledger() {
  const customers = useKhata((s) => s.customers);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <AppScreen>
      <AppHeader title="Customer Ledger" subtitle={`${customers.length} accounts`} back />
      <ul className="px-4 pt-4 space-y-2.5">
        {customers.map((c) => {
          const open = openId === c.id;
          const util = Math.round((c.outstanding / Math.max(1, c.creditLimit)) * 100);
          return (
            <li key={c.id} className="rounded-2xl border border-border bg-elevated/60">
              <button
                onClick={() => setOpenId(open ? null : c.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald/15 text-[13px] font-semibold text-emerald">
                  {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[14px] font-semibold">{c.name}</div>
                  <div className="text-[11px] text-ink-muted">{c.phone} · Trust {c.trustScore}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${c.outstanding > 0 ? "text-foreground" : "text-emerald"}`}>
                    {formatINR(c.outstanding)}
                  </div>
                  <div className="text-[11px] text-ink-subtle">{util}% used</div>
                </div>
              </button>
              {open && (
                <div className="border-t border-border/60 p-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">Limit</div><div className="mt-1 text-sm font-semibold">{formatINR(c.creditLimit)}</div></div>
                    <div><div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">Reliability</div><div className="mt-1 text-sm font-semibold">{c.reliability}%</div></div>
                    <div><div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">Risk</div><div className={`mt-1 text-sm font-semibold uppercase ${c.riskTag === "high" ? "text-red-400" : c.riskTag === "medium" ? "text-amber-300" : "text-emerald"}`}>{c.riskTag}</div></div>
                  </div>
                  <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-surface/40">
                    {c.txns.slice(0, 6).map((t) => (
                      <li key={t.id} className="flex items-center justify-between px-3 py-2 text-[12px]">
                        <div className="min-w-0">
                          <div className="font-medium capitalize">{t.kind}</div>
                          <div className="truncate text-[10px] text-ink-muted">{t.note ?? "—"} · {new Date(t.date).toLocaleDateString("en-IN")}</div>
                        </div>
                        <span className={`font-semibold ${t.kind === "repayment" ? "text-emerald" : ""}`}>
                          {t.kind === "repayment" ? "+" : "−"}{formatINR(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </AppScreen>
  );
}
