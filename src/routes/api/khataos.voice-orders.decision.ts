// POST { id, decision: 'approve' | 'reject' }
// On approve: flips status to 'approved' AND pushes to in-memory live-orders
// store so the shopkeeper Incoming Orders tab picks it up immediately.

import { createFileRoute } from "@tanstack/react-router";
import { publishLiveOrder } from "@/lib/khataos/live-orders.server";

export const Route = createFileRoute("/api/khataos/voice-orders/decision")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { id?: string; decision?: "approve" | "reject" };
        if (!body.id || (body.decision !== "approve" && body.decision !== "reject")) {
          return new Response("Bad request", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nextStatus = body.decision === "approve" ? "approved" : "rejected";
        const { data, error } = await supabaseAdmin
          .from("voice_orders")
          .update({ status: nextStatus })
          .eq("id", body.id)
          .select("*")
          .single();
        if (error || !data) {
          console.error("[voice-orders/decision] update failed", error);
          return Response.json({ error: error?.message ?? "not found" }, { status: 500 });
        }

        if (body.decision === "approve") {
          const items = Array.isArray(data.items) ? data.items : [];
          publishLiveOrder({
            id: `lo_${data.id}`,
            callId: data.call_id,
            customerId: data.customer_id,
            customerName: data.customer_name,
            phone: data.phone ?? undefined,
            items: items.map((it: any) => ({
              name: String(it.name ?? "item"),
              quantity: `${it.quantity ?? 1} ${it.unit ?? "pcs"}`.trim(),
            })),
            amount: data.amount ? Number(data.amount) : undefined,
            trustScore: 82,
            outstanding: 1850,
            creditLimit: 5000,
            stage: "ready_for_fulfillment",
            decision: "approve",
            reasoning: data.reasoning ?? "Customer approved voice order.",
            language: data.language ?? undefined,
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: Date.now(),
          });
        }

        return Response.json({ ok: true, status: nextStatus });
      },
    },
  },
});
