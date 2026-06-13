// Twilio status callback — marks call completed.
import { createFileRoute } from "@tanstack/react-router";
import { getCallByTwilioSid, patchCall } from "@/lib/khataos/call-store.server";

export const Route = createFileRoute("/api/public/twilio/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const sid = String(form.get("CallSid") ?? "");
        const status = String(form.get("CallStatus") ?? "");
        const c = getCallByTwilioSid(sid);
        if (c && (status === "completed" || status === "failed" || status === "no-answer" || status === "busy")) {
          patchCall(c.id, {
            state: status === "completed" ? "completed" : "failed",
            endedAt: Date.now(),
            durationSec: Math.round((Date.now() - c.startedAt) / 1000),
          });
        }
        return new Response("ok");
      },
    },
  },
});
