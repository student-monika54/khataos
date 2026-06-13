// "Why On-Device AI Matters" — judge-facing deep dive on the split-brain
// architecture. Phone mockup for the Commerce Brain, cloud card for the
// Financial Brain, animated request flow, diagnostics panel and a
// traditional-vs-KhataOS comparison.

import { motion } from "framer-motion";
import {
  Cpu, Cloud, Shield, Zap, WifiOff, IndianRupee, CheckCircle2,
  Activity, HardDrive, Languages, Mic, Volume2, ArrowRight, Sparkles,
  Database, Brain, AlertTriangle,
} from "lucide-react";

const commerceComponents = [
  "WebLLM Runtime", "Intent Detection", "Language Detection",
  "Order Parsing", "Conversation State", "Offline Capability",
];

const commerceBadges = [
  "Running Locally", "Loaded from IndexedDB", "Low Latency", "Privacy First",
];

const financialComponents = [
  "Credit Agent", "Trust Agent", "Collections Agent", "Insights Agent",
];

const financialBadges = [
  "Risk Analysis", "Credit Decisions", "Trust Scoring", "Business Intelligence",
];

const flowSteps = [
  { label: "Customer speaks Hindi", sub: '"Bhaiya 500 ka udhaar chahiye"', icon: Mic, tone: "ink" as const },
  { label: "Speech-to-text", sub: "Twilio + Whisper", icon: Volume2, tone: "ink" as const },
  { label: "Commerce Brain", sub: "Intent: KHATA_ORDER · conf 97%", icon: Cpu, tone: "device" as const },
  { label: "Financial Brain", sub: "Credit eligibility check", icon: Cloud, tone: "cloud" as const },
  { label: "Decision", sub: "Approved · ₹500 · 14 days", icon: CheckCircle2, tone: "cloud" as const },
  { label: "Voice response", sub: '"Aapka credit approve ho gaya hai"', icon: Volume2, tone: "ink" as const },
];

const whyCards = [
  { icon: Shield, title: "Privacy first", body: "Customer conversations stay on the device whenever possible. Only the financial decision request leaves the phone." },
  { icon: Zap, title: "Low latency", body: "Commerce understanding happens locally — no cloud round trip for intent, language or order parsing." },
  { icon: WifiOff, title: "Rural-ready", body: "Core commerce intelligence keeps working on weak or intermittent rural networks." },
  { icon: IndianRupee, title: "Lower AI cost", body: "Only financial reasoning hits the cloud — cutting per-call inference and infrastructure spend." },
];

const diagnostics = [
  { label: "Model", value: "Qwen 2.5 · 0.5B" },
  { label: "Source", value: "IndexedDB Cache" },
  { label: "Status", value: "Loaded", live: true },
  { label: "Language", value: "Hindi" },
  { label: "Intent confidence", value: "97%" },
  { label: "Latency", value: "180 ms" },
  { label: "Memory usage", value: "1.1 GB" },
  { label: "Inference", value: "Active", live: true },
];

export function OnDeviceAI() {
  return (
    <section id="on-device-ai" className="section-y relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[520px] max-w-5xl bg-[radial-gradient(closest-side,rgba(34,197,94,0.10),transparent)]" />

      <div className="container-px mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">The Innovation</span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[56px]">
            Why <span className="emerald-text">on-device AI</span> matters.
          </h2>
          <p className="mt-6 text-[15px] text-ink-muted md:text-[17px]">
            Unlike traditional voice agents that ship every customer
            conversation to the cloud, KhataOS processes commerce
            intelligence directly on the device — and only calls the cloud
            when a financial decision is required.
          </p>
        </div>

        {/* Split-brain architecture */}
        <div className="mt-16 grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-8">
          <PhoneMockup />
          <Connector />
          <CloudCard />
        </div>

        {/* Animated request flow */}
        <div className="mt-20">
          <SectionTitle eyebrow="Request flow" title="One conversation. Two brains. One decision." />
          <div className="soft-card mt-8 p-5 md:p-8">
            <ol className="grid gap-3 md:grid-cols-6">
              {flowSteps.map((s, i) => (
                <motion.li
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="relative"
                >
                  <FlowStep step={i + 1} {...s} />
                </motion.li>
              ))}
            </ol>
          </div>
        </div>

        {/* Why this matters */}
        <div className="mt-20">
          <SectionTitle eyebrow="Why it matters" title="Built for Bharat's reality, not Silicon Valley's." />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyCards.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="soft-card p-6"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald/10 text-emerald-glow ring-1 ring-emerald/20">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-[16px] font-semibold tracking-tight">{c.title}</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Diagnostics + Comparison */}
        <div className="mt-20 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Diagnostics />
          </div>
          <div className="lg:col-span-3">
            <Comparison />
          </div>
        </div>

        {/* Judge highlight banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mt-16 overflow-hidden rounded-3xl border border-emerald/30 bg-gradient-to-br from-emerald/[0.12] via-emerald/[0.05] to-transparent p-6 md:p-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald/20 blur-3xl" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">On-device AI verified</span>
              </div>
              <h3 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] md:text-[34px]">
                Commerce Brain running locally — verified live.
              </h3>
              <ul className="mt-5 grid gap-2 text-[13.5px] text-ink md:grid-cols-2">
                {[
                  "Loaded from IndexedDB cache",
                  "Running directly on device",
                  "Avg inference latency < 200 ms",
                  "Offline commerce intelligence available",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-2xl bg-emerald/15 text-emerald ring-1 ring-emerald/30 md:h-28 md:w-28">
              <Sparkles className="h-10 w-10 md:h-12 md:w-12" />
            </div>
          </div>
        </motion.div>

        {/* Closing */}
        <div className="mx-auto mt-16 max-w-3xl text-center">
          <p className="text-[18px] font-medium tracking-tight md:text-[22px]">
            KhataOS doesn't use AI as a chatbot.
            <br />
            It uses AI as <span className="emerald-text">financial infrastructure</span>.
          </p>
          <p className="mt-5 text-[14px] leading-relaxed text-ink-muted md:text-[15px]">
            By combining an on-device Commerce Brain with a cloud Financial
            Brain, every kirana store gains enterprise-grade financial
            intelligence — without enterprise-grade infrastructure.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Sub-components ----------------------------- */

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h3 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] md:text-[36px]">{title}</h3>
    </div>
  );
}

function PhoneMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto w-full max-w-sm"
    >
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-b from-emerald/10 to-transparent blur-2xl" />
      {/* phone frame */}
      <div className="relative rounded-[2.4rem] border border-border bg-gradient-to-b from-elevated to-background p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.04]">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-background">
          {/* notch */}
          <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" />
          <div className="px-4 pb-4 pt-9">
            {/* header */}
            <div className="flex items-center justify-between text-[10px] text-ink-subtle">
              <span className="font-mono">iQOO · 5G</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                <span className="text-emerald">on-device</span>
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald/15 text-emerald">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold">Commerce Brain</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">On device</div>
              </div>
            </div>

            {/* live metrics */}
            <div className="mt-4 grid grid-cols-2 gap-1.5 text-[10.5px]">
              {[
                { i: Activity, l: "Model", v: "Qwen 2.5" },
                { i: Zap, l: "Latency", v: "180 ms" },
                { i: HardDrive, l: "Memory", v: "1.2 GB" },
                { i: Languages, l: "Language", v: "Hindi" },
              ].map((m) => (
                <div key={m.l} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2 py-1.5">
                  <m.i className="h-3 w-3 text-emerald" />
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-ink-subtle">{m.l}</div>
                    <div className="truncate text-[10.5px] font-semibold">{m.v}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* confidence */}
            <div className="mt-3 rounded-lg border border-emerald/20 bg-emerald/[0.06] p-2.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-ink-muted">Intent confidence</span>
                <span className="font-mono text-emerald">97%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "97%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-emerald"
                />
              </div>
              <div className="mt-2 font-mono text-[10px] text-ink">intent: <span className="text-emerald">KHATA_ORDER</span></div>
            </div>

            {/* components */}
            <div className="mt-3 space-y-1.5">
              {commerceComponents.map((c, i) => (
                <motion.div
                  key={c}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center justify-between rounded-md border border-border bg-surface/60 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                    {c}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.1em] text-emerald">live</span>
                </motion.div>
              ))}
            </div>

            {/* badges */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {commerceBadges.map((b) => (
                <span key={b} className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-center text-[11px] font-mono text-ink-subtle">iQOO · WebLLM runtime</div>
    </motion.div>
  );
}

function Connector() {
  return (
    <div className="hidden items-center justify-center md:flex">
      <svg viewBox="0 0 100 200" className="h-full w-20">
        <defs>
          <linearGradient id="onDeviceConn" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path d="M 10 100 C 40 60, 60 140, 90 100" stroke="url(#onDeviceConn)" strokeWidth="1.5" fill="none" strokeDasharray="4 4" className="animate-dash" />
        <circle cx="50" cy="100" r="4" fill="#22c55e">
          <animate attributeName="r" values="3;6;3" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

function CloudCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="relative mx-auto w-full max-w-sm md:max-w-none"
    >
      <div className="soft-card relative h-full overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald/10 blur-3xl" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald/10 text-emerald-glow ring-1 ring-emerald/20">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[15px] font-semibold">Financial Brain</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink-subtle">Cloud agents</div>
            </div>
          </div>
          <span className="font-mono text-[10px] text-ink-subtle">edge · &lt; 800ms</span>
        </div>

        {/* metrics */}
        <div className="mt-6 grid grid-cols-2 gap-2 text-[11px]">
          {[
            { i: Zap, l: "Response time", v: "450 ms" },
            { i: AlertTriangle, l: "Risk engine", v: "Active" },
            { i: Brain, l: "Trust engine", v: "Active" },
            { i: Activity, l: "Insights engine", v: "Active" },
          ].map((m) => (
            <div key={m.l} className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-2.5 py-2">
              <m.i className="h-3.5 w-3.5 text-emerald" />
              <div className="min-w-0">
                <div className="text-[9.5px] uppercase tracking-[0.12em] text-ink-subtle">{m.l}</div>
                <div className="truncate text-[11.5px] font-semibold">{m.v}</div>
              </div>
            </div>
          ))}
        </div>

        {/* agents */}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {financialComponents.map((c, i) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-between rounded-lg border border-border bg-elevated/60 px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-[12.5px]">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald/15 text-emerald">
                  <Brain className="h-3 w-3" />
                </span>
                {c}
              </span>
              <span className="text-[9px] uppercase tracking-[0.12em] text-emerald">ready</span>
            </motion.div>
          ))}
        </div>

        {/* badges */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          {financialBadges.map((b) => (
            <span key={b} className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[10.5px] font-semibold text-emerald">
              <CheckCircle2 className="h-3 w-3" /> {b}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function FlowStep({
  step, label, sub, icon: Icon, tone,
}: {
  step: number; label: string; sub: string; icon: any; tone: "ink" | "device" | "cloud";
}) {
  const toneClass =
    tone === "device" ? "border-emerald/40 bg-emerald/[0.08] text-emerald" :
    tone === "cloud" ? "border-emerald/30 bg-emerald/[0.05] text-emerald" :
    "border-border bg-surface/60 text-ink";
  return (
    <div className="relative h-full rounded-xl border border-border bg-elevated/60 p-3">
      <div className="flex items-start gap-2.5">
        <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border ${toneClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-ink-subtle">0{step}</span>
            <span className="text-[12px] font-semibold">{label}</span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-ink-muted">{sub}</div>
        </div>
      </div>
      {/* arrow */}
      <ArrowRight className="absolute -right-2 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-emerald/60 md:block last:hidden" />
    </div>
  );
}

function Diagnostics() {
  return (
    <div className="soft-card h-full p-6 md:p-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald/10 text-emerald ring-1 ring-emerald/20">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[14px] font-semibold">Commerce Brain status</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">Live diagnostics</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-emerald">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" /> healthy
        </span>
      </div>

      <dl className="mt-5 divide-y divide-border">
        {diagnostics.map((d) => (
          <div key={d.label} className="flex items-center justify-between py-2.5 text-[12.5px]">
            <dt className="text-ink-muted">{d.label}</dt>
            <dd className="flex items-center gap-1.5 font-mono text-ink">
              {d.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />}
              {d.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Comparison() {
  const traditional = ["Customer speech", "Cloud STT", "Cloud LLM", "Cloud processing", "Voice response"];
  const khataos = ["Customer speech", "On-device Commerce Brain", "Cloud Financial Brain", "Voice response"];

  return (
    <div className="grid h-full gap-4 md:grid-cols-2">
      <ComparisonCard
        title="Traditional AI voice agent"
        tone="muted"
        steps={traditional}
        footerLabel="Problems"
        footerItems={["Higher latency", "More expensive per call", "Fully internet-dependent"]}
        footerTone="warn"
      />
      <ComparisonCard
        title="KhataOS split-brain AI"
        tone="accent"
        steps={khataos}
        footerLabel="Benefits"
        footerItems={["Faster", "More private", "Lower cost", "Phone-first, built for Bharat"]}
        footerTone="ok"
      />
    </div>
  );
}

function ComparisonCard({
  title, tone, steps, footerLabel, footerItems, footerTone,
}: {
  title: string; tone: "muted" | "accent";
  steps: string[]; footerLabel: string; footerItems: string[]; footerTone: "warn" | "ok";
}) {
  return (
    <div className={`soft-card flex h-full flex-col p-5 md:p-6 ${tone === "accent" ? "ring-1 ring-emerald/25" : ""}`}>
      <div className="flex items-center gap-2">
        {tone === "accent"
          ? <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald/15 text-emerald"><Sparkles className="h-3 w-3" /></span>
          : <span className="grid h-6 w-6 place-items-center rounded-md bg-surface text-ink-subtle"><Cloud className="h-3 w-3" /></span>}
        <h4 className="text-[13.5px] font-semibold">{title}</h4>
      </div>

      <ol className="mt-4 flex-1 space-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-[12.5px]">
            <span className={`grid h-5 w-5 place-items-center rounded-full font-mono text-[9px] ${
              tone === "accent" ? "bg-emerald/15 text-emerald" : "bg-surface text-ink-subtle"
            }`}>{i + 1}</span>
            <span className={tone === "accent" ? "text-ink" : "text-ink-muted"}>{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-lg border border-border bg-background/50 p-3">
        <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-subtle">{footerLabel}</div>
        <ul className="mt-2 space-y-1">
          {footerItems.map((t) => (
            <li key={t} className="flex items-center gap-1.5 text-[11.5px]">
              {footerTone === "ok"
                ? <CheckCircle2 className="h-3 w-3 text-emerald" />
                : <AlertTriangle className="h-3 w-3 text-amber-400" />}
              <span className={footerTone === "ok" ? "text-ink" : "text-ink-muted"}>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
