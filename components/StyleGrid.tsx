"use client";

import type { GeneratedStyle } from "./HairAIAutomation";

type Props = {
  styles: GeneratedStyle[];
  bestMatch: string;
  onGenerate: (index: number) => void;
};

const CARD_COLORS = ["#f97316", "#22d3ee", "#a855f7", "#22c55e", "#facc15", "#ec4899", "#f43f5e", "#6366f1"];

function StyleCard({ style, index, isBest, onGenerate }: {
  style: GeneratedStyle;
  index: number;
  isBest: boolean;
  onGenerate: () => void;
}) {
  const color = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ border: isBest ? `2px solid ${color}` : "1.5px solid #ffffff15", background: "#111" }}>

      {isBest && (
        <div className="py-1.5 text-center text-xs font-black text-black"
          style={{ background: color }}>
          ⭐ BEST MATCH
        </div>
      )}

      {/* Image area */}
      <div className="aspect-square bg-gray-900 flex items-center justify-center relative">
        {style.imageUrl ? (
          <img src={style.imageUrl} alt={style.styleName} className="w-full h-full object-cover" />
        ) : style.loading ? (
          <div className="flex flex-col items-center gap-3 px-3 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-gray-700 border-t-white animate-spin"
              style={{ borderTopColor: color }} />
            <p className="text-gray-400 text-xs">Generating…</p>
          </div>
        ) : style.error ? (
          <div className="flex flex-col items-center gap-2 p-3 text-center">
            <span className="text-2xl">⚠️</span>
            <button onClick={onGenerate}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white active:scale-95"
              style={{ background: color }}>
              Retry
            </button>
          </div>
        ) : (
          <button onClick={onGenerate}
            className="flex flex-col items-center gap-2 p-4 text-center active:scale-95 transition-transform w-full h-full justify-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ background: color + "22", border: `2px solid ${color}66` }}>
              ✨
            </div>
            <p className="text-xs font-semibold" style={{ color }}>Generate Preview</p>
          </button>
        )}
      </div>

      {/* Name */}
      <div className="px-3 py-2.5" style={{ background: color + "18" }}>
        <p className="text-white text-xs font-bold text-center capitalize leading-tight">
          {style.styleName}
        </p>
      </div>
    </div>
  );
}

export default function StyleGrid({ styles, bestMatch, onGenerate }: Props) {
  if (!styles.length) return null;

  const generateAll = () => {
    styles.forEach((s, i) => {
      if (!s.imageUrl && !s.loading) {
        setTimeout(() => onGenerate(i), i * 800);
      }
    });
  };

  const anyPending = styles.some((s) => !s.imageUrl && !s.loading);

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-white font-black text-lg">Possible Styles</h2>
          <p className="text-gray-500 text-xs">{styles.length} styles matched to your hair</p>
        </div>
        {anyPending && (
          <button
            onClick={generateAll}
            className="px-4 py-2 rounded-xl text-xs font-bold text-black active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #f97316, #facc15)" }}
          >
            Generate All
          </button>
        )}
      </div>

      <p className="text-gray-500 text-xs mb-4">
        Tap any card to see an AI preview of this person with that hairstyle.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {styles.map((style, i) => (
          <StyleCard
            key={style.styleName}
            style={style}
            index={i}
            isBest={style.styleName.toLowerCase() === bestMatch.toLowerCase()}
            onGenerate={() => onGenerate(i)}
          />
        ))}
      </div>
    </div>
  );
}
