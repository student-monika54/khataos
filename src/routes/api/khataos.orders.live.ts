// Retailer Live Orders polling endpoint — DB-backed.
// Returns shape adapted to the existing shopkeeper UI (LiveOrder).
import { createFileRoute } from "@tanstack/react-router";

function toStage(status: string): string {
  switch (status) {
    case "pending_approval": return "processing";
    case "approved": return "ready_for_fulfillment";
    case "packed": return "ready_for_fulfillment";
    case "ready": return "ready_for_fulfillment";
    case "delivered": return "approved";
    case "rejected": return "rejected";
    default: return "processing";
  }
}

export const Route = createFileRoute("/api/khataos/orders/live")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) {
          console.error("[orders/live] failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        const mapped = (data ?? []).map((o: any) => {
          const items = Array.isArray(o.items) ? o.items : [];
          return {
            id: o.id,
            orderId: o.id,
            callId: o.call_id ?? o.id,
            customerId: o.customer_id,
            customerName: o.customer_name,
            phone: o.phone ?? undefined,
            items: items.map((it: any) => ({
              name: String(it.name ?? "item"),
              quantity: `${it.quantity ?? 1} ${it.unit ?? "pcs"}`.trim(),
            })),
            amount: o.amount != null ? Number(o.amount) : undefined,
            stage: toStage(o.status),
            status: o.status,
            decision: o.status === "approved" || o.status === "packed" || o.status === "ready" || o.status === "delivered"
              ? "approve"
              : o.status === "rejected" ? "reject" : undefined,
            reasoning: o.reasoning ?? undefined,
            language: o.language ?? undefined,
            createdAt: new Date(o.created_at).getTime(),
            updatedAt: new Date(o.updated_at).getTime(),
          };
        });
        return Response.json(mapped);
      },
    },
  },
});
