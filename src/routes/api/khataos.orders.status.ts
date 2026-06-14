// POST { id, status } — retailer-side fulfillment transitions
import { createFileRoute } from "@tanstack/react-router";

const ALLOWED = new Set(["approved", "packed", "ready", "delivered", "rejected"]);

export const Route = createFileRoute("/api/khataos/orders/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { id?: string; status?: string };
        if (!body.id || !body.status || !ALLOWED.has(body.status)) {
          return new Response("Bad request", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("orders")
          .update({ status: body.status })
          .eq("id", body.id);
        if (error) {
          console.error("[orders/status] failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true, status: body.status });
      },
    },
  },
});
