import { motion } from "framer-motion";

const stats = [
  { value: "13M+", label: "Kirana Stores" },
  { value: "₹10L Cr+", label: "Informal Credit Flow" },
  { value: "500M+", label: "Consumers Served" },
  { value: "24/7", label: "AI Financial Agent" },
];

export function HeroStats() {
  return (
    <section className="relative -mt-6">
      <div className="container-px mx-auto max-w-7xl">
        <div className="grid divide-y divide-border overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-elevated/80 to-surface/40 backdrop-blur md:grid-cols-4 md:divide-x md:divide-y-0">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="px-6 py-7 md:px-8 md:py-9"
            >
              <div className="font-display text-[34px] font-semibold tracking-tight text-foreground md:text-[40px]">
                {s.value}
              </div>
              <div className="mt-1 text-[12px] uppercase tracking-[0.14em] text-ink-muted">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
