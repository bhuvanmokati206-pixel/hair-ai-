"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
  {
    emoji: "✂️",
    title: "Your AI salon assistant",
    body: "Scan any customer's hair and face in under 60 seconds. Get professional analysis, style recommendations, and AI-generated previews.",
  },
  {
    emoji: "📊",
    title: "Trusted by salons across India",
    body: "Join hundreds of stylists who use Hair AI every day to wow their customers and boost service bookings.",
    stats: [
      { value: "500+", label: "Salons" },
      { value: "12k+", label: "Scans done" },
      { value: "4.9 ★", label: "Avg rating" },
    ],
  },
  {
    emoji: "🚀",
    title: "Three steps, one great result",
    steps: ["Scan the customer's hair & face", "AI analyses and recommends styles", "Preview styles instantly on their photo"],
  },
];

export default function OnboardingPage() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const router = useRouter();

  const go = (next: number) => {
    setDir(next > index ? 1 : -1);
    setIndex(next);
  };

  const finish = () => {
    localStorage.setItem("onboarding_seen", "1");
    router.replace("/login");
  };

  const slide = SLIDES[index];

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Skip */}
      <div className="flex justify-end px-5 pt-12">
        <button onClick={finish} className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Skip
        </button>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center gap-5 w-full"
          >
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
              style={{ background: "var(--accent-light)" }}>
              {slide.emoji}
            </div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{slide.title}</h2>

            {slide.body && (
              <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{slide.body}</p>
            )}

            {slide.stats && (
              <div className="flex gap-6 mt-2">
                {slide.stats.map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold gradient-text">{s.value}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {slide.steps && (
              <div className="flex flex-col gap-3 w-full mt-2">
                {slide.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 card">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: "var(--accent)", color: "#fff" }}>
                      {i + 1}
                    </div>
                    <span className="text-sm text-left" style={{ color: "var(--text-secondary)" }}>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom */}
      <div className="px-6 pb-10 flex flex-col gap-4">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => go(i)}>
              <motion.div
                animate={{ width: i === index ? 24 : 8, opacity: i === index ? 1 : 0.35 }}
                transition={{ duration: 0.3 }}
                className="h-2 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            </button>
          ))}
        </div>

        {index < SLIDES.length - 1 ? (
          <button className="btn-primary" onClick={() => go(index + 1)}>Next</button>
        ) : (
          <button className="btn-primary" onClick={finish}>Get Started →</button>
        )}
      </div>
    </div>
  );
}
