import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import logoAsset from "@/assets/khataos-logo.png.asset.json";

export function AppHeader({
  title, subtitle, back, right,
}: { title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3.5">
        {back ? (
          <button
            onClick={() => router.history.back()}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <Link to="/app" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="" className="h-7 w-7 rounded-md object-cover" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[11px] text-ink-muted">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}

export function AppScreen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md pb-28">{children}</div>
    </div>
  );
}

export function StatCard({
  label, value, hint, accent,
}: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/60 p-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-subtle">{label}</div>
      <div className={`mt-1.5 font-display text-2xl font-semibold tracking-tight ${accent ? "text-emerald" : "text-foreground"}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-ink-muted">{hint}</div>}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2.5 flex items-center justify-between px-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{title}</h2>
        {action}
      </div>
      <div className="px-4">{children}</div>
    </section>
  );
}
