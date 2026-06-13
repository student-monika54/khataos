import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";

type Body = {
  mode: "customer_voice" | "shopkeeper_insights" | "credit_decision";
  message: string;
  context?: Record<string, unknown>;
  language?: string;
};

const SYSTEM_CUSTOMER = `You are KhataOS, an AI financial agent that helps customers of a kirana (neighborhood) store in India manage credit, repayments and trust.

Rules:
- Be warm, concise, conversational. Reply in the SAME language the user used (Hindi, English, Hinglish, or Kannada). Use the same script.
- Keep replies to 1-3 short sentences suitable for voice.
- The user has a credit limit, outstanding balance and trust score. Use the provided context numbers exactly; never invent amounts.
- Common intents: check_balance, check_credit, request_credit (groceries on khata), record_repayment, check_due, ask_trust.
- For credit requests, confirm available credit and ask what items they need.
- For repayments, confirm amount and thank them.
- Never produce JSON, code blocks, or markdown — only spoken-style text.`;

const SYSTEM_SHOPKEEPER = `You are KhataOS Financial Brain, an analyst for an Indian kirana shopkeeper.

You analyse customer credit data and give crisp, decision-ready insights.
- Be specific: name customers, cite numbers from the provided context.
- Use short paragraphs or compact bullet lists (max 6 bullets).
- Cover risk, opportunity and a recommended action.
- Tone: trustworthy, calm, like Stripe's analytics copy. No emojis, no markdown headings.`;

export const Route = createFileRoute("/api/khataos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const system =
          body.mode === "shopkeeper_insights" || body.mode === "credit_decision"
            ? SYSTEM_SHOPKEEPER
            : SYSTEM_CUSTOMER;

        const ctxLine = body.context
          ? `\n\nContext (JSON):\n${JSON.stringify(body.context)}`
          : "";
        const langLine = body.language ? `\n(User language: ${body.language})` : "";

        try {
          const { text } = await generateText({
            model,
            system: system + ctxLine + langLine,
            prompt: body.message,
          });
          return Response.json({ reply: text });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "AI error";
          const status = /402/.test(msg) ? 402 : /429/.test(msg) ? 429 : 500;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
