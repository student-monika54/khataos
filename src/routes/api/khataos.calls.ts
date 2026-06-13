// Live call API for the in-app simulated dialer + dashboards.
// Mirrors the guided voice-commerce state machine used by Twilio so the
// browser demo and real phone path share one Financial Brain pipeline.

import { createFileRoute } from "@tanstack/react-router";
import {
  appendTurnServer, getActiveCallServer, getCall, listCallsServer,
  patchCall, putCall,
} from "@/lib/khataos/call-store.server";
import { publishLiveOrder, listLiveOrders } from "@/lib/khataos/live-orders.server";
import { runFinancialBrain } from "@/lib/khataos/financial-brain.server";
import type { CartLine } from "@/lib/khataos/calls";

type Customer = {
  id: string; name: string; phone: string;
  trustScore: number; outstanding: number; creditLimit: number; reliability: number;
};

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
          action: "start" | "checkout" | "credit" | "payment" | "status" | "end" | "say";
          callId?: string;
          customer?: Customer;
          cart?: CartLine[];
          amount?: number;
          commitment?: { days: number; text: string };
          language?: string;
          text?: string;
          templateId?: string;
        };

        if (body.action === "start" && body.customer) {
          const id = `sim_${Date.now()}`;
          putCall({
            id, customerId: body.customer.id, customerName: body.customer.name,
            phone: body.customer.phone, state: "listening",
            startedAt: Date.now(), source: "simulated",
            language: body.language ?? "English",
            cart: [], menuState: "menu",
            transcript: [{
              role: "agent", at: Date.now(),
              text: `KhataOS connected. ${body.customer.name}.`,
              templateId: "GREETING", agent: "InsightsAgent",
            }],
          });
          return Response.json({ callId: id });
        }

        if (body.action === "say" && body.callId && body.text) {
          appendTurnServer(body.callId, {
            role: (body.templateId ? "agent" : "customer"),
            at: Date.now(), text: body.text, templateId: body.templateId,
          });
          return Response.json({ ok: true });
        }

        if (body.action === "checkout" && body.callId && body.customer && body.cart?.length) {
          const cust = body.customer;
          const cart = body.cart;
          const total = cart.reduce((s, l) => s + l.qty * l.price, 0);
          const orderId = `lo_${body.callId}_${Date.now()}`;

          // Stage 1 — pending credit review
          publishLiveOrder({
            id: orderId, callId: body.callId, customerId: cust.id,
            customerName: cust.name, phone: cust.phone,
            items: cart.map((l) => ({ name: l.name, quantity: `${l.qty} ${l.unit}` })),
            amount: total, trustScore: cust.trustScore, outstanding: cust.outstanding,
            creditLimit: cust.creditLimit, stage: "checking_credit",
            language: body.language, createdAt: Date.now(), updatedAt: Date.now(),
          });

          const fin = await runFinancialBrain({
            intent: "KHATA_ORDER", customerName: cust.name, trustScore: cust.trustScore,
            outstanding: cust.outstanding, creditLimit: cust.creditLimit,
            reliability: cust.reliability, requestedAmount: total,
          });
          const stage = fin.decision === "approve" ? "ready_for_fulfillment"
            : fin.decision === "reject" ? "rejected"
            : fin.decision === "conditional" ? "conditional"
            : "ready_for_fulfillment";

          // Stage 2 — final decision
          setTimeout(() => publishLiveOrder({
            id: orderId, callId: body.callId!, customerId: cust.id,
            customerName: cust.name, phone: cust.phone,
            items: cart.map((l) => ({ name: l.name, quantity: `${l.qty} ${l.unit}` })),
            amount: total, trustScore: cust.trustScore, outstanding: cust.outstanding,
            creditLimit: cust.creditLimit, stage,
            decision: fin.decision === "info" ? undefined : fin.decision,
            reasoning: fin.reasoning, language: body.language,
            createdAt: Date.now(), updatedAt: Date.now(),
          }), 700);

          patchCall(body.callId, {
            cart: [], menuState: "menu",
            currentIntent: "KHATA_ORDER", currentAgent: fin.agent,
            recommendation: fin.reasoning,
          });
          return Response.json({ orderId, decision: fin.decision, stage, reasoning: fin.reasoning, amount: total, recommendedAmount: fin.recommendedAmount });
        }

        if (body.action === "credit" && body.callId && body.customer && body.amount != null) {
          const cust = body.customer;
          const fin = await runFinancialBrain({
            intent: "CREDIT_REQUEST", customerName: cust.name, trustScore: cust.trustScore,
            outstanding: cust.outstanding, creditLimit: cust.creditLimit,
            reliability: cust.reliability, requestedAmount: body.amount,
          });
          return Response.json({ decision: fin.decision, reasoning: fin.reasoning, recommendedAmount: fin.recommendedAmount });
        }

        if (body.action === "payment" && body.callId && body.commitment) {
          patchCall(body.callId, { recommendation: `Promised to pay ${body.commitment.text}` });
          return Response.json({ ok: true, text: body.commitment.text });
        }

        if (body.action === "status" && body.callId) {
          const orders = listLiveOrders().filter((o) => o.callId === body.callId);
          return Response.json({ order: orders[0] ?? null });
        }

        if (body.action === "end" && body.callId) {
          const c = getCall(body.callId);
          if (c) {
            const dur = Math.round((Date.now() - c.startedAt) / 1000);
            patchCall(body.callId, {
              state: "completed", endedAt: Date.now(), durationSec: dur,
              outcome: c.currentIntent === "KHATA_ORDER" ? "credit_approved" : "info",
              summary: c.transcript.filter((t) => t.role === "agent").slice(-2).map((t) => t.text).join(" ").slice(0, 200),
            });
          }
          return Response.json({ ok: true });
        }

        return new Response("Bad request", { status: 400 });
      },
    },
  },
});
