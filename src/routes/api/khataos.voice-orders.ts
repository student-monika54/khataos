// Customer-facing voice orders queue. GET = list pending+recent for a customer.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/khataos/voice-orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const customerId = url.searchParams.get("customerId");
        if (!customerId) return Response.json([], { status: 200 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("voice_orders")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(25);
        if (error) {
          console.error("[voice-orders] list failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json(data ?? []);
      },
    },
  },
});
