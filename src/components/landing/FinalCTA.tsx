import { motion } from "framer-motion";
import { ArrowRight, Layers } from "lucide-react";

export function FinalCTA() {
  return (
    <section id="cta" className="section-y">
      <div className="container-px mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-elevated via-surface to-background p-10 md:p-20"
        >
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <span className="eyebrow">Series A in waiting</span>
            <h2 className="mt-6 text-[36px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[60px]">
              The future of financial inclusion starts at the{" "}
              <span className="emerald-text">neighborhood kirana store.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[15px] text-ink-muted md:text-[17px]">
              Join us in building the AI-native financial infrastructure for
              Bharat's next half-billion users.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href="#demo" className="group btn-primary">
                Start Demo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a href="#architecture" className="btn-ghost hover:bg-surface">
                <Layers className="h-4 w-4 text-emerald-glow" />
                View Architecture
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
