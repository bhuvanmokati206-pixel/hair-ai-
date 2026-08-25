"use client";

// Shown between photo capture and analysis. Collects a few quick preferences
// (professional vs casual, upkeep, length change, boldness) that get woven into
// the analysis prompt so the suggested styles match what the customer wants —
// not just what their hair allows. Every question is optional; "Skip" runs the
// analysis on hair alone.

import { useState } from "react";
import { motion } from "framer-motion";
import { PREFERENCE_QUESTIONS, type PreferenceAnswers } from "@/lib/preferences";

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
    <div className="min-h-screen pb-40" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-4">
        <p className="section-label">Before we suggest styles</p>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
          A few quick questions
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Tap what fits. It tunes the AI&apos;s picks to what you actually want.
        </p>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {PREFERENCE_QUESTIONS.map((q, qi) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: qi * 0.05 }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{q.question}</h2>
              {q.helper && <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{q.helper}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o) => {
                const active = answers[q.id] === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => pick(q.id, o.value)}
                    className="px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                    style={{
                      background: active ? "var(--accent)" : "var(--bg-card)",
                      color: active ? "#fff" : "var(--text-primary)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
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
      <div className="fixed bottom-0 left-0 right-0 px-5 pt-3 pb-6"
        style={{ background: "linear-gradient(to top, var(--bg) 70%, transparent)" }}>
        <button
          onClick={() => onSubmit(answers)}
          className="w-full btn-primary"
        >
          {answeredCount > 0 ? `Analyse with ${answeredCount} preference${answeredCount > 1 ? "s" : ""}` : "Analyse my hair"}
        </button>
        <button
          onClick={onSkip}
          className="w-full text-center text-xs mt-2.5 py-1"
          style={{ color: "var(--text-muted)" }}
        >
          Skip — just analyse the photos
        </button>
      </div>
    </div>
  );
}
