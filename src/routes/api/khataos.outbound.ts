// Real Twilio outbound call creation via REST API (no SDK required).
// POST /api/khataos/outbound { to: "+91…", mediaStream?: boolean }
// GET  /api/khataos/outbound?sid=CAxxxx  → live status from Twilio
import { createFileRoute } from "@tanstack/react-router";

function basicAuth(sid: string, token: string) {
  return "Basic " + btoa(`${sid}:${token}`);
}

export const Route = createFileRoute("/api/khataos/outbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE_NUMBER;
        if (!sid || !token || !from) {
          return Response.json({ error: "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER." }, { status: 500 });
        }
        const body = (await request.json().catch(() => ({}))) as { to?: string; mediaStream?: boolean };
        const to = (body.to ?? "").trim();
        if (!/^\+\d{8,15}$/.test(to)) {
          return Response.json({ error: "Provide 'to' in E.164 format, e.g. +9198…" }, { status: 400 });
        }
        const origin = new URL(request.url).origin;
        const voiceUrl = `${origin}/api/public/twilio/voice${body.mediaStream ? "?stream=1" : ""}`;
        const statusUrl = `${origin}/api/public/twilio/status`;

        const form = new URLSearchParams({
          To: to,
          From: from,
          Url: voiceUrl,
          Method: "POST",
          StatusCallback: statusUrl,
          StatusCallbackMethod: "POST",
        });
        ["initiated", "ringing", "answered", "completed"].forEach((s) => form.append("StatusCallbackEvent", s));

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
          method: "POST",
          headers: {
            Authorization: basicAuth(sid, token),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
        });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok) {
          return Response.json({ error: data?.message ?? "Twilio error", code: data?.code, status: res.status }, { status: 502 });
        }
        return Response.json({
          sid: data.sid,
          status: data.status,
          to: data.to,
          from: data.from,
          dateCreated: data.date_created,
          voiceUrl,
          statusUrl,
          mediaStream: !!body.mediaStream,
        });
      },
      GET: async ({ request }) => {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        if (!sid || !token) return Response.json({ error: "Not configured" }, { status: 500 });
        const callSid = new URL(request.url).searchParams.get("sid");
        if (!callSid) return Response.json({ error: "Missing sid" }, { status: 400 });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}.json`, {
          headers: { Authorization: basicAuth(sid, token) },
        });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok) return Response.json({ error: data?.message ?? "Twilio error" }, { status: 502 });
        return Response.json({
          sid: data.sid,
          status: data.status,        // queued | initiated | ringing | in-progress | completed | busy | failed | no-answer | canceled
          direction: data.direction,
          duration: data.duration,
          from: data.from,
          to: data.to,
          startTime: data.start_time,
          endTime: data.end_time,
          price: data.price,
        });
      },
    },
  },
});
