import { motion } from "framer-motion";

const metrics = [
  { value: "13M+", label: "Kirana Stores", sub: "Bharat's largest retail network" },
  { value: "₹10L Cr+", label: "Informal Credit", sub: "Annual khata flow, undigitized" },
  { value: "500M+", label: "Consumers", sub: "Underserved by formal banks" },
  { value: "0", label: "Apps to Learn", sub: "Voice-first, by design" },
];

export function Impact() {
  return (
    <section id="impact" className="section-y relative">
      <div className="container-px mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="eyebrow">Impact</span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground md:text-[56px]">
            Reimagining money for{" "}
            <span className="emerald-text">Bharat.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] text-ink-muted md:text-[17px]">
            KhataOS transforms kirana stores from informal credit providers
            into AI-powered microbanks — digitizing trust, credit, repayments,
            collections, and financial decision-making for the next half-billion.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:mt-20 md:grid-cols-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="bg-elevated p-7 md:p-9"
            >
              <div className="font-display text-[44px] font-semibold tracking-[-0.03em] text-foreground md:text-[56px]">
                {m.value}
              </div>
              <div className="mt-3 text-[13px] font-medium uppercase tracking-[0.14em] text-emerald-glow">
                {m.label}
              </div>
              <div className="mt-1.5 text-[13px] text-ink-muted">{m.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
