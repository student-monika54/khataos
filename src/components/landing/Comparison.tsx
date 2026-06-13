import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const rows: { label: string; trad: boolean; khata: boolean }[] = [
  { label: "Order Management", trad: true, khata: true },
  { label: "Khata Ledger", trad: true, khata: true },
  { label: "Trust Scoring", trad: false, khata: true },
  { label: "Credit Intelligence", trad: false, khata: true },
  { label: "Collections Automation", trad: false, khata: true },
  { label: "Conversational AI", trad: false, khata: true },
  { label: "On-Device AI", trad: false, khata: true },
];

export function Comparison() {
  return (
    <section className="section-y">
      <div className="container-px mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Comparison</span>
          <h2 className="mt-4 text-3xl font-bold md:text-5xl">
            Most solutions solve only one side of the problem.
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-border bg-surface">
            <div className="p-4 text-xs font-semibold uppercase tracking-wider text-ink-muted md:p-5">
              Capability
            </div>
            <div className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted md:p-5">
              Traditional Apps
            </div>
            <div className="p-4 text-center text-xs font-bold uppercase tracking-wider text-accent md:p-5">
              KhataOS
            </div>
          </div>
          {rows.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className={`grid grid-cols-[1.4fr_1fr_1fr] items-center ${
                i !== rows.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="p-4 text-sm font-medium text-foreground md:p-5">
                {r.label}
              </div>
              <div className="flex justify-center p-4 md:p-5">
                {r.trad ? (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-ink-muted">
                    <Check className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-ink-muted/60">
                    <X className="h-4 w-4" />
                  </span>
                )}
              </div>
              <div className="flex justify-center p-4 md:p-5">
                {r.khata ? (
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.1 + i * 0.05,
                      type: "spring",
                      stiffness: 200,
                    }}
                    className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-accent"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </motion.span>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
