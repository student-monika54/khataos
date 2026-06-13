import { motion } from "framer-motion";
import { BookOpen, ShieldQuestion, PhoneOff, BarChart3 } from "lucide-react";

const items = [
  {
    icon: BookOpen,
    title: "Manual Credit Tracking",
    text: "Pen-and-paper khata books make it impossible to scale or reconcile.",
  },
  {
    icon: ShieldQuestion,
    title: "No Trust Scoring",
    text: "Credit decisions rely on memory, not data — risk is invisible.",
  },
  {
    icon: PhoneOff,
    title: "Difficult Collections",
    text: "Awkward follow-ups, missed reminders, lost relationships.",
  },
  {
    icon: BarChart3,
    title: "No Financial Insights",
    text: "Store owners can't see cash flow, exposure, or repayment trends.",
  },
];

export function Problem() {
  return (
    <section id="problem" className="section-y bg-surface">
      <div className="container-px mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="eyebrow">The opportunity</span>
          <h2 className="mt-4 text-3xl font-bold leading-tight md:text-5xl">
            Kirana stores are already India's largest informal financial
            network.
          </h2>
          <p className="mt-5 text-base text-ink-muted md:text-lg">
            Millions of kirana stores extend credit daily, yet they still rely
            on notebooks, memory, and manual follow-ups to manage financial
            relationships.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="soft-card p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/5 text-primary">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {it.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {it.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
