"use client";

// Shown between photo capture and analysis. Collects a few quick preferences
// (professional vs casual, upkeep, length change, boldness) that get woven into
// the analysis prompt so the suggested styles match what the customer wants —
// not just what their hair allows. Every question is optional; "Skip" runs the
// analysis on hair alone.

import { useState } from "react";
import { motion } from "framer-motion";
import { PREFERENCE_QUESTIONS, type PreferenceAnswers } from "@/lib/preferences";

// ── NOIR palette (from the imported design) ──────────────────────
const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const FAINT = "#7C766C";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: FAINT,
};

export default function PreferencesStep({
  onSubmit,
  onSkip,
}: {
  onSubmit: (answers: PreferenceAnswers) => void;
  onSkip: () => void;
}) {
  const [answers, setAnswers] = useState<PreferenceAnswers>({});

  const pick = (qId: string, value: string) =>
    setAnswers((a) => ({ ...a, [qId]: a[qId] === value ? "" : value }));

  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: INK, paddingBottom: 150 }}>
      <div style={{ padding: "56px 22px 4px" }}>
        <div style={MICRO}>Before we suggest styles</div>
        <div style={{ marginTop: 10, fontSize: 26, fontWeight: 200, letterSpacing: ".04em" }}>A few quick questions</div>
        <div style={{ marginTop: 8, fontSize: 13, color: MUTE }}>
          Tap what fits — it tunes the AI&apos;s picks to what you actually want.
        </div>
      </div>

      <div style={{ padding: "18px 22px 0", display: "flex", flexDirection: "column", gap: 22 }}>
        {PREFERENCE_QUESTIONS.map((q, qi) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: qi * 0.05 }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{q.question}</div>
              {q.helper && <span style={{ fontSize: 11, color: FAINT, flexShrink: 0 }}>{q.helper}</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              {q.options.map((o) => {
                const active = answers[q.id] === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => pick(q.id, o.value)}
                    style={{
                      padding: "11px 15px", borderRadius: 13, fontSize: 13, fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                      transition: "all .2s ease",
                      background: active ? "rgba(143,167,154,.16)" : "rgba(23,22,20,.72)",
                      color: active ? "#BFD2C7" : INK,
                      border: `1px solid ${active ? "rgba(143,167,154,.5)" : "rgba(242,239,233,.09)"}`,
                    }}
                  >
                    {o.emoji && <span>{o.emoji}</span>}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sticky actions */}
      <div className="fixed bottom-0 left-0 right-0" style={{ padding: "14px 22px calc(22px + env(safe-area-inset-bottom))", background: "linear-gradient(to top, var(--bg) 72%, transparent)" }}>
        <div
          onClick={() => onSubmit(answers)}
          style={{
            height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase",
            background: "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)", color: "#14130F",
            boxShadow: "0 16px 34px -14px rgba(143,167,154,.6)",
          }}
        >
          {answeredCount > 0 ? `Analyse with ${answeredCount} preference${answeredCount > 1 ? "s" : ""}` : "Analyse my hair"}
        </div>
        <button type="button" className="tap" onClick={onSkip} style={{ width: "100%", textAlign: "center", fontSize: 11, marginTop: 12, padding: "2px 0", cursor: "pointer", color: FAINT, letterSpacing: ".04em" }}>
          Skip — just analyse the photos
        </button>
      </div>
    </div>
  );
}
