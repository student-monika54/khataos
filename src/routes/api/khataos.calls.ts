// Live call API: list/active + simulated turn endpoint for the demo dialer.
import { createFileRoute } from "@tanstack/react-router";
import {
  appendTurnServer, getActiveCallServer, getCall, listCallsServer,
  patchCall, putCall,
} from "@/lib/khataos/call-store.server";
import { processTurn } from "@/lib/khataos/orchestrator.server";
import { runCommerceBrainRules } from "@/lib/khataos/commerce-brain-rules";
import { publishLiveOrder, patchLiveOrder } from "@/lib/khataos/live-orders.server";

export const Route = createFileRoute("/api/khataos/calls")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("active") === "1") {
          return Response.json(getActiveCallServer() ?? null);
        }
        return Response.json(listCallsServer());
      },
      POST: async ({ request }) => {
        const body = await request.json() as {
          action: "start" | "speak" | "end";
          callId?: string;
          customer?: { id: string; name: string; phone: string; trustScore: number; outstanding: number; creditLimit: number; reliability: number };
          text?: string;
        };
        if (body.action === "start" && body.customer) {
          const id = `sim_${Date.now()}`;
          putCall({
            id, customerId: body.customer.id, customerName: body.customer.name,
            phone: body.customer.phone, state: "listening",
            startedAt: Date.now(), source: "simulated",
            transcript: [{
              role: "agent", at: Date.now(),
              text: `Namaste ${body.customer.name}. KhataOS suniye.`,
              templateId: "GREETING", agent: "InsightsAgent",
            }],
          });
          return Response.json({ callId: id });
        }
        if (body.action === "speak" && body.callId && body.text && body.customer) {
          patchCall(body.callId, { state: "thinking" });

          // Stage 1: publish PENDING order before financial brain runs.
          const preCommerce = runCommerceBrainRules(body.text);
          const isOrderIntent = preCommerce.intent === "KHATA_ORDER" || preCommerce.intent === "CREDIT_REQUEST";
          const orderId = `lo_${body.callId}_${Date.now()}`;
          if (isOrderIntent && preCommerce.items.length > 0) {
            publishLiveOrder({
              id: orderId, callId: body.callId,
              customerId: body.customer.id, customerName: body.customer.name, phone: body.customer.phone,
              items: preCommerce.items, amount: preCommerce.amount,
              trustScore: body.customer.trustScore, outstanding: body.customer.outstanding,
              creditLimit: body.customer.creditLimit,
              stage: "checking_credit",
              createdAt: Date.now(), updatedAt: Date.now(),
            });
          }

          const result = await processTurn(body.text, {
            customerId: body.customer.id,
            customerName: body.customer.name,
            trustScore: body.customer.trustScore,
            outstanding: body.customer.outstanding,
            creditLimit: body.customer.creditLimit,
            reliability: body.customer.reliability,
          });

          if (isOrderIntent && preCommerce.items.length > 0) {
            const decision = result.financial.decision === "info" ? undefined : result.financial.decision;
            const stage = decision === "approve" ? "ready_for_fulfillment"
              : decision === "reject" ? "rejected"
              : decision === "conditional" ? "conditional"
              : "ready_for_fulfillment";
            // Small artificial delay so the UI can render the "checking credit"
            // stage before flipping to the final decision.
            setTimeout(() => patchLiveOrder(orderId, {
              stage, decision,
              amount: result.amount ?? preCommerce.amount,
              reasoning: result.financial.reasoning,
            }), 700);
          }

          result.turns.forEach((t) => appendTurnServer(body.callId!, t));
          patchCall(body.callId, {
            state: "responding",
            currentIntent: result.commerce.intent,
            currentAgent: result.financial.agent,
            language: result.commerce.language,
            recommendation: result.financial.reasoning,
          });
          // brief "responding" -> "listening" toggle
          setTimeout(() => patchCall(body.callId!, { state: "listening" }), 800);
          return Response.json({
            commerce: result.commerce,
            financial: result.financial,
            templateId: result.templateId,
            templateLang: result.templateLang,
            reply: result.reply,
            call: getCall(body.callId),
          });
        }
        if (body.action === "end" && body.callId) {
          const c = getCall(body.callId);
          if (c) {
            const dur = Math.round((Date.now() - c.startedAt) / 1000);
            const credit = c.transcript.filter((t) => t.decision === "approve" && (t.intent === "CREDIT_REQUEST" || t.intent === "KHATA_ORDER")).length;
            patchCall(body.callId, {
              state: "completed", endedAt: Date.now(), durationSec: dur,
              outcome: credit > 0 ? "credit_approved" : "info",
              summary: c.transcript.filter((t) => t.role === "agent").map((t) => t.text).slice(-2).join(" ").slice(0, 200),
            });
          }
          return Response.json({ ok: true });
        }
        return new Response("Bad request", { status: 400 });
      },
    },
  },
});
