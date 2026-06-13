import { createFileRoute } from "@tanstack/react-router";
import { AppHeader, AppScreen, Section } from "@/components/app/AppShell";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Cpu, Brain, Phone, Wand2 } from "lucide-react";
import { TEMPLATE_CATALOG } from "@/lib/khataos/templates";
import { AGENT_META } from "@/lib/khataos/calls";
import { useDemoMode, toggleDemoMode } from "@/lib/khataos/demo-mode";

export const Route = createFileRoute("/app/shopkeeper/settings")({ component: Settings });

function Settings() {
  const [health, setHealth] = useState<any>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const demoEnabled = useDemoMode((s) => s.enabled);

  useEffect(() => { fetch("/api/khataos/health").then((r) => r.json()).then(setHealth); }, []);

  async function ping() {
    const t = Date.now();
    await fetch("/api/khataos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "customer_voice", message: "ping" }) });
    setLatency(Date.now() - t);
  }

  return (
    <AppScreen>
      <AppHeader title="Integrations" subtitle="Calling infrastructure" />
      <div className="px-4 pt-3 space-y-3">
        <button
          onClick={toggleDemoMode}
          className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            demoEnabled
              ? "border-emerald/50 bg-gradient-to-br from-emerald/[0.12] to-elevated/40"
              : "border-border bg-elevated/60"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${demoEnabled ? "bg-emerald/20 text-emerald" : "bg-surface text-ink-subtle"}`}>
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[13px] font-semibold">Judge / Demo mode</div>
              <div className="text-[11px] text-ink-muted">Preloaded customers, transcripts, scripted scenarios</div>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${demoEnabled ? "text-emerald" : "text-ink-subtle"}`}>
            {demoEnabled ? "ON" : "OFF"}
          </span>
        </button>

        <StatusCard
          icon={Phone} title="Twilio Voice"
          status={health?.twilio?.configured ? "Connected" : "Not configured"}
          ok={!!health?.twilio?.configured}
          detail={health?.twilio?.phone ?? "Add TWILIO_PHONE_NUMBER secret"}
          extra={health?.twilio?.accountSidMasked ? `Account: ${health.twilio.accountSidMasked}` : undefined}
        />
        <StatusCard
          icon={Brain} title="OpenRouter / Lovable AI"
          status={health?.ai?.configured ? "Connected" : "Missing key"}
          ok={!!health?.ai?.configured}
          detail={health?.ai?.model ?? "—"}
          extra={latency ? `Last response: ${latency} ms` : undefined}
        />
        <StatusCard icon={Cpu} title="Commerce Brain (WebLLM)"
          status="On-device · lazy"
          ok={true}
          detail="Llama-3.2-1B-Instruct q4f16 · 950MB"
          extra="Loads on first call. Rules engine fallback always on."
        />

        <button onClick={ping} className="w-full rounded-2xl border border-border bg-elevated/60 px-4 py-3 text-[12px] font-semibold text-emerald">
          Test agent response time
        </button>
      </div>

      <Section title="Twilio webhook URL">
        <div className="rounded-2xl border border-border bg-elevated/60 p-3 font-mono text-[10.5px] leading-snug text-ink-muted break-all">
          POST /api/public/twilio/voice<br/>
          Status callback: /api/public/twilio/status
        </div>
        <p className="mt-2 text-[11px] text-ink-subtle">Paste your published <code>https://&lt;project&gt;.lovable.app/api/public/twilio/voice</code> URL into the Twilio number's Voice webhook to receive real calls.</p>
      </Section>

      <Section title="AI agents">
        <ul className="space-y-1.5">
          {Object.entries(AGENT_META).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between rounded-xl border border-border bg-elevated/60 px-3 py-2">
              <div>
                <div className="text-[12.5px] font-semibold">{v.label}</div>
                <div className="text-[10.5px] text-ink-subtle">{v.desc}</div>
              </div>
              <Wand2 className="h-3.5 w-3.5 text-emerald" />
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Templates · ${TEMPLATE_CATALOG.length}`}>
        <div className="grid grid-cols-2 gap-1.5">
          {TEMPLATE_CATALOG.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-elevated/60 px-2.5 py-2">
              <div className="text-[11px] font-semibold">{t.label}</div>
              <div className="text-[10px] text-ink-subtle">{t.agent}</div>
            </div>
          ))}
        </div>
      </Section>
    </AppScreen>
  );
}

function StatusCard({ icon: Icon, title, status, ok, detail, extra }: any) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-emerald" />
          <div className="text-[13px] font-semibold">{title}</div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${ok ? "text-emerald" : "text-destructive"}`}>
          {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {status}
        </span>
      </div>
      <div className="mt-1.5 text-[11.5px] text-ink-muted">{detail}</div>
      {extra && <div className="mt-0.5 text-[10.5px] text-ink-subtle">{extra}</div>}
    </div>
  );
}
