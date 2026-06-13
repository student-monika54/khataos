import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Store, User, Download, CheckCircle2 } from "lucide-react";
import { useKhata, installBrain } from "@/lib/khataos/data";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/khataos-logo.png.asset.json";

export const Route = createFileRoute("/app/")({
  component: RolePicker,
});

function RolePicker() {
  const brainInstalled = useKhata((s) => s.brainInstalled);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!installing) return;
    if (progress >= 100) {
      installBrain();
      const t = setTimeout(() => setInstalling(false), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgress((p) => Math.min(100, p + 7 + Math.random() * 10)), 180);
    return () => clearTimeout(t);
  }, [installing, progress]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-12">
        <div className="flex items-center gap-3">
          <img src={logoAsset.url} alt="KhataOS" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <div className="font-display text-lg font-semibold tracking-tight">KhataOS</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-emerald">AI Microbank</div>
          </div>
        </div>

        <h1 className="mt-10 font-display text-[34px] font-semibold leading-[1.05] tracking-tight">
          A trust-aware<br/>financial OS for<br/>
          <span className="text-emerald">every kirana</span>.
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">
          Conversational credit, AI trust scoring and split-brain financial intelligence. Choose how you'd like to enter.
        </p>

        {/* Commerce brain install */}
        <div className="mt-8 rounded-2xl border border-border bg-elevated/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Commerce Brain</div>
              <div className="mt-1 text-sm font-medium">
                {brainInstalled ? "Installed on device" : "On-device AI · 38 MB"}
              </div>
            </div>
            {brainInstalled ? (
              <CheckCircle2 className="h-6 w-6 text-emerald" />
            ) : installing ? (
              <div className="text-sm font-semibold text-emerald">{Math.round(progress)}%</div>
            ) : (
              <button
                onClick={() => { setInstalling(true); setProgress(0); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-3 py-1.5 text-[12px] font-semibold text-emerald"
              >
                <Download className="h-3.5 w-3.5" /> Install
              </button>
            )}
          </div>
          {installing && (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full bg-emerald transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-ink-subtle">
            Multilingual intent + speech runs locally. Financial decisions stream from the cloud brain.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {[
            { to: "/app/customer", icon: User, title: "I am a Customer", sub: "Voice-first credit, repayments & trust" },
            { to: "/app/shopkeeper", icon: Store, title: "I am a Shopkeeper", sub: "Ledger, collections & AI insights" },
          ].map((r, i) => (
            <motion.div
              key={r.to}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.05 }}
            >
              <Link
                to={r.to}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-elevated/60 p-4 transition-colors hover:border-emerald/40"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald/10 text-emerald">
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[15px] font-semibold">{r.title}</div>
                  <div className="text-[12px] text-ink-muted">{r.sub}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-emerald" />
              </Link>
            </motion.div>
          ))}
        </div>

        <Link to="/" className="mt-8 block text-center text-[12px] text-ink-subtle hover:text-ink">
          ← Back to landing
        </Link>
      </div>
    </div>
  );
}
