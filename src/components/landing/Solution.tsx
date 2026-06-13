import { motion } from "framer-motion";
import {
  Languages,
  Brain,
  ShieldCheck,
  Bot,
  Wallet,
  LineChart,
} from "lucide-react";

const features = [
  {
    icon: Languages,
    title: "Multilingual AI Agent",
    text: "Converses naturally in Hindi, Hinglish, Tamil, Bengali, and more.",
  },
  {
    icon: Brain,
    title: "Smart Credit Decisions",
    text: "AI evaluates context, history, and intent to approve credit instantly.",
  },
  {
    icon: ShieldCheck,
    title: "Trust Intelligence",
    text: "Dynamic trust scores that update with every transaction.",
  },
  {
    icon: Bot,
    title: "Automated Collections",
    text: "Polite, multilingual reminders that preserve customer relationships.",
  },
  {
    icon: Wallet,
    title: "Repayment Tracking",
    text: "Real-time visibility into khata balances and repayment cycles.",
  },
  {
    icon: LineChart,
    title: "Business Insights",
    text: "Cash flow, exposure, and risk — surfaced as plain language.",
  },
];

export function Solution() {
  return (
    <section id="solution" className="section-y">
      <div className="container-px mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">The platform</span>
          <h2 className="mt-4 text-3xl font-bold md:text-5xl">Meet KhataOS</h2>
          <p className="mt-5 text-base text-ink-muted md:text-lg">
            A conversational AI operating system for credit-driven commerce.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.05 }}
              className="soft-card group p-6 transition-shadow hover:shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {f.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
