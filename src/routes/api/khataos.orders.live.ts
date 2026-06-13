// Polling endpoint for the shopkeeper Live Orders panel.
import { createFileRoute } from "@tanstack/react-router";
import { listLiveOrders } from "@/lib/khataos/live-orders.server";

export const Route = createFileRoute("/api/khataos/orders/live")({
  server: {
    handlers: {
      GET: async () => Response.json(listLiveOrders()),
    },
  },
});
