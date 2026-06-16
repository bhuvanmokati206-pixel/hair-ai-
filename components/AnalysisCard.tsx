"use client";

import type { HairAnalysis } from "./HairAIAutomation";

type Props = { analysis: HairAnalysis };

const labelMap: Record<string, string> = {
  very_short: "Very Short", short: "Short", medium: "Medium",
  long: "Long", very_long: "Very Long",
  thin: "Thin", thick: "Thick",
  straight: "Straight", wavy: "Wavy", curly: "Curly", coily: "Coily",
  oval: "Oval", round: "Round", square: "Square",
  heart: "Heart", diamond: "Diamond", oblong: "Oblong",
};

const statColors = ["#f97316", "#facc15", "#22d3ee", "#a855f7", "#22c55e"];

function StatBubble({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl flex-1"
      style={{ background: color + "15", border: `1.5px solid ${color}33` }}>
      <span className="text-xl">{icon}</span>
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-white text-xs font-bold text-center leading-tight">
        {labelMap[value] ?? value}
      </span>
    </div>
  );
}

export default function AnalysisCard({ analysis }: Props) {
  return (
    <div className="space-y-4 px-4">
      {/* Detected gender + skin tone badges */}
      {(analysis.gender || analysis.skinTone) && (
        <div className="flex justify-center gap-2 flex-wrap">
          {analysis.gender && (
            <span className="text-xs font-bold px-3 py-1 rounded-full capitalize"
              style={{ background: "#ffffff10", border: "1.5px solid #ffffff20", color: "#fff" }}>
              {analysis.gender === "female" ? "👩 Female" : "👨 Male"} styles
            </span>
          )}
          {analysis.skinTone && (
            <span className="text-xs font-bold px-3 py-1 rounded-full capitalize"
              style={{ background: "#ffffff10", border: "1.5px solid #ffffff20", color: "#fff" }}>
              🎨 {analysis.skinTone}{analysis.undertone ? ` · ${analysis.undertone}` : ""} tone
            </span>
          )}
        </div>
      )}

      {/* Hair stats row */}
      <div className="flex gap-2">
        <StatBubble icon="📏" label="Length"  value={analysis.hairLength}  color={statColors[0]} />
        <StatBubble icon="🌊" label="Texture" value={analysis.hairTexture} color={statColors[1]} />
        <StatBubble icon="💪" label="Density" value={analysis.hairDensity} color={statColors[2]} />
        <StatBubble icon="💎" label="Face"    value={analysis.faceShape}   color={statColors[3]} />
      </div>

      {/* Hair color + current style */}
      <div className="rounded-2xl p-4 flex gap-3 items-center"
        style={{ background: "#ffffff08", border: "1.5px solid #ffffff15" }}>
        <span className="text-2xl">🎨</span>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide">Hair Color & Current Style</p>
          <p className="text-white font-semibold text-sm mt-0.5">
            {analysis.hairColor} — {analysis.currentStyle}
          </p>
        </div>
      </div>

      {/* Best match — hero card */}
      <div className="rounded-3xl p-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f9731622, #facc1511)", border: "1.5px solid #f9731644" }}>
        <div className="absolute -top-4 -right-4 text-6xl opacity-10">⭐</div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">⭐</span>
          <span className="text-orange-400 font-black text-sm uppercase tracking-widest">Best Match</span>
        </div>
        <p className="text-white font-black text-2xl mb-2 capitalize">{analysis.bestMatch}</p>
        <p className="text-gray-300 text-sm leading-relaxed">{analysis.bestMatchReason}</p>
      </div>

      {/* Suggested colours */}
      {analysis.suggestedColors && analysis.suggestedColors.length > 0 && (
        <div className="rounded-2xl p-4"
          style={{ background: "#a855f710", border: "1.5px solid #a855f733" }}>
          <p className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "#c084fc" }}>
            <span>🎨</span> Recommended Colours
          </p>
          <div className="space-y-2.5">
            {analysis.suggestedColors.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-sm" style={{ color: "#c084fc" }}>•</span>
                <div>
                  <p className="text-white text-sm font-semibold capitalize">{c.color}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{c.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Styling tips */}
      <div className="rounded-2xl p-4"
        style={{ background: "#22d3ee10", border: "1.5px solid #22d3ee30" }}>
        <p className="text-cyan-400 font-bold text-sm mb-2 flex items-center gap-2">
          <span>💡</span> Styling Tips
        </p>
        <p className="text-gray-300 text-sm leading-relaxed">{analysis.stylingTips}</p>
      </div>
    </div>
  );
}
