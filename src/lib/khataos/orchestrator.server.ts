// Orchestrator: Commerce Brain (rules) → Financial Brain → Template Engine.
// Used by both Twilio gather webhook and the simulated dialer.

import { runCommerceBrainRules } from "./commerce-brain.server";
import { runFinancialBrain } from "./financial-brain.server";
import { pickTemplate, renderTemplate } from "./templates";
import type { TranscriptTurn } from "./calls";

export type ConversationContext = {
  customerId: string;
  customerName: string;
  trustScore: number;
  outstanding: number;
  creditLimit: number;
  reliability: number;
  dueDate?: string;
  daysOverdue?: number;
};

export async function processTurn(text: string, ctx: ConversationContext) {
  const t0 = Date.now();
  const commerce = runCommerceBrainRules(text);

  const requestedAmount =
    commerce.amount ??
    commerce.items.reduce((sum, i) => {
      const n = parseFloat(i.quantity);
      if (Number.isFinite(n)) return sum + n * 60; // crude pricing
      return sum + 60;
    }, 0) || undefined;

  const financial = await runFinancialBrain({
    intent: commerce.intent,
    customerName: ctx.customerName,
    trustScore: ctx.trustScore,
    outstanding: ctx.outstanding,
    creditLimit: ctx.creditLimit,
    reliability: ctx.reliability,
    requestedAmount,
  });

  const tplId = pickTemplate(commerce.intent, financial.decision === "info" ? undefined : financial.decision);
  const lang = commerce.language === "Hindi" || commerce.language === "Hinglish" ? "hi" : "en";

  const amount = financial.recommendedAmount ?? requestedAmount;
  const newOutstanding =
    financial.decision === "approve" && (commerce.intent === "CREDIT_REQUEST" || commerce.intent === "KHATA_ORDER")
      ? ctx.outstanding + (amount ?? 0)
      : commerce.intent === "REPAYMENT" && commerce.amount
        ? Math.max(0, ctx.outstanding - commerce.amount)
        : ctx.outstanding;

  const reply = renderTemplate(tplId, {
    customerName: ctx.customerName,
    amount,
    outstanding: newOutstanding,
    available: Math.max(0, ctx.creditLimit - newOutstanding),
    limit: ctx.creditLimit,
    trustScore: ctx.trustScore + (financial.trustDelta ?? 0),
    dueDate: ctx.dueDate,
    items: commerce.items.map((i) => `${i.quantity} ${i.name}`).join(", ") || undefined,
    daysOverdue: ctx.daysOverdue,
    reason: financial.reasoning,
  }, lang);

  const turns: TranscriptTurn[] = [
    {
      role: "customer", text, at: t0,
      intent: commerce.intent, language: commerce.language,
      items: commerce.items,
    },
    {
      role: "agent", text: reply, at: Date.now(),
      intent: commerce.intent, agent: financial.agent,
      templateId: tplId, decision: financial.decision === "info" ? undefined : financial.decision,
      reasoning: financial.reasoning, latencyMs: Date.now() - t0,
    },
  ];

  return { commerce, financial, templateId: tplId, reply, turns, newOutstanding, amount };
}
