"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SLIDES = [
  {
    image: "https://picsum.photos/seed/onboard-1/600/700",
    title: "Choose Your Style",
    desc: "Pick hairstyles, fades, lengths and back designs from a full gallery.",
  },
  {
    image: "https://picsum.photos/seed/onboard-2/600/700",
    title: "Preview Instantly",
    desc: "Every change reflects on your model right away — no waiting, no guessing.",
  },
  {
    image: "https://picsum.photos/seed/onboard-3/600/700",
    title: "Save Your Look",
    desc: "Save your hairstyle and show it to your barber before you sit in the chair.",
  },
];

export default function CustomizeOnboardingModal({ open, onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;

  const next = () => (isLast ? onClose() : setSlide((s) => s + 1));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-5"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-bright)", maxHeight: "88vh" }}
          >
            <div className="flex justify-end px-3 pt-3">
              <button onClick={onClose} className="text-xs font-semibold px-2 py-1" style={{ color: "var(--text-muted)" }}>
                Skip
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col px-5 pb-2"
              >
                {/* Image — ~70% of slide height */}
                <div
                  className="w-full rounded-2xl overflow-hidden mb-4"
                  style={{ height: "46vh", background: "var(--bg-elevated)" }}
                >
                  <img src={SLIDES[slide].image} alt={SLIDES[slide].title} className="w-full h-full object-cover" />
                </div>

                <h2 className="text-lg font-black text-center mb-1.5" style={{ color: "var(--text-primary)" }}>
                  {SLIDES[slide].title}
                </h2>
                <p className="text-xs text-center leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
                  {SLIDES[slide].desc}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="px-5 pb-5 flex flex-col gap-3">
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === slide ? 22 : 8,
                      background: i === slide ? "var(--accent)" : "var(--border-bright)",
                    }}
                  />
                ))}
              </div>

              <button onClick={next} className="btn-primary">
                {isLast ? "Got It" : "Next"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
