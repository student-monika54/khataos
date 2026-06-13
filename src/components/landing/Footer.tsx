import logo from "@/assets/khataos-logo.png.asset.json";

const cols = [
  {
    title: "Product",
    links: ["Overview", "Features", "Architecture", "Demo", "Pricing"],
  },
  {
    title: "Technology",
    links: ["WebLLM", "On-Device AI", "Cloud Agents", "Security", "Roadmap"],
  },
  {
    title: "Contact",
    links: ["hello@khataos.ai", "Press", "Partnerships", "Careers"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="container-px mx-auto max-w-7xl py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src={logo.url} alt="KhataOS" className="h-8 w-8 rounded-md" />
              <span className="font-display text-lg font-bold text-foreground">
                KhataOS
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-ink-muted">
              AI-powered microbank infrastructure for the next 500 million
              Indians. Built for Bharat.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Hackathon Project
            </span>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {c.title}
              </div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-ink-muted transition-colors hover:text-foreground"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-ink-muted md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} KhataOS. Reimagining money for Bharat.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
