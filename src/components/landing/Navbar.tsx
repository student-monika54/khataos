import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import logoAsset from "@/assets/khataos-logo.png.asset.json";

const links = [
  { href: "#problem", label: "Problem" },
  { href: "#architecture", label: "Architecture" },
  { href: "#agents", label: "Agents" },
  { href: "#demo", label: "Demo" },
  { href: "#impact", label: "Impact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-nav" : "bg-transparent"
      }`}
    >
      <div className="container-px mx-auto flex h-16 max-w-7xl items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40">
            <span className="font-display text-sm font-bold text-background">K</span>
            <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            KhataOS
          </span>
          <span className="ml-2 hidden rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted md:inline-block">
            Beta
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-ink-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href="#cta" className="text-[13px] font-medium text-ink-muted hover:text-foreground">
            Sign in
          </a>
          <a href="#demo" className="btn-primary hover:[transform:translateY(-1px)]">
            Start Demo
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-nav md:hidden"
          >
            <div className="container-px mx-auto flex max-w-7xl flex-col gap-1 py-4">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-sm font-medium text-ink hover:bg-surface"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#demo"
                onClick={() => setOpen(false)}
                className="mt-2 btn-primary justify-center"
              >
                Start Demo
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
