import { motion } from "framer-motion";
import { Signal, Wifi, BatteryFull, Check } from "lucide-react";

const messages = [
  { from: "user", text: "Salary kal aayegi." },
  { from: "ai", text: "Repayment history strong. ₹500 additional credit approved." },
  { from: "user", text: "Do kilo atta aur ek litre tel khate me daal do." },
  { from: "ai", text: "Order added. Balance: ₹1,180. Due Jul 4." },
];

export function Demo() {
  return (
    <section id="demo" className="section-y">
      <div className="container-px mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <div>
          <span className="eyebrow">Live Demo</span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[52px]">
            Finance, in the{" "}
            <span className="emerald-text">language</span> your customers
            actually speak.
          </h2>
          <p className="mt-6 max-w-lg text-[15px] text-ink-muted md:text-[17px]">
            KhataOS handles credit, orders, and collections through natural
            conversation. No apps to learn. No forms to fill.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Understands code-mixed Hindi · Hinglish · Tamil · Bengali",
              "Approves credit in under a second",
              "Updates khata ledger automatically",
              "Runs fully on-device — works without internet",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-[14px] text-ink-muted">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald/15 text-emerald-glow">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-emerald/15 blur-3xl" />
            <div className="relative h-[640px] w-[310px] rounded-[48px] border border-border bg-background p-2 shadow-[0_40px_100px_-25px_rgba(0,0,0,0.7)]">
              <div className="absolute left-1/2 top-2 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-background" />
              <div className="relative h-full w-full overflow-hidden rounded-[40px] bg-surface">
                <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-semibold text-foreground">
                  <span className="font-mono">9:41</span>
                  <div className="flex items-center gap-1">
                    <Signal className="h-3 w-3" />
                    <Wifi className="h-3 w-3" />
                    <BatteryFull className="h-3 w-3" />
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3 border-b border-border bg-elevated px-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-emerald to-emerald/40 text-xs font-bold text-background">
                    K
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Sharma General Store</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-glow">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                      AI assistant online
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4">
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.4, duration: 0.4 }}
                      className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${
                          m.from === "user"
                            ? "rounded-br-md bg-foreground text-background"
                            : "rounded-bl-md border border-emerald/25 bg-emerald/10 text-emerald-glow"
                        }`}
                      >
                        {m.text}
                      </div>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 2.2, duration: 0.5 }}
                    className="mt-2 rounded-xl border border-border bg-elevated p-3"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-ink-muted">Trust Score</span>
                      <span className="font-mono text-emerald-glow">812 ↑</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                      <motion.div
                        initial={{ width: "0%" }}
                        whileInView={{ width: "84%" }}
                        viewport={{ once: true }}
                        transition={{ delay: 2.4, duration: 1.1, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald to-emerald-glow"
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
