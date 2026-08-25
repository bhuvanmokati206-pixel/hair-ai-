"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { GeneratedStyle } from "./HairAIAutomation";
import StyleDetailModal from "./StyleDetailModal";

type Props = {
  styles: GeneratedStyle[];
  bestMatch: string;
  onGenerate: (index: number) => void;
  onGenerateGif?: (index: number) => void;
  onGenerateAngle?: (index: number, angle: "left" | "right" | "back") => void;
  onGenerateAllAngles?: (index: number) => void;
  onGenerateGrid?: (index: number) => void;
  noCredits?: boolean;
  onBuyCredits?: () => void;
};

function StyleCard({
  style,
  isBest,
  onGenerate,
  onGenerateGif,
  onOpenDetail,
  noCredits,
  onBuyCredits,
  delay,
}: {
  style: GeneratedStyle;
  isBest: boolean;
  onGenerate: () => void;
  onGenerateGif?: () => void;
  onOpenDetail?: () => void;
  noCredits?: boolean;
  onBuyCredits?: () => void;
  delay: number;
}) {
  const handleGenerate = () => {
    if (noCredits) { onBuyCredits?.(); return; }
    onGenerate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 30 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "var(--bg-card)",
        border: isBest
          ? "1.5px solid rgba(143,167,154,0.4)"
          : "1px solid var(--border)",
        boxShadow: isBest ? "0 0 16px rgba(143,167,154,0.1)" : "none",
      }}
    >
      {isBest && (
        <div
          className="py-1.5 text-center text-[10px] font-black tracking-widest uppercase"
          style={{
            background: "linear-gradient(90deg, rgba(143,167,154,0.15), rgba(169,162,184,0.1))",
            color: "var(--accent)",
            borderBottom: "1px solid rgba(143,167,154,0.2)",
          }}
        >
          ⭐ Best Match
        </div>
      )}

      {/* Image / GIF area */}
      <div
        className="aspect-[4/5] flex items-center justify-center relative overflow-hidden"
        style={{ background: "var(--bg-elevated)" }}
      >
        {style.gifUrl ? (
          <img src={style.gifUrl} alt={`${style.styleName} 360°`} className="w-full h-full object-cover" />
        ) : style.imageUrl ? (
          <button onClick={onOpenDetail} className="w-full h-full relative active:scale-95 transition-transform">
            <img src={style.imageUrl} alt={style.styleName} className="w-full h-full object-cover" />
            {(() => {
              const count = style.angles ? Object.values(style.angles).filter(Boolean).length : 0;
              return (
                <span className="absolute bottom-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"
                  style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}>
                  {count > 1 ? `🔍 ${count} angles` : "🔍 expand"}
                </span>
              );
            })()}
          </button>
        ) : style.loading ? (
          <div className="flex flex-col items-center gap-3 px-3 text-center">
            <div className="spinner" />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Generating…</p>
          </div>
        ) : style.error ? (
          <div className="flex flex-col items-center gap-2 p-3 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>{style.error}</p>
            <button onClick={handleGenerate}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "var(--accent)", color: "#000" }}>
              Retry
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            className="flex flex-col items-center gap-2 p-4 text-center w-full h-full justify-center active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{
                background: noCredits ? "rgba(255,255,255,0.05)" : "rgba(143,167,154,0.08)",
                border: `1.5px solid ${noCredits ? "var(--border)" : "rgba(143,167,154,0.25)"}`,
              }}>
              {noCredits ? "⚡" : "✨"}
            </div>
            <p className="text-xs font-semibold" style={{ color: noCredits ? "var(--text-muted)" : "var(--accent)" }}>
              {noCredits ? "No credits · Buy" : "Generate preview"}
            </p>
          </button>
        )}

        {/* GIF loading overlay */}
        {style.gifLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="spinner" />
            <p className="text-[10px]" style={{ color: "var(--accent)" }}>Making 360° GIF…</p>
          </div>
        )}
      </div>

      {/* Name + compatibility score */}
      <div className="px-3 pt-2.5 pb-1 flex flex-col items-center gap-1">
        <p className="text-xs font-bold text-center capitalize leading-tight" style={{ color: "var(--text-primary)" }}>
          {style.styleName}
        </p>
        {style.compatibilityScore !== undefined && (
          <div className="flex items-center gap-1.5 w-full">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${style.compatibilityScore}%`,
                  background:
                    style.compatibilityScore >= 85 ? "#4FD69C"
                    : style.compatibilityScore >= 70 ? "#C9A15C"
                    : style.compatibilityScore >= 50 ? "#f97316"
                    : "#E06A5C",
                }}
              />
            </div>
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{
                color:
                  style.compatibilityScore >= 85 ? "#4FD69C"
                  : style.compatibilityScore >= 70 ? "#C9A15C"
                  : style.compatibilityScore >= 50 ? "#f97316"
                  : "#E06A5C",
              }}
            >
              {style.compatibilityScore}%
            </span>
          </div>
        )}
      </div>

      {/* GIF button */}
      {style.imageUrl && onGenerateGif && !style.gifUrl && !style.gifLoading && (
        <div className="px-2 pb-2.5">
          <button
            onClick={() => {
              if (noCredits) { onBuyCredits?.(); return; }
              onGenerateGif();
            }}
            className="w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
            style={{
              background: "transparent",
              border: `1.5px solid ${noCredits ? "var(--border)" : "rgba(143,167,154,0.3)"}`,
              color: noCredits ? "var(--text-muted)" : "var(--accent)",
            }}
          >
            <span>▶</span>
            <span>{noCredits ? "No credits" : "360° GIF"}</span>
            <span style={{ opacity: 0.5 }}>(4cr)</span>
          </button>
        </div>
      )}

      {style.gifUrl && (
        <div className="px-2 pb-2.5">
          <div
            className="w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
            style={{
              background: "rgba(79,214,156,0.08)",
              border: "1px solid rgba(79,214,156,0.2)",
              color: "var(--success)",
            }}
          >
            ✓ 360° GIF ready
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function StyleGrid({ styles, bestMatch, onGenerate, onGenerateGif, onGenerateAngle, onGenerateAllAngles, onGenerateGrid, noCredits, onBuyCredits }: Props) {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  if (!styles.length) return null;
  const detailStyle = detailIndex !== null ? styles[detailIndex] : null;

  const anyPending = styles.some((s) => !s.imageUrl && !s.loading);

  const generateAll = () => {
    if (noCredits) { onBuyCredits?.(); return; }
    styles.forEach((s, i) => {
      if (!s.imageUrl && !s.loading) setTimeout(() => onGenerate(i), i * 1200);
    });
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Recommended styles</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {styles.length} styles matched to this hair
          </p>
        </div>
        {anyPending && (
          <button
            onClick={generateAll}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={
              noCredits
                ? { background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }
                : {
                    background: "linear-gradient(135deg, #8FA79A, #6E8778)",
                    color: "#000",
                    border: "none",
                    boxShadow: "0 0 12px rgba(143,167,154,0.3)",
                  }
            }
          >
            {noCredits ? "⚡ Buy credits" : "Generate all"}
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="mb-4 rounded-xl p-3 flex items-start gap-2.5"
        style={{
          background: "rgba(143,167,154,0.04)",
          border: "1px solid rgba(143,167,154,0.1)",
        }}>
        <span className="text-base">ℹ️</span>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Previews show the style on a <span className="font-semibold" style={{ color: "var(--accent)" }}>reference model</span> — not the
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
            onGenerateGif={onGenerateGif ? () => onGenerateGif(i) : undefined}
            onOpenDetail={() => setDetailIndex(i)}
            noCredits={noCredits}
            onBuyCredits={onBuyCredits}
            delay={i * 0.04}
          />
        ))}
      </div>

      <StyleDetailModal
        open={detailIndex !== null}
        onClose={() => setDetailIndex(null)}
        styleName={detailStyle?.styleName ?? ""}
        angles={detailStyle?.angles}
        anglesLoading={detailStyle?.anglesLoading}
        summary={detailStyle?.summary}
        barberInstructions={detailStyle?.barberInstructions}
        onGenerateAngle={onGenerateAngle && detailIndex !== null
          ? (a) => onGenerateAngle(detailIndex, a)
          : undefined}
        onGenerateAllAngles={onGenerateAllAngles && detailIndex !== null
          ? () => onGenerateAllAngles(detailIndex)
          : undefined}
        onGenerateGrid={onGenerateGrid && detailIndex !== null
          ? () => onGenerateGrid(detailIndex)
          : undefined}
      />
    </div>
  );
}
