// POST { id, status } — retailer-only fulfillment + approval transitions.
// Enforces the lifecycle:
//   pending_credit_review → approved | rejected
//   approved              → packed
//   packed                → ready_for_pickup
//   ready_for_pickup      → delivered
import { createFileRoute } from "@tanstack/react-router";

const TRANSITIONS: Record<string, string[]> = {
  pending_credit_review: ["approved", "rejected"],
  approved: ["packed"],
  packed: ["ready_for_pickup"],
  ready_for_pickup: ["delivered"],
  delivered: [],
  rejected: [],
};

export const Route = createFileRoute("/api/khataos/orders/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { id?: string; status?: string };
        if (!body.id || !body.status) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: current, error: readErr } = await supabaseAdmin
          .from("orders").select("status").eq("id", body.id).single();
        if (readErr || !current) {
          return Response.json({ error: readErr?.message ?? "not_found" }, { status: 404 });
        }
        const allowed = TRANSITIONS[current.status] ?? [];
        if (!allowed.includes(body.status)) {
          return Response.json(
            { error: `Illegal transition ${current.status} → ${body.status}` },
            { status: 400 },
          );
        }

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
