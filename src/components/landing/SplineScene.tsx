import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Brain,
  Store,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Bot,
  Wallet,
} from "lucide-react";

/**
 * HeroScene — premium fintech "3D" composition built from layered SVG + CSS.
 *
 * Center: glowing AI Financial Brain
 * Left:   isometric Kirana store
 * Right:  smartphone with multilingual conversation
 * Orbit:  Trust / Credit / Collections / Repayment modules
 * Flow:   animated voice → commerce → financial → decision → dashboard
 */
export function SplineScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setMx((e.clientX - r.left) / r.width - 0.5);
      setMy((e.clientY - r.top) / r.height - 0.5);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-elevated via-surface to-background"
      style={{ perspective: "1400px" }}
    >
      {/* grid backdrop */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/20 blur-3xl animate-ambient" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1/3 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-glow/30 blur-2xl" />

      {/* 3D rotation wrap */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotateY(${mx * 6}deg) rotateX(${-my * 6}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 250ms ease-out",
        }}
      >
        {/* flow lines */}
        <FlowLines />

        {/* orbital rings */}
        <div className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-emerald/15 animate-spin-slow" />
        <div className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald/10 animate-spin-reverse" />

        {/* center: AI brain */}
        <AIBrain />

        {/* left: kirana store (isometric) */}
        <div
          className="absolute left-[6%] top-[18%] hidden md:block"
          style={{ transform: "translateZ(40px)" }}
        >
          <KiranaStore />
        </div>

        {/* right: smartphone */}
        <div
          className="absolute right-[5%] top-[14%] hidden md:block"
          style={{ transform: "translateZ(60px)" }}
        >
          <PhoneCard />
        </div>

        {/* orbital modules */}
        <OrbitChip
          className="left-[12%] bottom-[16%]"
          icon={ShieldCheck}
          label="Trust Score"
          value="812"
          delay={0.6}
        />
        <OrbitChip
          className="left-[40%] bottom-[6%]"
          icon={CreditCard}
          label="Credit Intelligence"
          value="₹500 approved"
          delay={0.9}
        />
        <OrbitChip
          className="right-[12%] bottom-[18%]"
          icon={Bot}
          label="Collections Agent"
          value="Auto-reminder"
          delay={1.1}
        />
        <OrbitChip
          className="right-[36%] top-[10%]"
          icon={Wallet}
          label="Repayment Engine"
          value="On-track"
          delay={1.3}
        />
      </div>

      {/* corner status */}
      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[10px] font-medium text-emerald-glow">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald/70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
        </span>
        AI Brain · Live
      </div>
      <div className="absolute right-4 top-4 rounded-full border border-border bg-surface/80 px-2.5 py-1 font-mono text-[10px] text-ink-muted backdrop-blur">
        v1.0 · on-device
      </div>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function AIBrain() {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      style={{ transform: "translate(-50%,-50%) translateZ(80px)" }}
    >
      <div className="relative">
        <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full bg-emerald/30" />
        <span
          className="absolute inset-0 -z-10 animate-pulse-ring rounded-full bg-emerald/20"
          style={{ animationDelay: "1s" }}
        />
        <div className="relative grid h-28 w-28 place-items-center rounded-2xl border border-emerald/40 bg-gradient-to-br from-elevated to-background shadow-[0_0_60px_-10px_var(--emerald)]">
          <div className="absolute inset-1 rounded-xl ring-1 ring-inset ring-white/5" />
          <Brain className="h-10 w-10 text-emerald-glow" />
        </div>
        <div className="mt-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-glow">
            Financial Brain
          </div>
          <div className="font-mono text-[10px] text-ink-subtle">khataos://core</div>
        </div>
      </div>
    </motion.div>
  );
}

