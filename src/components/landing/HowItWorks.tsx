import { Fragment } from "react";
import { motion } from "framer-motion";
import { Mic, Brain, CheckCircle2, BookCheck, ArrowRight } from "lucide-react";

const steps = [
  { n: "01", icon: Mic, title: "Customer", text: "Speaks naturally in their language — voice, no forms." },
  { n: "02", icon: Brain, title: "AI Agent", text: "On-device commerce brain extracts intent and context." },
  { n: "03", icon: CheckCircle2, title: "Credit Decision", text: "Cloud financial brain evaluates trust and approves." },
  { n: "04", icon: BookCheck, title: "Ledger Update", text: "Khata, repayment plan, and reminders — instantly updated." },
];

export function HowItWorks() {
  return (
    <section className="section-y relative bg-surface/40">
      <div className="container-px mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[52px]">
            From voice to ledger in{" "}
            <span className="emerald-text">under a second.</span>
          </h2>
        </div>

        <div className="mt-14 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:gap-2">
          {steps.map((s, i) => (
            <Fragment key={s.n}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="soft-card flex flex-col p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald/10 text-emerald-glow ring-1 ring-emerald/20">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs text-ink-subtle">{s.n}</span>
                </div>
                <h3 className="mt-6 text-[17px] font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{s.text}</p>
              </motion.div>
              {i < steps.length - 1 && (
                <div className="hidden items-center justify-center lg:flex">
                  <ArrowRight className="h-4 w-4 text-emerald/60" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
