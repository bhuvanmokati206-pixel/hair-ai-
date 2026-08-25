"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HairHealthAnswers, HairHealthResult } from "@/app/api/hair-health/route";
import ProductCard from "./ProductCard";

type Props = {
  photoBase64?: string;
  photoMediaType?: string;
  gender?: string;
};

type Question = {
  key: keyof HairHealthAnswers;
  question: string;
  emoji: string;
  options?: string[];
  optionDescriptions?: Record<string, string>;
  freeText?: boolean;
  multi?: boolean;
  withPhotos?: boolean;
  allowCustomCount?: boolean;
};

const QUESTIONS: Question[] = [
  {
    key: "concern",
    question: "What is your main hair concern?",
    emoji: "🔍",
    multi: true,
    withPhotos: true,
    options: ["Dryness", "Frizz", "Hair fall", "Dandruff", "Oiliness", "Colour damage", "Breakage"],
    optionDescriptions: {
      Dryness: "Hair feels rough and lacks moisture",
      Frizz: "Hair is frizzy and unmanageable",
      "Hair fall": "Excessive hair fall or thinning",
      Dandruff: "Itchy scalp and flaky dandruff",
      Oiliness: "Scalp gets greasy quickly",
      "Colour damage": "Dryness or fading after colouring",
      Breakage: "Strands snap or split easily",
    },
  },
  {
    key: "washFrequency",
    question: "How often do you wash your hair?",
    emoji: "🚿",
    options: ["Daily", "Every 2–3 days", "Weekly", "Rarely", "Other"],
    allowCustomCount: true,
  },
  {
    key: "waterType",
    question: "What type of water do you use at home?",
    emoji: "💧",
    options: ["Hard water", "Soft water", "Don't know"],
  },
  {
    key: "diet",
    question: "What is your diet type?",
    emoji: "🥗",
    options: ["Vegetarian", "Non-vegetarian", "Vegan"],
  },
  {
    key: "stressLevel",
    question: "How would you rate your stress level?",
    emoji: "🧘",
    options: ["Low", "Medium", "High"],
  },
  {
    key: "currentProducts",
    question: "What hair products are you currently using?",
    emoji: "🧴",
    freeText: true,
  },
  {
    key: "scalpCondition",
    question: "Do you have any scalp conditions?",
    emoji: "🫧",
    multi: true,
    withPhotos: true,
    options: ["None / Normal", "Itchy scalp", "Flaky / Dandruff", "Oily scalp", "Sensitive scalp"],
    optionDescriptions: {
      "None / Normal": "No particular scalp issues",
      "Itchy scalp": "Frequent itching or irritation",
      "Flaky / Dandruff": "Visible flakes on scalp or shoulders",
      "Oily scalp": "Scalp feels greasy within a day",
      "Sensitive scalp": "Reacts easily to products or heat",
    },
  },
];

const INITIAL_ANSWERS: HairHealthAnswers = {
  concern: [],
  washFrequency: "",
  washFrequencyCount: undefined,
  waterType: "",
  diet: "",
  stressLevel: "",
  currentProducts: "",
  scalpCondition: [],
};

const HAIR_FACTS = [
  "Hair grows about 1.25 cm per month on average — roughly 15 cm a year.",
  "A single strand of hair can support up to 100 grams without breaking.",
  "You lose 50–100 hairs a day naturally — that's part of the normal cycle.",
  "Hair is the second-fastest growing tissue in the body, after bone marrow.",
  "Wet hair stretches up to 30% longer before snapping — handle it gently.",
  "Hot water strips natural scalp oils faster than warm or cool water.",
  "Stress can push hair follicles into a resting phase, increasing shedding.",
  "Hard water buildup on the scalp can make hair feel dry and look dull.",
];

function placeholderPhoto(gender: string, key: string, option: string): string {
  const seed = `${gender}-${key}-${option}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `https://picsum.photos/seed/${seed}/100/100`;
}

