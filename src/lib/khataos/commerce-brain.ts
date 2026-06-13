// Browser Commerce Brain — lazy-loads WebLLM (Llama-3.2-1B-Instruct q4f16)
// on demand. Falls back to deterministic rules if WebLLM is unavailable.

import { runCommerceBrainRules, type CommerceBrainOutput } from "./commerce-brain-rules";

let engine: any = null;
let loadPromise: Promise<any> | null = null;
let loadProgress = 0;
const progressListeners = new Set<(p: number, text: string) => void>();
let lastText = "Idle";

export function onCommerceBrainProgress(cb: (p: number, text: string) => void) {
  progressListeners.add(cb);
  cb(loadProgress, lastText);
  return () => progressListeners.delete(cb);
}

function notify(p: number, text: string) {
  loadProgress = p; lastText = text;
  progressListeners.forEach((l) => l(p, text));
}

const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export async function loadCommerceBrain(): Promise<any> {
  if (engine) return engine;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    notify(0, "Booting WebLLM runtime…");
    const webllm = await import("@mlc-ai/web-llm");
    notify(0.05, "Fetching model shards…");
    const e = await webllm.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (r: { progress: number; text: string }) => {
        notify(r.progress, r.text);
      },
    });
    notify(1, "Commerce Brain ready");
    engine = e;
    return e;
  })();
  return loadPromise;
}

export function isBrainReady() { return !!engine; }

const SYS = `You are the Commerce Brain on-device for KhataOS. Parse the customer's spoken text and respond ONLY with JSON of the shape:
{"intent":"END_CALL|GREETING|BALANCE_INQUIRY|KHATA_ORDER|CREDIT_REQUEST|PAYMENT_CONFIRMATION|PAYMENT_PROMISE|REPAYMENT|SETTLEMENT|TRUST_INQUIRY|COLLECTIONS_FOLLOWUP|ESCALATE|GENERAL_HELP|UNKNOWN","language":"Hindi|English|Hinglish|Kannada","items":[{"name":string,"quantity":string}],"amount":number|null}
No prose, no markdown. quantity like "2kg" "1L" "1pack".`;

export async function runCommerceBrain(text: string): Promise<CommerceBrainOutput> {
  const rules = runCommerceBrainRules(text);
  if (!engine) return rules;
  try {
    const res = await engine.chat.completions.create({
      messages: [
        { role: "system", content: SYS },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 256,
    });
    const raw = res.choices?.[0]?.message?.content ?? "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return rules;
    const parsed = JSON.parse(m[0]);
    const parsedIntent = typeof parsed.intent === "string" ? parsed.intent : undefined;
    const parsedLanguage = typeof parsed.language === "string" ? parsed.language : undefined;
    const intent = rules.intent !== "UNKNOWN" || rules.endCall ? rules.intent : (parsedIntent ?? rules.intent);
    return {
      intent,
      language: parsedLanguage ?? rules.language,
      items: Array.isArray(parsed.items) ? parsed.items : rules.items,
      amount: parsed.amount ?? rules.amount,
      rawText: text,
      confidence: Math.max(rules.confidence, 0.95),
      languageConfidence: rules.languageConfidence,
      intentConfidence: Math.max(rules.intentConfidence, parsedIntent && intent === parsedIntent ? 0.95 : 0),
      endCall: intent === "END_CALL" || rules.endCall,
    };
  } catch {
    return rules;
  }
}

export { runCommerceBrainRules };
export type { CommerceBrainOutput };
