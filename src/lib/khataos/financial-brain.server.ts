// Financial Brain — multi-agent reasoning over Lovable AI Gateway
// (OpenRouter-compatible). Selects an agent based on intent, runs a
// short structured prompt, returns a credit decision + reasoning.

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";
import type { AgentName, Intent } from "./calls";
import { INTENT_TO_AGENT } from "./calls";

export type FinancialDecision = {
  agent: AgentName;
  decision: "approve" | "reject" | "conditional" | "info";
  reasoning: string;
  recommendedAmount?: number;
  trustDelta?: number;
};

const AGENT_PROMPTS: Record<AgentName, string> = {
  CreditAgent: `You are KhataOS Credit Agent. Decide approve/reject/conditional for a credit ask.
Weigh: trust_score, outstanding vs limit, requested_amount, reliability, inventory_risk.
Reply with one short sentence of reasoning. Be conservative if trust<65 or outstanding/limit>0.7.`,
  TrustAgent: `You are KhataOS Trust Agent. Explain the customer's trust score factors in one sentence.`,
  CollectionsAgent: `You are KhataOS Collections Agent. Negotiate a settlement plan in one calm sentence.`,
  WorkingCapitalAgent: `You are KhataOS Working Capital Agent. Recommend a working-capital action in one sentence.`,
  InsightsAgent: `You are KhataOS Insights Agent. Summarise the customer's financial position in one sentence.`,
};

export async function runFinancialBrain(opts: {
  intent: Intent;
  customerName: string;
  trustScore: number;
  outstanding: number;
  creditLimit: number;
  requestedAmount?: number;
  reliability: number;
  inventoryRisk?: number;
  expiryRisk?: number;
}): Promise<FinancialDecision> {
  const agent: AgentName = INTENT_TO_AGENT[opts.intent];
  const available = Math.max(0, opts.creditLimit - opts.outstanding);

  // Deterministic credit decision so the system never hallucinates approvals.
  let decision: FinancialDecision["decision"] = "info";
  let recommendedAmount: number | undefined;
  let trustDelta = 0;
  if (opts.intent === "CREDIT_REQUEST" || opts.intent === "KHATA_ORDER") {
    const want = opts.requestedAmount ?? 0;
    const utilisation = opts.outstanding / Math.max(1, opts.creditLimit);
    if (opts.trustScore < 55 || utilisation > 0.9) {
      decision = "reject";
    } else if (want <= available && opts.trustScore >= 70) {
      decision = "approve"; recommendedAmount = want; trustDelta = 1;
    } else if (want <= available * 1.25) {
      decision = "conditional"; recommendedAmount = Math.floor(available * 0.6);
    } else {
      decision = "reject";
    }
  } else if (opts.intent === "REPAYMENT") {
    decision = "approve"; trustDelta = 1;
  } else if (opts.intent === "COLLECTIONS_FOLLOWUP" || opts.intent === "SETTLEMENT") {
    decision = "conditional"; trustDelta = -1;
  }

  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return { agent, decision, reasoning: deterministicReason(opts, decision), recommendedAmount, trustDelta };
  }

  try {
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: AGENT_PROMPTS[agent],
      prompt: `Context JSON: ${JSON.stringify({
        customer: opts.customerName, intent: opts.intent, decision,
        trust: opts.trustScore, outstanding: opts.outstanding,
        limit: opts.creditLimit, available, requested: opts.requestedAmount,
        reliability: opts.reliability,
      })}\nReturn ONE sentence of reasoning supporting the decision "${decision}". No markdown.`,
    });
    return { agent, decision, reasoning: text.trim().slice(0, 220), recommendedAmount, trustDelta };
  } catch {
    return { agent, decision, reasoning: deterministicReason(opts, decision), recommendedAmount, trustDelta };
  }
}

function deterministicReason(o: { trustScore: number; outstanding: number; creditLimit: number }, d: string) {
  const u = Math.round((o.outstanding / Math.max(1, o.creditLimit)) * 100);
  if (d === "approve") return `Trust ${o.trustScore}/100 and utilisation ${u}% within policy.`;
  if (d === "conditional") return `Partial approval — utilisation ${u}% is high, trust ${o.trustScore}.`;
  if (d === "reject") return `Trust ${o.trustScore} or utilisation ${u}% breach credit policy.`;
  return `Customer position recorded.`;
}
