// POST { id, decision: 'approve' | 'reject' }
// Customer approval → status flips to 'approved' (visible to retailer).
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/khataos/orders/decision")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { id?: string; decision?: "approve" | "reject" };
        if (!body.id || (body.decision !== "approve" && body.decision !== "reject")) {
          return new Response("Bad request", { status: 400 });
        }
        const nextStatus = body.decision === "approve" ? "approved" : "rejected";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("orders")
          .update({ status: nextStatus })
          .eq("id", body.id);
        if (error) {
          console.error("[orders/decision] failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true, status: nextStatus });
      },
    },
  },
});
