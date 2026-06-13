import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/app/BottomNav";

export const Route = createFileRoute("/app")({
  component: () => (
    <>
      <Outlet />
      <BottomNav />
    </>
  ),
});
