import { motion } from "framer-motion";
import { BookOpen, ShieldQuestion, PhoneOff, BarChart3 } from "lucide-react";

const items = [
  { icon: BookOpen, title: "Manual Credit Tracking", text: "Pen-and-paper khata books make it impossible to scale, reconcile, or audit." },
  { icon: ShieldQuestion, title: "No Trust Scoring", text: "Credit decisions rely on memory, not data. Risk is invisible until it's too late." },
  { icon: PhoneOff, title: "Difficult Collections", text: "Awkward follow-ups, missed reminders, and broken customer relationships." },
  { icon: BarChart3, title: "No Financial Insights", text: "Owners can't see cash flow, exposure, or repayment trends in real time." },
];

export function Problem() {
  return (
    <section id="problem" className="section-y relative">
      <div className="container-px mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="eyebrow">The Problem</span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[56px]">
            Kirana stores are India's largest{" "}
            <span className="emerald-text">informal banking network.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] text-ink-muted md:text-[17px]">
            Millions of stores extend credit every day — yet still rely on
            notebooks, memory, and manual follow-ups to manage trillions of
            rupees in informal credit flow.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="soft-card group relative overflow-hidden p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald/10 text-emerald-glow ring-1 ring-emerald/20">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-[17px] font-semibold text-foreground">{it.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{it.text}</p>
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-emerald/5 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
