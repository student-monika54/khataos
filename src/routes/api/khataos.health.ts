// Health/status for Twilio + OpenRouter (Lovable AI) + Commerce Brain.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/khataos/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          twilio: {
            configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
            phone: process.env.TWILIO_PHONE_NUMBER ?? null,
            accountSidMasked: process.env.TWILIO_ACCOUNT_SID
              ? process.env.TWILIO_ACCOUNT_SID.slice(0, 6) + "…" + process.env.TWILIO_ACCOUNT_SID.slice(-4)
              : null,
            mediaStreamWss: process.env.TWILIO_MEDIA_STREAM_WSS ?? null,
            mediaStreamReady: !!process.env.TWILIO_MEDIA_STREAM_WSS,
          },
          ai: {
            configured: !!process.env.LOVABLE_API_KEY,
            provider: "Lovable AI Gateway (OpenRouter-compatible)",
            model: "google/gemini-3-flash-preview",
          },
        });
      },
    },
  },
});
