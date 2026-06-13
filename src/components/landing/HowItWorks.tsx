import { motion } from "framer-motion";
import { Mic, Brain, Zap, ArrowRight } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: Mic,
    title: "Understand",
    text: "Voice conversations in local languages — no forms, no friction.",
  },
  {
    n: "02",
    icon: Brain,
    title: "Analyze",
    text: "AI evaluates trust, creditworthiness, and intent in real time.",
  },
  {
    n: "03",
    icon: Zap,
    title: "Act",
    text: "Orders, credit approvals, reminders, and collections — automated.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-y bg-surface">
      <div className="container-px mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-4 text-3xl font-bold md:text-5xl">
            Three steps from voice to value
          </h2>
        </div>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-4">
          {steps.map((s, i) => (
            <>
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="soft-card flex flex-col p-6 md:p-8"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-3xl font-bold text-border">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-bold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {s.text}
                </p>
              </motion.div>
              {i < steps.length - 1 && (
                <div
                  key={`arrow-${i}`}
                  className="hidden items-center justify-center lg:flex"
                >
                  <ArrowRight className="h-5 w-5 text-ink-muted/60" />
                </div>
              )}
            </>
          ))}
        </div>
      </div>
    </section>
  );
}
