"use client";

import { motion } from "framer-motion";
import type { GeneratedStyle } from "./HairAIAutomation";

type Props = {
  styles: GeneratedStyle[];
  bestMatch: string;
  onGenerate: (index: number) => void;
};

function StyleCard({
  style,
  isBest,
  onGenerate,
  delay,
}: {
  style: GeneratedStyle;
  isBest: boolean;
  onGenerate: () => void;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card overflow-hidden flex flex-col"
      style={isBest ? { border: "2px solid var(--accent)" } : undefined}
    >
      {isBest && (
        <div className="py-1.5 text-center text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
          ⭐ BEST MATCH
        </div>
      )}

      {/* Image area */}
      <div className="aspect-[4/5] flex items-center justify-center relative" style={{ background: "var(--bg-subtle)" }}>
        {style.imageUrl ? (
          <img src={style.imageUrl} alt={style.styleName} className="w-full h-full object-cover" />
        ) : style.loading ? (
          <div className="flex flex-col items-center gap-3 px-3 text-center">
            <div className="spinner" />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Generating…</p>
          </div>
        ) : style.error ? (
          <div className="flex flex-col items-center gap-2 p-3 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>{style.error}</p>
            <button
              onClick={onGenerate}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Retry
            </button>
          </div>
        ) : (
          <button
            onClick={onGenerate}
            className="flex flex-col items-center gap-2 p-4 text-center w-full h-full justify-center active:scale-95 transition-transform"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: "var(--accent-light)", color: "var(--accent-dark)" }}
            >
              ✨
            </div>
            <p className="text-xs font-semibold" style={{ color: "var(--accent-dark)" }}>Generate preview</p>
          </button>
        )}
      </div>

      {/* Name */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold text-center capitalize leading-tight" style={{ color: "var(--text-primary)" }}>
          {style.styleName}
        </p>
      </div>
    </motion.div>
  );
}

export default function StyleGrid({ styles, bestMatch, onGenerate }: Props) {
  if (!styles.length) return null;

  const anyPending = styles.some((s) => !s.imageUrl && !s.loading);

  const generateAll = () => {
    styles.forEach((s, i) => {
      if (!s.imageUrl && !s.loading) setTimeout(() => onGenerate(i), i * 1200);
    });
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Recommended styles</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {styles.length} styles matched to this hair
          </p>
        </div>
        {anyPending && (
          <button
            onClick={generateAll}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Generate all
          </button>
        )}
      </div>

      {/* Honest note: reference model, not the customer's face */}
      <div
        className="mb-4 rounded-xl p-3 flex items-start gap-2.5"
        style={{ background: "var(--accent-light)", border: "1px solid var(--accent)" }}
      >
        <span className="text-base">ℹ️</span>
        <p className="text-xs" style={{ color: "var(--accent-dark)" }}>
          Previews show the style on a <span className="font-semibold">reference model</span> — not the
          customer&apos;s own face. Use them as a visual guide.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {styles.map((style, i) => (
          <StyleCard
            key={style.styleName}
            style={style}
            isBest={style.styleName.toLowerCase() === bestMatch.toLowerCase()}
            onGenerate={() => onGenerate(i)}
            delay={i * 0.04}
          />
        ))}
      </div>
    </div>
  );
}
