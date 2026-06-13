import { createFileRoute } from "@tanstack/react-router";
import { useKhata } from "@/lib/khataos/data";
import { AppHeader, AppScreen } from "@/components/app/AppShell";
import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/shopkeeper/insights")({
  component: Insights,
});

const SUGGESTIONS = [
  "Which customers are likely to delay payments?",
  "Who deserves a credit limit increase?",
  "Summarise this week's collection risk.",
  "What inventory should I push to recover capital?",
];

type Msg = { role: "user" | "agent"; text: string };

function Insights() {
  const { customers, inventory, orders } = useKhata((s) => s);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/khataos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "shopkeeper_insights",
          message: q,
          context: {
            customers: customers.map((c) => ({
              name: c.name, trust: c.trustScore, outstanding: c.outstanding,
              limit: c.creditLimit, reliability: c.reliability, risk: c.riskTag,
              due: c.dueDate,
            })),
            inventory: inventory.map((i) => ({ name: i.name, qty: i.qty, expiry: i.expiry })),
            open_orders: orders.length,
          },
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "agent", text: data.reply ?? "I couldn't process that." }]);
    } catch {
      setMessages((m) => [...m, { role: "agent", text: "Network error." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <AppHeader title="Financial Brain" subtitle="AI command center" back />
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-emerald/30 bg-emerald/10 p-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald">
            <Sparkles className="h-3 w-3" /> Specialized agents online
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-ink-muted">
            <div>• Credit Agent</div>
            <div>• Trust Agent</div>
            <div>• Collections Agent</div>
            <div>• Working Capital</div>
            <div>• Insights Agent</div>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="mt-5 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">Suggested</div>
            {SUGGESTIONS.map((s) => (
              <button
                key={s} onClick={() => ask(s)}
                className="w-full rounded-xl border border-border bg-elevated/60 px-4 py-3 text-left text-[13px] text-ink hover:border-emerald/40"
              >{s}</button>
            ))}
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {messages.map((m, i) => (
              <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald text-[#06140b]"
                    : "border border-border bg-elevated text-ink"
                }`}>{m.text}</div>
              </li>
            ))}
            {loading && (
              <li className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-elevated px-4 py-3 text-[12px] text-ink-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing your ledger…
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="fixed inset-x-0 bottom-[64px] z-30 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your ledger…"
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-[13px] outline-none focus:border-emerald/50"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="grid h-10 w-10 place-items-center rounded-full bg-emerald text-[#06140b] disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </AppScreen>
  );
}
