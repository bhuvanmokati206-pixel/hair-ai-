"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { SuggestedColor } from "./HairAIAutomation";
import StyleDetailModal from "./StyleDetailModal";

type Props = {
  colors: SuggestedColor[];
  onTryColor: (color: string) => void;
  busyColor?: string | null;
  noCredits?: boolean;
  onBuyCredits?: () => void;
};

// Visual swatch dab from the colour name so the card has an accurate tone dab
function swatchFor(name: string): string {
  const n = name.toLowerCase();
  if (/platinum|ash|silver|grey|gray/.test(n)) return "#c9ccd1";
  if (/blonde|honey|golden|caramel|bronze/.test(n)) return "#c8963e";
  if (/burgundy|wine|plum|maroon/.test(n)) return "#5b1a2b";
  if (/red|copper|ginger|auburn/.test(n)) return "#8a3320";
  if (/chocolate|espresso|coffee|mocha|chestnut|brown/.test(n)) return "#4a2c1a";
  if (/black|jet|raven/.test(n)) return "#141414";
  if (/blue/.test(n)) return "#1c3a5e";
  return "#6a4a3a";
}

function ColorCard({
  item,
  isBest,
  onTry,
  onOpenDetail,
  busy,
  noCredits,
  onBuyCredits,
  delay,
}: {
  item: SuggestedColor;
  isBest: boolean;
  onTry: () => void;
  onOpenDetail?: () => void;
  busy: boolean;
  noCredits?: boolean;
  onBuyCredits?: () => void;
  delay: number;
}) {
  const handleTry = () => {
    if (noCredits) {
      onBuyCredits?.();
      return;
    }
    onTry();
  };

  const needsBleach = /bleach|lift|lighten/i.test(`${item.process ?? ""} ${item.reason}`);
  const angleCount = item.angles ? Object.values(item.angles).filter(Boolean).length : 0;

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
          ⭐ Recommended Shade
        </div>
      )}

      {/* Image / Preview area */}
      <div
        className="aspect-[4/5] flex items-center justify-center relative overflow-hidden"
        style={{ background: "var(--bg-elevated)" }}
      >
        {item.imageUrl ? (
          <button
            type="button"
            onClick={onOpenDetail}
            className="w-full h-full relative active:scale-95 transition-transform block"
          >
            <img
              src={item.imageUrl}
              alt={item.color}
              className="w-full h-full object-cover object-top"
            />
            {/* Color swatch dot at top-left */}
            <span
              className="absolute top-2 left-2 w-4 h-4 rounded-full border border-white/60 shadow-md"
              style={{ background: swatchFor(item.color) }}
            />
            {/* Angle inspection pill */}
            <span
              className="absolute bottom-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
            >
              {angleCount > 1 ? `🔍 ${angleCount} angles` : "🔍 expand"}
            </span>
          </button>
        ) : item.loading || busy ? (
          <div className="flex flex-col items-center gap-3 px-3 text-center">
            <div className="spinner" />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Rendering colour…
            </p>
          </div>
        ) : item.error ? (
          <div className="flex flex-col items-center gap-2 p-3 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>
              {item.error}
            </p>
            <button
              type="button"
              onClick={handleTry}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Retry
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleTry}
            className="flex flex-col items-center gap-2 p-4 text-center w-full h-full justify-center active:scale-95 transition-transform"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-md relative"
              style={{
                background: swatchFor(item.color),
                border: "2px solid rgba(255,255,255,0.25)",
              }}
            >
              <span className="drop-shadow">✨</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              {noCredits ? "No credits · Buy" : "Try colour"}
            </p>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Tap to preview
            </span>
          </button>
        )}
      </div>

      {/* Details below preview */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
              style={{ background: swatchFor(item.color) }}
            />
            <p
              className="text-xs font-bold capitalize leading-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {item.color}
            </p>
          </div>

          <div className="flex gap-1 flex-wrap mb-1.5">
            {item.sessions && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: "rgba(143,167,154,0.12)", color: "#8FA79A" }}
              >
                🗓 {/^\d/.test(item.sessions) ? `${item.sessions} sess.` : item.sessions}
              </span>
            )}
            {item.process && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold capitalize"
                style={{
                  background: needsBleach ? "rgba(201,161,92,0.15)" : "rgba(169,162,184,0.12)",
                  color: needsBleach ? "#C9A15C" : "#A9A2B8",
                }}
              >
                {item.process}
              </span>
            )}
          </div>

          <p
            className="text-[11px] leading-relaxed line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
            title={item.reason}
          >
            {item.reason}
          </p>
        </div>

        {/* Action Button */}
        <div>
          {item.imageUrl ? (
            <button
              type="button"
              onClick={onOpenDetail}
              className="w-full py-1.5 rounded-xl text-[11px] font-bold active:scale-95 transition-transform"
              style={{
                background: "rgba(143,167,154,0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(143,167,154,0.3)",
              }}
            >
              🔍 View 4 angles
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTry}
              disabled={busy || item.loading}
              className="w-full py-1.5 rounded-xl text-[11px] font-bold active:scale-95 transition-transform"
              style={{
                background: busy || item.loading ? "var(--bg-subtle)" : "linear-gradient(135deg,#8FA79A,#6E8778)",
                color: busy || item.loading ? "var(--text-muted)" : "#000",
                opacity: busy && !item.loading ? 0.4 : 1,
              }}
            >
              {busy || item.loading ? "Rendering…" : "🎨 Try colour"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ColorSection({
  colors,
  onTryColor,
  busyColor,
  noCredits,
  onBuyCredits,
}: Props) {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  if (!colors || colors.length === 0) {
    return (
      <div className="px-5">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-3xl mb-2">🎨</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            No colour suggestions
          </p>
        </div>
      </div>
    );
  }

  const detailItem = detailIndex !== null ? colors[detailIndex] : null;
  const anyPending = colors.some((c) => !c.imageUrl && !c.loading);

  const generateAll = () => {
    if (noCredits) {
      onBuyCredits?.();
      return;
    }
    colors.forEach((c, i) => {
      if (!c.imageUrl && !c.loading) {
        setTimeout(() => onTryColor(c.color), i * 1400);
      }
    });
  };

  return (
    <div className="px-4">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
            Colour recommendations
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {colors.length} shades matched to customer skin &amp; hair tone
          </p>
        </div>
        {anyPending && (
          <button
            type="button"
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
            {noCredits ? "⚡ Buy credits" : "Try all"}
          </button>
        )}
      </div>

      {/* Info banner */}
      <div
        className="mb-4 rounded-xl p-3 flex items-start gap-2.5"
        style={{
          background: "rgba(143,167,154,0.04)",
          border: "1px solid rgba(143,167,154,0.1)",
        }}
      >
        <span className="text-base">ℹ️</span>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Previews render the colour tone onto the{" "}
          <span className="font-semibold" style={{ color: "var(--accent)" }}>
            customer&apos;s actual hair
          </span>
          . Tap any preview card to inspect all 4 angles (Front, Left, Right, Back).
        </p>
      </div>

      {/* 2-column Grid matching StyleGrid */}
      <div className="grid grid-cols-2 gap-3">
        {colors.map((c, i) => {
          const isBusy = busyColor === c.color;
          return (
            <ColorCard
              key={c.color}
              item={c}
              isBest={i === 0}
              onTry={() => onTryColor(c.color)}
              onOpenDetail={() => setDetailIndex(i)}
              busy={isBusy}
              noCredits={noCredits}
              onBuyCredits={onBuyCredits}
              delay={i * 0.04}
            />
          );
        })}
      </div>

      {/* 4-angle inspector modal */}
      {detailItem && (
        <StyleDetailModal
          open={detailIndex !== null}
          onClose={() => setDetailIndex(null)}
          styleName={`${detailItem.color} Hair Colour`}
          angles={detailItem.angles}
          whySuits={detailItem.reason}
          summary={`Recommended technique: ${detailItem.process || "Single-process"}. Target: ${
            detailItem.sessions || "1"
          } salon session(s).`}
          barberInstructions={
            detailItem.stylistInstructions ||
            (/bleach|lift/i.test(`${detailItem.process} ${detailItem.reason}`)
              ? "Lift base level with developer before toning. Use bond builder during lightening. Neutralize undertones with complementary tone."
              : "Deposit recommended shade directly on existing base. Process according to salon formula timer.")
          }
        />
      )}
    </div>
  );
}
