import { motion } from "framer-motion";
import { Cpu, Cloud, Check } from "lucide-react";

const commerce = ["WebLLM runtime", "Intent detection", "Language understanding", "Offline-first execution", "Order extraction"];
const financial = ["Credit Agent", "Trust Agent", "Collections Agent", "Risk analysis", "Business insights"];

function Card({
  icon: Icon, label, title, items, tone, latency,
}: {
  icon: typeof Cpu; label: string; title: string; items: string[]; tone: "ink" | "accent"; latency: string;
}) {
  return (
    <div className="soft-card relative h-full p-7 md:p-9">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-lg ${tone === "accent" ? "bg-emerald/10 text-emerald-glow ring-1 ring-emerald/20" : "bg-foreground/5 text-foreground ring-1 ring-border"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            {label}
          </span>
        </div>
        <span className="font-mono text-[10px] text-ink-subtle">{latency}</span>
      </div>
      <h3 className="mt-7 text-[26px] font-semibold tracking-[-0.02em] text-foreground md:text-[30px]">
        {title}
      </h3>
      <ul className="mt-6 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-3 text-[14px] text-ink">
            <span className={`grid h-5 w-5 place-items-center rounded-full ${tone === "accent" ? "bg-emerald/15 text-emerald-glow" : "bg-foreground/10 text-foreground"}`}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Architecture() {
  return (
    <section id="architecture" className="section-y">
      <div className="container-px mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">Architecture</span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[56px]">
            A <span className="emerald-text">split-brain AI</span> built for real-world finance.
          </h2>
          <p className="mt-6 text-[15px] text-ink-muted md:text-[17px]">
            Local intelligence for instant conversation. Cloud agents for
            financial reasoning. Two brains, one operating system.
          </p>
        </div>

        <div className="relative mt-16 grid gap-6 md:grid-cols-2 md:gap-10">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Card icon={Cpu} label="Runs on device" title="Commerce Brain" items={commerce} tone="ink" latency="< 50ms" />
          </motion.div>

          <svg
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 hidden h-24 w-36 -translate-x-1/2 -translate-y-1/2 md:block"
            viewBox="0 0 144 96"
          >
            <defs>
              <linearGradient id="conn" x1="0" x2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.2" />
                <stop offset="1" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <path d="M 6 48 C 40 6, 100 90, 138 48" stroke="url(#conn)" strokeWidth="1.4" fill="none" strokeDasharray="4 4" className="animate-dash" />
            <circle cx="72" cy="48" r="4" fill="#22c55e">
              <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Card icon={Cloud} label="Runs in cloud" title="Financial Brain" items={financial} tone="accent" latency="< 800ms" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
