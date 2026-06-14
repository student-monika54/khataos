// Unified Orders endpoint — DB-backed source of truth for customer +
// retailer order views.
//   GET  ?customerId=...     → that customer's orders (newest first)
//   GET  (no params)         → latest 50 across all customers (retailer)
//   POST                     → create order (from quick voice or in-app call)
import { createFileRoute } from "@tanstack/react-router";
import { extractOrderFromTranscript } from "@/lib/khataos/order-extractor.server";

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
  status?: "pending_approval" | "approved";
  reasoning?: string;
};

export const Route = createFileRoute("/api/khataos/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const customerId = url.searchParams.get("customerId");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(customerId ? 50 : 50);
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

        // If transcript present but no items, try Gemini extraction.
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
          status: body.status ?? "pending_approval",
          reasoning,
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
