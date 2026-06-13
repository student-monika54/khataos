// Orchestrator: Intent Detection → Commerce Brain → Financial Brain → Template Engine.
// END_CALL has the highest priority and short-circuits the financial brain
// so the agent always ends the call gracefully.

import { runCommerceBrainRules } from "./commerce-brain-rules";
import { runFinancialBrain } from "./financial-brain.server";
import { pickTemplate, renderTemplate, languageToTemplateLang } from "./templates";
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
  // When provided, the orchestrator skips language auto-detection and
  // uses these instead. Sarvam/Twilio locks this after language detection.
  forcedLanguage?: string;
  forcedTemplateLang?: "en" | "hi" | "hinglish" | "kn" | "ta" | "te";
};

export async function processTurn(text: string, ctx: ConversationContext) {
  const t0 = Date.now();
  const commerceRaw = runCommerceBrainRules(text);
  // Honour locked language from IVR — never override based on transcript.
  const commerce = ctx.forcedLanguage
    ? { ...commerceRaw, language: ctx.forcedLanguage as typeof commerceRaw.language, languageConfidence: 1 }
    : commerceRaw;
  const lang = ctx.forcedTemplateLang ?? languageToTemplateLang(commerce.language);

  // ====== END_CALL short-circuit ======
  if (commerce.intent === "END_CALL") {
    const reply = renderTemplate("END_CALL", { customerName: ctx.customerName }, lang);
    const turns: TranscriptTurn[] = [
      { role: "customer", text, at: t0, intent: "END_CALL", agent: "InsightsAgent", language: commerce.language, confidence: commerce.confidence,
        languageConfidence: commerce.languageConfidence, intentConfidence: commerce.intentConfidence },
      { role: "agent", text: reply, at: Date.now(), intent: "END_CALL", agent: "InsightsAgent",
        templateId: "END_CALL", templateLang: lang, language: commerce.language, latencyMs: Date.now() - t0,
        languageConfidence: commerce.languageConfidence, intentConfidence: commerce.intentConfidence },
    ];
    return {
      commerce, financial: { agent: "InsightsAgent" as const, decision: "info" as const, reasoning: "Customer ended the call." },
      templateId: "END_CALL", templateLang: lang, reply, turns, newOutstanding: ctx.outstanding, amount: undefined,
      endCall: true,
    };
  }

  const itemsTotal = commerce.items.reduce((sum, i) => {
    const n = parseFloat(i.quantity);
    return sum + (Number.isFinite(n) ? n * 60 : 60);
  }, 0);
  const requestedAmount = commerce.amount ?? (itemsTotal > 0 ? itemsTotal : undefined);

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
  const noIntentMatch = commerce.intent === "UNKNOWN";
  const fallback = tplId === "FALLBACK";

  const amount = financial.recommendedAmount ?? requestedAmount;
  const newOutstanding =
    financial.decision === "approve" && (commerce.intent === "CREDIT_REQUEST" || commerce.intent === "KHATA_ORDER")
      ? ctx.outstanding + (amount ?? 0)
      : (commerce.intent === "REPAYMENT" || commerce.intent === "PAYMENT_CONFIRMATION") && commerce.amount
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

  // Structured pipeline trace — surfaces in server logs for every turn.
  // Lets us see exactly which stage produced UNKNOWN / FALLBACK in production.
  console.log("[KhataOS pipeline]", JSON.stringify({
    rawTranscript: text,
    detectedLanguage: commerce.language,
    languageConfidence: +commerce.languageConfidence.toFixed(2),
    detectedIntent: commerce.intent,
    intentConfidence: +commerce.intentConfidence.toFixed(2),
    selectedAgent: financial.agent,
    selectedTemplate: `${lang}.${tplId}`,
    decision: financial.decision,
    noIntentMatch,
    fallback,
  }));

  const turns: TranscriptTurn[] = [
    {
      role: "customer", text, at: t0,
      intent: commerce.intent, agent: financial.agent, language: commerce.language,
      confidence: commerce.confidence,
      languageConfidence: commerce.languageConfidence,
      intentConfidence: commerce.intentConfidence,
      items: commerce.items,
      rawTranscript: text,
      noIntentMatch,
      pipelineStage: "commerce",
    },
    {
      role: "agent", text: reply, at: Date.now(),
      intent: commerce.intent, agent: financial.agent,
      templateId: tplId, templateLang: lang,
      decision: financial.decision === "info" ? undefined : financial.decision,
      reasoning: financial.reasoning, latencyMs: Date.now() - t0,
      language: commerce.language,
      languageConfidence: commerce.languageConfidence,
      intentConfidence: commerce.intentConfidence,
      fallback,
      noIntentMatch,
      pipelineStage: "template",
    },
  ];

  return { commerce, financial, templateId: tplId, templateLang: lang, reply, turns, newOutstanding, amount, endCall: false, fallback, noIntentMatch };
}
