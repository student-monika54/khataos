// Floating Judge Mode indicator visible across the entire /app
// experience. Confirms demo data + scripted flows are wired up.

import { useLocation } from "@tanstack/react-router";
import { useDemoMode, toggleDemoMode } from "@/lib/khataos/demo-mode";
import { Wand2 } from "lucide-react";

export function JudgeModeBadge() {
  const pathname = useLocation({ select: (s) => s.pathname });
  const enabled = useDemoMode((s) => s.enabled);
  if (!pathname.startsWith("/app")) return null;
  return (
    <button
      onClick={toggleDemoMode}
      className={`fixed right-3 top-[72px] z-40 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-xl transition ${
        enabled
          ? "border-emerald/50 bg-emerald/15 text-emerald"
          : "border-border bg-background/80 text-ink-subtle"
      }`}
      aria-pressed={enabled}
    >
      <Wand2 className="h-3 w-3" />
      {enabled ? "Judge mode" : "Live mode"}
    </button>
  );
}
