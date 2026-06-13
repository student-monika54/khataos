import { useEffect, useState } from "react";
import { Download, Smartphone, CheckCircle2, Share } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPWA() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    setShowIOSHelp(true);
  };

  return (
    <section id="install" className="section-y">
      <div className="container-px mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-elevated via-surface to-background p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald/15 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <span className="eyebrow">
                <Smartphone className="h-3.5 w-3.5 text-emerald" />
                Install KhataOS
              </span>
              <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.02em] md:text-[40px]">
                Add KhataOS to your{" "}
                <span className="emerald-text">home screen</span>.
              </h2>
              <p className="mt-3 max-w-xl text-[14px] text-ink-muted md:text-[16px]">
                Launch like a native app. Works on Android, iOS and desktop —
                no app store, instant updates, full-screen experience.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2">
              {installed ? (
                <div className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-5 py-3 text-[14px] font-semibold text-emerald">
                  <CheckCircle2 className="h-4 w-4" />
                  Installed
                </div>
              ) : (
                <button
                  onClick={handleInstall}
                  className="group btn-primary justify-center"
                >
                  <Download className="h-4 w-4" />
                  Install Web App
                </button>
              )}
              <span className="text-center text-[11px] text-ink-subtle">
                ~38 MB · works offline
              </span>
            </div>
          </div>

          {showIOSHelp && !installed && (
            <div className="relative mt-6 rounded-2xl border border-border bg-background/60 p-4 text-[13px] text-ink-muted">
              <div className="flex items-start gap-3">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
                <div>
                  <div className="font-medium text-foreground">
                    {isIOS ? "Install on iOS" : "Install from browser menu"}
                  </div>
                  <p className="mt-1">
                    {isIOS
                      ? "Tap the Share icon in Safari, then choose “Add to Home Screen”."
                      : "Open your browser menu (⋮ on Chrome / Edge) and choose “Install app” or “Add to Home screen”."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
