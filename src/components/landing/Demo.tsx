import { motion } from "framer-motion";
import { Signal, Wifi, BatteryFull } from "lucide-react";

const messages = [
  { from: "user", text: "Salary kal aayegi." },
  {
    from: "ai",
    text: "Your repayment history is strong. ₹500 additional credit has been approved.",
  },
  { from: "user", text: "Do kilo atta aur ek litre tel khate mein daal do." },
  { from: "ai", text: "Order approved and added to your khata." },
];

export function Demo() {
  return (
    <section id="demo" className="section-y">
      <div className="container-px mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="eyebrow">Live demo</span>
          <h2 className="mt-4 text-3xl font-bold md:text-5xl">
            Finance, in the language your customers actually speak.
          </h2>
          <p className="mt-5 max-w-lg text-base text-ink-muted md:text-lg">
            KhataOS handles credit, orders, and collections through natural
            conversation — no apps to learn, no forms to fill.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-ink-muted">
            <li>• Understands code-mixed Hindi-English</li>
            <li>• Approves credit in under a second</li>
            <li>• Updates the khata ledger automatically</li>
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
            {/* phone frame */}
            <div className="relative h-[620px] w-[300px] rounded-[44px] border border-border bg-foreground p-2 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)]">
              <div className="absolute left-1/2 top-2 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-foreground" />
              <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-surface">
                {/* status bar */}
                <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-semibold text-foreground">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <Signal className="h-3 w-3" />
                    <Wifi className="h-3 w-3" />
                    <BatteryFull className="h-3 w-3" />
                  </div>
                </div>

                {/* header */}
                <div className="mt-2 flex items-center gap-3 border-b border-border bg-white px-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
                    K
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Sharma General Store
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      AI assistant online
                    </div>
                  </div>
                </div>

                {/* messages */}
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
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug shadow-sm ${
                          m.from === "user"
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border bg-white text-ink"
                        }`}
                      >
                        {m.text}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
