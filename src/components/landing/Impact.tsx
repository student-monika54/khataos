import { motion } from "framer-motion";

const metrics = [
  { value: "500M+", label: "Potential Users" },
  { value: "12M+", label: "Kirana Stores" },
  { value: "100%", label: "Phone First" },
  { value: "AI Native", label: "Financial Infrastructure" },
];

export function Impact() {
  return (
    <section id="impact" className="section-y bg-foreground text-white">
      <div className="container-px mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Impact
          </span>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">
            Reimagining money for Bharat
          </h2>
          <p className="mt-5 text-base text-white/70 md:text-lg">
            KhataOS transforms kirana stores from informal credit providers
            into AI-powered microbanks — digitizing trust, credit, repayments,
            collections, and financial decision-making.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 md:mt-16 md:grid-cols-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="bg-foreground p-6 md:p-8"
            >
              <div className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
                {m.value}
              </div>
              <div className="mt-2 text-sm text-white/60">{m.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
