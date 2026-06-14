// Unified Orders endpoint — DB-backed source of truth for customer +
// retailer order views.
//   GET  ?customerId=...     → that customer's orders (newest first)
//   GET  (no params)         → latest 50 across all customers (retailer)
//   POST                     → create order (voice / quick voice / in-app call)
//                              Always lands as `pending_credit_review`.
//                              Runs financial brain to produce
//                              trust_score / credit_recommendation /
//                              decision_reason (advisory, retailer decides).
import { createFileRoute } from "@tanstack/react-router";
import { extractOrderFromTranscript } from "@/lib/khataos/order-extractor.server";
import { runFinancialBrain } from "@/lib/khataos/financial-brain.server";
import { CATALOG, SKU_NAMES_BY_LANG, UNIT_LABELS, type LangKey } from "@/lib/khataos/catalog";

function langKeyOf(language?: string): LangKey {
  const l = (language ?? "").toLowerCase();
  if (l.startsWith("hi")) return "hi";
  if (l.startsWith("kn")) return "kn";
  return "en";
}
function localizeItem(it: Item, lang: LangKey): Item {
  const lower = (it.name ?? "").toLowerCase();
  let skuId: string | undefined;
  for (const [id, names] of Object.entries(SKU_NAMES_BY_LANG)) {
    if (it.name && (it.name.includes(names.hi) || it.name.includes(names.kn) || lower === names.en.toLowerCase())) { skuId = id; break; }
  }
  if (!skuId) {
    const sku = CATALOG.find((s) => s.aliases.some((a) => lower === a || lower.includes(a)));
    skuId = sku?.id;
  }
  const name = skuId ? (SKU_NAMES_BY_LANG[skuId]?.[lang] ?? it.name) : it.name;
  const unit = it.unit ? (UNIT_LABELS[lang][it.unit] ?? it.unit) : it.unit;
  return { ...it, name, unit };
}

type Item = { name: string; quantity: number; unit?: string; estimatedPrice?: number };
type CreateBody = {
  source: "voice_call" | "quick_voice" | "in_app_call";
  customerId: string;
  customerName: string;
  phone?: string;
  items?: Item[];
  amount?: number;
  language?: string;
  transcript?: string;
  callId?: string;
  retailerId?: string;
  reasoning?: string;
};

// Minimal demo customer registry — mirrors src/lib/khataos/data.ts seed.
// Used so the financial brain can score orders even when the caller
// (Twilio webhook, voice screen) doesn't carry full customer financials.
const CUSTOMER_PROFILES: Record<string, { trustScore: number; outstanding: number; creditLimit: number; reliability: number }> = {
  c_me: { trustScore: 82, outstanding: 1850, creditLimit: 5000, reliability: 91 },
  c_p1: { trustScore: 94, outstanding: 0, creditLimit: 8000, reliability: 98 },
  c_s1: { trustScore: 71, outstanding: 2200, creditLimit: 4000, reliability: 78 },
  c_a1: { trustScore: 58, outstanding: 2850, creditLimit: 3000, reliability: 62 },
  c_m1: { trustScore: 88, outstanding: 3400, creditLimit: 10000, reliability: 92 },
};

export const Route = createFileRoute("/api/khataos/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const customerId = url.searchParams.get("customerId");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
        if (customerId) q = q.eq("customer_id", customerId);
        const { data, error } = await q;
        if (error) {
          console.error("[orders] list failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json(data ?? []);
      },

      POST: async ({ request }) => {
        let body: CreateBody;
        try { body = (await request.json()) as CreateBody; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        if (!body.customerId || !body.customerName || !body.source) {
          return new Response("Missing customerId/customerName/source", { status: 400 });
        }

        // Gemini extraction from transcript when items absent.
        let items = Array.isArray(body.items) ? body.items : [];
        let amount = body.amount;
        let reasoning = body.reasoning;
        if (items.length === 0 && body.transcript) {
          const extracted = await extractOrderFromTranscript(body.transcript);
          if (extracted && extracted.items.length > 0) {
            items = extracted.items;
            amount = amount ?? extracted.totalEstimate;
            reasoning = reasoning ?? extracted.summary;
          }
        }
        if (items.length === 0) {
          return Response.json({ error: "no_items_detected" }, { status: 422 });
        }
        if (amount == null) {
          amount = items.reduce((s, it) => s + (it.estimatedPrice ?? 0) * (it.quantity ?? 1), 0);
        }

        // Localize item names + units to the customer's spoken language so
        // the orders tab paints in that language.
        const lang = langKeyOf(body.language);
        items = items.map((it) => localizeItem(it, lang));
        // Rebuild a localized summary line.
        const totalForSummary = amount ?? 0;
        reasoning = `${items.map((i) => `${i.quantity} ${i.unit ?? ""} ${i.name}`.trim()).join(", ")} — ₹${Math.round(totalForSummary)}`;

        // Financial brain — advisory recommendation for the retailer.
        const prof = CUSTOMER_PROFILES[body.customerId] ?? { trustScore: 70, outstanding: 0, creditLimit: 3000, reliability: 75 };
        let trustScore: number | null = prof.trustScore;
        let creditRecommendation: string | null = null;
        let decisionReason: string | null = null;
        try {
          const brain = await runFinancialBrain({
            intent: "KHATA_ORDER",
            customerName: body.customerName,
            trustScore: prof.trustScore,
            outstanding: prof.outstanding,
            creditLimit: prof.creditLimit,
            requestedAmount: amount ?? 0,
            reliability: prof.reliability,
          });
          // Map brain decision → recommendation label.
          creditRecommendation = brain.decision === "approve" ? "approve"
            : brain.decision === "reject" ? "reject" : "review";
          decisionReason = brain.reasoning;
        } catch (e) {
          console.error("[orders] financial brain failed", e);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.from("orders").insert({
          customer_id: body.customerId,
          customer_name: body.customerName,
          phone: body.phone,
          retailer_id: body.retailerId ?? "shop_default",
          source: body.source,
          call_id: body.callId,
          items,
          amount,
          language: body.language,
          transcript: body.transcript,
          status: "pending_credit_review",
          reasoning,
          trust_score: trustScore,
          credit_recommendation: creditRecommendation,
          decision_reason: decisionReason,
        }).select("*").single();
        if (error) {
          console.error("[orders] insert failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json(data);
      },
    },
  },
});
