import { motion } from "framer-motion";
import { CreditCard, ShieldCheck, Bot, LineChart } from "lucide-react";

const agents = [
  {
    icon: CreditCard,
    name: "Credit Agent",
    role: "Decides who gets credit, how much, and on what terms — in real time.",
    sample: "₹500 approved · 7-day terms",
  },
  {
    icon: ShieldCheck,
    name: "Trust Agent",
    role: "Maintains a dynamic trust score per customer using behavioral and repayment signals.",
    sample: "Trust 812 · low risk",
  },
  {
    icon: Bot,
    name: "Collections Agent",
    role: "Sends polite, multilingual reminders that protect the customer relationship.",
    sample: "Reminder scheduled · Hindi",
  },
  {
    icon: LineChart,
    name: "Insights Agent",
    role: "Surfaces cash flow, exposure, and repayment trends in plain language.",
    sample: "Exposure ↓ 12% w/w",
  },
];

export function AgentNetwork() {
  return (
    <section id="agents" className="section-y bg-surface/40">
      <div className="container-px mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="eyebrow">Agent Network</span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[52px]">
            Four specialized agents.{" "}
            <span className="emerald-text">One financial brain.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] text-ink-muted md:text-[17px]">
            Each agent owns a domain and coordinates with the others — like a
            small bank's risk, credit, collections, and analytics teams,
            running 24/7 in software.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {agents.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.06 }}
              className="soft-card group relative overflow-hidden p-7 md:p-8"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald/10 text-emerald-glow ring-1 ring-emerald/20">
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[20px] font-semibold tracking-[-0.01em] text-foreground">
                      {a.name}
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-glow">
                      online
                    </span>
                  </div>
                  <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-muted">
                    {a.role}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5 font-mono text-[11px] text-emerald-glow">
                    <span className="h-1 w-1 rounded-full bg-emerald" />
                    {a.sample}
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald/5 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
