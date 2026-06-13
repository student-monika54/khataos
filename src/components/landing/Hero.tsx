import { motion } from "framer-motion";
import { ArrowRight, Layers, Check } from "lucide-react";
import { SplineScene } from "./SplineScene";

const trust = [
  "On-device AI",
  "Multilingual",
  "Offline-capable",
  "Privacy-first",
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 md:pt-40">
      {/* ambient bg */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute -top-40 right-1/4 h-[520px] w-[520px] rounded-full bg-emerald/15 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[420px] w-[420px] rounded-full bg-emerald/8 blur-[120px]" />
      </div>

      <div className="container-px mx-auto grid max-w-7xl items-center gap-14 pb-24 md:pb-32 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
            AI-Powered Microbank for Bharat
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 text-[40px] font-semibold leading-[1.02] tracking-[-0.03em] text-foreground md:text-[64px] lg:text-[76px]"
          >
            Turn every kirana store into an{" "}
            <span className="gradient-text">AI-powered microbank.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-muted md:text-[17px]"
          >
            KhataOS uses on-device AI and conversational finance to automate
            credit, trust scoring, repayments, and collections for Bharat's
            13M+ kirana stores.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a href="#demo" className="group btn-primary">
              Start Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a href="#architecture" className="btn-ghost hover:bg-surface">
              <Layers className="h-4 w-4 text-emerald-glow" />
              View Architecture
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 flex flex-wrap gap-x-6 gap-y-2"
          >
            {trust.map((t) => (
              <li key={t} className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
                <Check className="h-3.5 w-3.5 text-emerald" />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative"
        >
          <SplineScene />
        </motion.div>
      </div>
    </section>
  );
}
