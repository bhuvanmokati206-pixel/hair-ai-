"use client";

import type { HairAnalysis } from "./HairAIAutomation";
import { recommendCombos } from "@/lib/combos";

const KIND_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  treatment: { bg: "rgba(79,214,156,0.12)", color: "#4FD69C", label: "Treatment" },
  combo:     { bg: "rgba(143,167,154,0.12)", color: "#8FA79A", label: "Combo" },
};

export default function TreatmentsSection({ analysis }: { analysis: HairAnalysis }) {
  const items = recommendCombos(analysis);

  if (items.length === 0) {
    return (
      <div className="px-5">
        <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No treatment suggestions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 flex flex-col gap-3">
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Suggested for this customer based on their hair analysis.
      </p>
      {items.map((it) => {
        const k = KIND_STYLE[it.kind] ?? KIND_STYLE.treatment;
        return (
          <div key={it.id} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{it.name}</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ background: k.bg, color: k.color }}>
                {k.label}
              </span>
            </div>

            <p className="text-xs leading-relaxed">
              <span style={{ color: "var(--text-muted)" }}>What it does: </span>
              <span style={{ color: "var(--text-secondary)" }}>{it.whatItDoes}</span>
            </p>
            <p className="text-xs leading-relaxed mt-1.5">
              <span style={{ color: "var(--text-muted)" }}>Why it suits them: </span>
              <span style={{ color: "var(--text-secondary)" }}>{it.reason}</span>
            </p>

            <div className="flex gap-1.5 flex-wrap mt-2.5">
              {it.services.map((s) => (
                <span key={s} className="px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
