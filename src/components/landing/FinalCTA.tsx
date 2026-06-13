import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section id="cta" className="section-y">
      <div className="container-px mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-white to-surface p-10 md:p-16"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold leading-tight md:text-5xl">
              The future of financial inclusion starts at the{" "}
              <span className="gradient-text">neighborhood kirana store</span>.
            </h2>
            <p className="mt-5 text-base text-ink-muted md:text-lg">
              Join us in building the AI-native financial infrastructure for the
              next half-billion users.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#demo"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
              >
                View Prototype
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#cta"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface"
              >
                Request Demo
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
