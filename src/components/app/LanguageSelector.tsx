// Multilingual selector with live detection display.

import { Globe2 } from "lucide-react";
import { LANG_META, type DemoLanguage } from "@/lib/khataos/demo-mode";

export function LanguageSelector({
  selected, detected, confidence, onChange,
}: {
  selected: DemoLanguage;
  detected?: DemoLanguage | string;
  confidence?: number;
  onChange: (l: DemoLanguage) => void;
}) {
  const languages: DemoLanguage[] = ["Hindi", "English", "Kannada", "Tamil", "Telugu"];
  return (
    <div className="rounded-2xl border border-border bg-elevated/60 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          <Globe2 className="h-3 w-3 text-emerald" /> Voice language
        </div>
        {detected && (
          <div className="text-[10px] text-emerald">
            Detected: <span className="font-semibold">{detected}</span>
            {confidence != null && <span className="ml-1 text-ink-muted">· {Math.round(confidence * 100)}%</span>}
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
        {languages.map((l) => {
          const meta = LANG_META[l];
          const active = selected === l;
          return (
            <button
              key={l}
              onClick={() => onChange(l)}
              className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? "border-emerald bg-emerald text-[#06140b]"
                  : "border-border bg-surface/60 text-ink-muted hover:border-emerald/40"
              }`}
            >
              <span className="mr-1">{meta.native}</span>
              <span className="text-[9px] opacity-70">{l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