function WaveLoader() {
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFactIndex((i) => (i + 1) % HAIR_FACTS.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 px-4">
      {/* Animated wave */}
      <div className="relative w-28 h-28 rounded-full overflow-hidden" style={{ background: "rgba(143,167,154,0.06)", border: "1.5px solid rgba(143,167,154,0.2)" }}>
        <motion.div
          className="absolute left-0 right-0"
          style={{
            height: "200%",
            top: "30%",
            background: "linear-gradient(180deg, rgba(143,167,154,0.35), rgba(169,162,184,0.25))",
            borderRadius: "45%",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-0 right-0"
          style={{
            height: "200%",
            top: "38%",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "42%",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
      </div>

      <div className="text-center">
        <p className="font-bold" style={{ color: "var(--text-primary)" }}>Analysing your hair health…</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>AI trichologist is working</p>
      </div>

      {/* Rotating hair fact */}
      <div className="rounded-2xl p-4 min-h-[72px] flex items-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={factIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-xs leading-relaxed text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            💡 {HAIR_FACTS[factIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function HairHealthWizard({ photoBase64, photoMediaType, gender }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<HairHealthAnswers>(INITIAL_ANSWERS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HairHealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customCount, setCustomCount] = useState<string>("");

  const resolvedGender = gender ?? "female";
  const q = QUESTIONS[step];
  const progress = (step / QUESTIONS.length) * 100;

  const goNext = (updated: HairHealthAnswers) => {
    setAnswers(updated);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      submitAnswers(updated);
    }
  };

  const handleSingleAnswer = (value: string) => {
    if (q.allowCustomCount && value === "Other") {
      // Reveal the custom count input instead of advancing — confirmCustomCount advances later.
      setAnswers({ ...answers, washFrequency: "Other" });
      return;
    }
    goNext({ ...answers, [q.key]: value, ...(q.allowCustomCount ? { washFrequencyCount: undefined } : {}) });
  };

  const confirmCustomCount = () => {
    const n = parseInt(customCount, 10);
    if (!n || n < 1) return;
    goNext({ ...answers, washFrequency: "Other", washFrequencyCount: n });
  };

  const toggleMultiOption = (opt: string) => {
    setAnswers((prev) => {
      const current = (prev[q.key] as string[]) ?? [];
      const updatedList = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt];
      return { ...prev, [q.key]: updatedList };
    });
  };

  const confirmMulti = () => {
    const current = (answers[q.key] as string[]) ?? [];
    if (current.length === 0) return;
    goNext(answers);
  };

  const handleFreeTextSubmit = () => {
    const value = answers.currentProducts || "None";
    goNext({ ...answers, currentProducts: value });
  };

  const submitAnswers = async (finalAnswers: HairHealthAnswers) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hair-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers, photoBase64, photoMediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers(INITIAL_ANSWERS);
    setResult(null);
    setError(null);
    setCustomCount("");
  };

  // ── LOADING ──
  if (loading) return <WaveLoader />;

  // ── ERROR ──
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
        <span className="text-4xl">⚠️</span>
        <p style={{ color: "var(--text-primary)" }}>{error}</p>
        <button onClick={reset} className="btn-primary">Try again</button>
      </div>
    );
  }

  // ── RESULTS ──
  if (result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-6">
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: "rgba(143,167,154,0.04)", border: "1px solid rgba(143,167,154,0.15)", borderLeft: "3px solid var(--accent)" }}>
          <p className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <span>🔬</span> Hair Diagnosis
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{result.diagnosis}</p>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(169,162,184,0.05)", border: "1px solid rgba(169,162,184,0.15)" }}>
          <p className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--accent-purple)" }}>
            <span>🌿</span> Home Remedies
          </p>
          <div className="flex flex-col gap-2.5">
            {result.remedies.map((r, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black"
                  style={{ background: "var(--accent-purple)", color: "#fff" }}>{i + 1}</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="section-label mb-3">Recommended Products</p>
          <div className="flex flex-col gap-3">
            {result.products.map((p, i) => <ProductCard key={i} product={p} index={i} />)}
          </div>
        </div>

        <button onClick={reset} className="btn-ghost w-full">↩ Start new analysis</button>
      </motion.div>
    );
  }

  const multiSelected = q.multi ? ((answers[q.key] as string[]) ?? []) : [];

  // ── QUESTIONNAIRE ──
  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
          <span>Question {step + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "var(--accent)" }}
            animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {/* Chat-style avatar + question bubble */}
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: "linear-gradient(135deg, rgba(143,167,154,0.2), rgba(169,162,184,0.2))", border: "1.5px solid rgba(143,167,154,0.3)" }}>
              {q.emoji}
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{q.question}</p>
              {q.multi && (
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Select all that apply</p>
              )}
              {q.key === "currentProducts" && (
                <p className="text-[11px] mt-1" style={{ color: "var(--accent)" }}>
                  This directly changes your recommendations — be specific
                </p>
              )}
            </div>
          </div>

          {q.freeText ? (
            <div className="flex flex-col gap-3">
              <textarea
                rows={3}
                placeholder="e.g. Himalaya shampoo, coconut oil…"
                value={answers.currentProducts}
                onChange={(e) => setAnswers({ ...answers, currentProducts: e.target.value })}
                className="w-full rounded-2xl p-4 text-sm resize-none outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
              />
              <button onClick={handleFreeTextSubmit} className="btn-primary">
                {step === QUESTIONS.length - 1 ? "Get recommendations →" : "Next →"}
              </button>
              {step === QUESTIONS.length - 1 && (
                <button onClick={() => goNext({ ...answers, currentProducts: "None" })} className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                  Skip — I don&apos;t use any products
                </button>
              )}
            </div>
          ) : q.withPhotos ? (
            <div className="flex flex-col gap-2.5">
              {q.options?.map((opt) => {
                const selected = multiSelected.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleMultiOption(opt)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={{
                      background: selected ? "rgba(143,167,154,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${selected ? "rgba(143,167,154,0.4)" : "rgba(255,255,255,0.07)"}`,
                    }}
                  >
                    <img
                      src={placeholderPhoto(resolvedGender, q.key, opt)}
                      alt={opt}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      style={{ border: "1px solid var(--border)" }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: selected ? "var(--accent)" : "var(--text-primary)" }}>{opt}</p>
                      {q.optionDescriptions?.[opt] && (
                        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{q.optionDescriptions[opt]}</p>
                      )}
                    </div>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                      style={{ background: selected ? "var(--accent)" : "transparent", border: `1.5px solid ${selected ? "var(--accent)" : "var(--border-bright)"}`, color: "#000" }}>
                      {selected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
              <button onClick={confirmMulti} disabled={multiSelected.length === 0} className="btn-primary mt-2 disabled:opacity-40">
                {step === QUESTIONS.length - 1 ? "Get recommendations →" : `Next (${multiSelected.length} selected) →`}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {q.options?.map((opt) => {
                const selected = answers[q.key] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSingleAnswer(opt)}
                    className="w-full py-3.5 px-4 rounded-2xl text-sm font-semibold text-left transition-all active:scale-[0.98]"
                    style={{
                      background: selected ? "rgba(143,167,154,0.08)" : "rgba(255,255,255,0.03)",
                      color: selected ? "var(--accent)" : "var(--text-secondary)",
                      border: `1.5px solid ${selected ? "rgba(143,167,154,0.35)" : "rgba(255,255,255,0.07)"}`,
                      boxShadow: selected ? "0 0 12px rgba(143,167,154,0.1)" : "none",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}

              {/* Custom "Other" count input — wash frequency question only */}
              {q.allowCustomCount && answers.washFrequency === "Other" && (
                <div className="rounded-2xl p-3 flex items-center gap-2.5 mt-1"
                  style={{ background: "rgba(143,167,154,0.05)", border: "1.5px solid rgba(143,167,154,0.25)" }}>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    placeholder="e.g. 5"
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>times / week</span>
                  <button onClick={confirmCustomCount} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "var(--accent)", color: "#000" }}>
                    Confirm
                  </button>
                </div>
              )}
            </div>
          )}

          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="mt-4 text-sm w-full text-center" style={{ color: "var(--text-muted)" }}>
              ← Back
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