function KiranaStore() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.7 }}
      className="glass-card flex w-[170px] flex-col gap-2 p-3"
    >
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-emerald/10 text-emerald-glow">
          <Store className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-xs font-semibold text-foreground">Sharma Kirana</div>
          <div className="text-[10px] text-ink-muted">Lucknow · 4.8★</div>
        </div>
      </div>
      <div className="rounded-md border border-border bg-background/40 p-2">
        <div className="flex items-center justify-between text-[10px] text-ink-muted">
          <span>Today's khata</span>
          <span className="font-mono text-emerald-glow">+₹12,480</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald to-emerald-glow" />
        </div>
      </div>
    </motion.div>
  );
}

function PhoneCard() {
  const lines = [
    { from: "user", text: "Salary kal aayegi." },
    { from: "ai", text: "₹500 approved · trust 812" },
    { from: "user", text: "Atta 2kg, tel 1L khate me." },
    { from: "ai", text: "Added · balance ₹1,180" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.7 }}
      className="relative w-[170px] rounded-[26px] border border-border bg-background p-1.5 shadow-[0_25px_70px_-20px_rgba(0,0,0,0.7)]"
    >
      <div className="absolute left-1/2 top-1.5 z-10 h-3 w-16 -translate-x-1/2 rounded-b-xl bg-background" />
      <div className="relative h-[230px] overflow-hidden rounded-[20px] bg-elevated">
        <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
          <div className="grid h-5 w-5 place-items-center rounded-full bg-emerald/15">
            <Smartphone className="h-2.5 w-2.5 text-emerald-glow" />
          </div>
          <div className="text-[9px] font-semibold text-foreground">KhataOS AI</div>
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald" />
        </div>
        <div className="flex flex-col gap-1.5 p-2">
          {lines.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.4, duration: 0.4 }}
              className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-2 py-1.5 text-[9.5px] leading-snug ${
                  m.from === "user"
                    ? "bg-foreground text-background"
                    : "border border-emerald/30 bg-emerald/10 text-emerald-glow"
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function OrbitChip({
  className,
  icon: Icon,
  label,
  value,
  delay,
}: {
  className?: string;
  icon: typeof Brain;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className={`absolute ${className}`}
    >
      <div className="glass-card flex items-center gap-2 px-2.5 py-1.5 animate-float-slow" style={{ animationDelay: `${delay}s` }}>
        <div className="grid h-6 w-6 place-items-center rounded-md bg-emerald/15 text-emerald-glow">
          <Icon className="h-3 w-3" />
        </div>
        <div className="leading-tight">
          <div className="text-[10px] font-medium text-foreground">{label}</div>
          <div className="font-mono text-[9px] text-ink-muted">{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

function FlowLines() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="flow" x1="0" x2="1">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0" />
          <stop offset="0.5" stopColor="#22c55e" stopOpacity="0.8" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* left store -> brain */}
      <path
        d="M 18 32 C 32 42, 42 48, 50 50"
        stroke="url(#flow)"
        strokeWidth="0.4"
        fill="none"
        strokeDasharray="2 3"
        className="animate-dash"
      />
      {/* phone -> brain */}
      <path
        d="M 82 28 C 70 40, 60 46, 50 50"
        stroke="url(#flow)"
        strokeWidth="0.4"
        fill="none"
        strokeDasharray="2 3"
        className="animate-dash"
        style={{ animationDelay: "0.5s" }}
      />
      {/* brain -> modules */}
      <path d="M 50 50 C 40 65, 28 76, 18 82" stroke="url(#flow)" strokeWidth="0.4" fill="none" strokeDasharray="2 3" className="animate-dash" />
      <path d="M 50 50 C 50 70, 50 80, 48 90" stroke="url(#flow)" strokeWidth="0.4" fill="none" strokeDasharray="2 3" className="animate-dash" style={{ animationDelay: "0.8s" }} />
      <path d="M 50 50 C 62 65, 74 76, 82 82" stroke="url(#flow)" strokeWidth="0.4" fill="none" strokeDasharray="2 3" className="animate-dash" style={{ animationDelay: "1.1s" }} />
      <path d="M 50 50 C 60 35, 65 22, 65 14" stroke="url(#flow)" strokeWidth="0.4" fill="none" strokeDasharray="2 3" className="animate-dash" style={{ animationDelay: "1.4s" }} />
    </svg>
  );
}
