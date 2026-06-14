// Lovable AI Gateway (Gemini 3 Flash) — extracts a structured order JSON
// from an STT transcript. Small, fast, cheap.

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { CATALOG } from "@/lib/khataos/catalog";
import { generateText, Output } from "ai";
import { z } from "zod";

const RawOrderSchema = z.object({
  items: z.array(z.object({
    name: z.string().optional(),
    item: z.string().optional(),
    quantity: z.number().positive().default(1),
    unit: z.string().default("pcs"),
    estimatedPrice: z.number().optional(),
    estimatedUnitPrice: z.number().optional(),
  })),
  totalEstimate: z.number().optional(),
  summary: z.string(),
});

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

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, ondu: 1, eradu: 2, mooru: 3,
};

export function extractCatalogOrder(transcript: string): ExtractedOrder | null {
  const text = transcript.toLowerCase();
  const parts = text.split(/,|\band\b|\baur\b|\bmatthu\b/i);
  const items = [] as ExtractedOrder["items"];
  for (const part of parts) {
    const sku = CATALOG.find((s) => s.aliases.some((a) => new RegExp(`\\b${a}\\b`, "i").test(part)));
    if (!sku) continue;
    const digit = part.match(/(\d+(?:\.\d+)?)/)?.[1];
    const word = Object.entries(NUM_WORDS).find(([w]) => new RegExp(`\\b${w}\\b`, "i").test(part))?.[1];
    const quantity = digit ? Number(digit) : word ?? sku.defaultQty;
    items.push({ name: sku.name, quantity, unit: sku.unit, estimatedPrice: sku.pricePerUnit });
  }
  if (items.length === 0) return null;
  const totalEstimate = items.reduce((sum, i) => sum + i.quantity * (i.estimatedPrice ?? 0), 0);
  return { items, totalEstimate, summary: `${items.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")} — ₹${totalEstimate} est` };
}

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
      experimental_output: Output.object({ schema: RawOrderSchema }),
      system:
        "You are a kirana store order parser. Given an English transcript of a customer's voice order, extract every distinct grocery item with a numeric quantity and a unit (kg, g, L, ml, packet, pcs, dozen, etc.). " +
        "Each item object must use the key name for the product name. If you accidentally think of the key as item, still output name. " +
        "Use typical Indian kirana prices for estimatedPrice (INR per unit): rice 60/kg, sugar 45/kg, jaggery 80/kg, oil 140/L, ghee 600/kg, butter 60/pcs, paneer 350/kg, curd 80/kg, atta 50/kg, maida 55/kg, milk 60/L, dal 140/kg, biscuits 30/pack, soap 30/pc, shampoo 90/pc, toothpaste 75/pc, detergent 120/pack, salt 25/kg, onion 40/kg, potato 35/kg, tomato 40/kg, chilli 80/kg, garlic 200/kg, ginger 120/kg, turmeric 250/kg, masala 60/pack, noodles 15/pack, eggs 8/pc, tea 120/pack, coffee 180/pack, bread 45/pcs. ALWAYS include an estimatedPrice — never leave it null. totalEstimate is the sum of quantity*estimatedPrice. " +
        "summary is a one-line natural recap like '2 kg rice, 1 L oil — ₹270 est'. If no clear items, return items: [].",
      prompt: `Transcript: """${transcript}"""`,
    });
    if (!experimental_output) return null;
    const items = experimental_output.items
      .map((i) => {
        const name = (i.name ?? i.item ?? "").trim();
        let estimatedPrice = i.estimatedPrice ?? i.estimatedUnitPrice;
        let unit = i.unit;
        if (!estimatedPrice || estimatedPrice <= 0) {
          const sku = CATALOG.find((s) =>
            s.aliases.some((a) => name.toLowerCase().includes(a)) ||
            s.name.toLowerCase() === name.toLowerCase()
          );
          if (sku) {
            estimatedPrice = sku.pricePerUnit;
            unit = unit ?? sku.unit;
          }
        }
        return { name, quantity: i.quantity, unit: unit ?? "pcs", estimatedPrice };
      })
      .filter((i) => i.name.length > 0);
    const parsed = OrderSchema.parse({ ...experimental_output, items });
    const computedTotal = items.reduce((sum, i) => sum + i.quantity * (i.estimatedPrice ?? 0), 0);
    parsed.totalEstimate = computedTotal > 0 ? computedTotal : (parsed.totalEstimate ?? 0);
    return parsed;
  } catch (e) {
    console.warn("[order-extractor] AI parse fallback", e);
    return extractCatalogOrder(transcript);
  }
}
