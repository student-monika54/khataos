import { motion } from "framer-motion";
import { Cpu, Cloud, Check } from "lucide-react";

const commerce = [
  "WebLLM",
  "Intent Detection",
  "Language Understanding",
  "Offline Support",
  "Order Extraction",
];
const financial = [
  "Credit Agent",
  "Trust Agent",
  "Collections Agent",
  "Risk Analysis",
  "Business Insights",
];

function Card({
  icon: Icon,
  label,
  title,
  items,
  tone,
}: {
  icon: typeof Cpu;
  label: string;
  title: string;
  items: string[];
  tone: "ink" | "accent";
}) {
  return (
    <div className="soft-card relative h-full p-6 md:p-8">
      <div className="flex items-center gap-3">
        <div
          className={`grid h-10 w-10 place-items-center rounded-lg ${
            tone === "accent"
              ? "bg-accent/10 text-accent"
              : "bg-primary/5 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-bold text-foreground">{title}</h3>
      <ul className="mt-6 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-3 text-sm text-ink">
            <span
              className={`grid h-5 w-5 place-items-center rounded-full ${
                tone === "accent" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"
              }`}
            >
              <Check className="h-3 w-3" />
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
    <section id="architecture" className="section-y bg-surface">
      <div className="container-px mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Architecture</span>
          <h2 className="mt-4 text-3xl font-bold md:text-5xl">
            A split-brain AI built for real-world finance
          </h2>
          <p className="mt-5 text-base text-ink-muted md:text-lg">
            Local intelligence for instant interactions. Cloud agents for
            financial reasoning. Both, working in concert.
          </p>
        </div>

        <div className="relative mt-14 grid gap-6 md:grid-cols-2 md:gap-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card
              icon={Cpu}
              label="Runs On Device"
              title="Commerce Brain"
              items={commerce}
              tone="ink"
            />
          </motion.div>

          {/* connection line (desktop) */}
          <svg
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 hidden h-24 w-32 -translate-x-1/2 -translate-y-1/2 md:block"
            viewBox="0 0 128 96"
          >
            <defs>
              <linearGradient id="conn" x1="0" x2="1">
                <stop offset="0" stopColor="#0F172A" stopOpacity="0.4" />
                <stop offset="1" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <path
              d="M 4 48 C 40 10, 88 86, 124 48"
              stroke="url(#conn)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 4"
              className="animate-dash"
            />
            <circle cx="64" cy="48" r="4" fill="#10B981" />
          </svg>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card
              icon={Cloud}
              label="Runs In Cloud"
              title="Financial Brain"
              items={financial}
              tone="accent"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
