// Cancel an in-flight Twilio call.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/khataos/outbound/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        if (!sid || !token) return Response.json({ error: "Not configured" }, { status: 500 });
        const { sid: callSid } = (await request.json().catch(() => ({}))) as { sid?: string };
        if (!callSid) return Response.json({ error: "Missing sid" }, { status: 400 });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}.json`, {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${sid}:${token}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ Status: "completed" }).toString(),
        });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok) return Response.json({ error: data?.message ?? "Twilio error" }, { status: 502 });
        return Response.json({ ok: true, status: data.status });
      },
    },
  },
});
