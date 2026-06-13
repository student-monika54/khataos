import { motion } from "framer-motion";
import { ArrowRight, Play, Check } from "lucide-react";
import { SplineScene } from "./SplineScene";

const trust = [
  "Multilingual AI",
  "On-Device Intelligence",
  "Conversational Credit Management",
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-28 md:pt-32">
      {/* subtle background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-1/4 h-[480px] w-[480px] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[360px] w-[360px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container-px mx-auto grid max-w-7xl items-center gap-12 pb-20 md:pb-28 lg:grid-cols-2 lg:gap-16">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            AI-Powered Microbank for Bharat
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-[64px]"
          >
            Turn every kirana store into an{" "}
            <span className="gradient-text">AI-powered microbank</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted md:text-lg"
          >
            KhataOS uses on-device AI and conversational finance to help kirana
            stores manage credit, trust, repayments, and collections — for the
            next 500 million Indians.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a
              href="#demo"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
            >
              Try Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground hover:bg-surface"
            >
              <Play className="h-4 w-4 text-accent" />
              Watch Demo
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2"
          >
            {trust.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-2 text-sm text-ink-muted"
              >
                <Check className="h-4 w-4 text-accent" />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <SplineScene />
        </motion.div>
      </div>
    </section>
  );
}
