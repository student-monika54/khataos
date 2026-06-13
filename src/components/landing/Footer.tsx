const cols = [
  { title: "Product", links: ["Overview", "Architecture", "Agents", "Demo", "Roadmap"] },
  { title: "Technology", links: ["WebLLM", "On-Device AI", "Cloud Agents", "Security", "Privacy"] },
  { title: "Contact", links: ["hello@khataos.ai", "Press", "Partnerships", "Careers"] },
  { title: "Hackathon Project", links: ["Team", "Story", "Pitch Deck", "GitHub"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="container-px mx-auto max-w-7xl py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40">
                <span className="font-display text-sm font-bold text-background">K</span>
              </div>
              <span className="font-display text-lg font-semibold text-foreground">KhataOS</span>
            </div>
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
              AI-powered microbank infrastructure for the next 500 million
              Indians. Built for Bharat.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald/25 bg-emerald/10 px-3 py-1.5 text-[11px] font-medium text-emerald-glow">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
              Hackathon Project · 2026
            </span>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                {c.title}
              </div>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-[13.5px] text-ink-muted transition-colors hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-[12px] text-ink-subtle md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} KhataOS. Reimagining money for Bharat.</div>
          <div className="flex gap-6 font-mono">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
