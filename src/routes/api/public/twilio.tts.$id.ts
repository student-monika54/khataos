// Serves a cached Sarvam TTS audio clip to Twilio's <Play>.
import { createFileRoute } from "@tanstack/react-router";
import { getTts } from "@/lib/khataos/tts-cache.server";

export const Route = createFileRoute("/api/public/twilio/tts/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const entry = getTts(params.id);
        if (!entry) return new Response("Not found", { status: 404 });
        const body = new Uint8Array(entry.audio); // ensure ArrayBuffer-backed
        return new Response(body as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": entry.contentType,
            "Cache-Control": "public, max-age=300",
            "Content-Length": String(entry.audio.byteLength),
          },
        });
      },
    },
  },
});
