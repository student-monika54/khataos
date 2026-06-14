// Lovable AI Gateway (Gemini 3 Flash) — extracts a structured order JSON
// from an STT transcript. Small, fast, cheap.

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText, Output } from "ai";
import { z } from "zod";

const OrderSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().positive().default(1),
    unit: z.string().default("pcs"),
    estimatedPrice: z.number().optional(),
  })),
  totalEstimate: z.number().optional(),
  summary: z.string(),
});

export type ExtractedOrder = z.infer<typeof OrderSchema>;

export async function extractOrderFromTranscript(transcript: string): Promise<ExtractedOrder | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    console.warn("[order-extractor] LOVABLE_API_KEY missing");
    return null;
  }
  try {
    const gateway = createLovableAiGatewayProvider(key);
    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      experimental_output: Output.object({ schema: OrderSchema }),
      system:
        "You are a kirana store order parser. Given an English transcript of a customer's voice order, extract every distinct grocery item with a numeric quantity and a unit (kg, g, L, ml, packet, pcs, dozen, etc.). " +
        "Use typical Indian kirana prices (rice ~60/kg, sugar ~45/kg, oil ~150/L, atta ~50/kg, milk ~60/L, dal ~120/kg, biscuits ~20/packet, soap ~30/pc) for estimatedPrice; totalEstimate is the sum. " +
        "summary is a one-line natural recap like '2 kg rice, 1 L oil — ₹270 est'. If no clear items, return items: [].",
      prompt: `Transcript: """${transcript}"""`,
    });
    return experimental_output ?? null;
  } catch (e) {
    console.error("[order-extractor] failed", e);
    return null;
  }
}
