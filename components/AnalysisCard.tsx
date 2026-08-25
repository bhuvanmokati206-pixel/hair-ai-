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

function StatBubble({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl flex-1"
      style={{
        background: "rgba(143,167,154,0.05)",
        border: "1px solid rgba(143,167,154,0.12)",
      }}
    >
      <span className="text-xl">{icon}</span>
      <span className="section-label">{label}</span>
      <span className="text-xs font-bold text-center leading-tight" style={{ color: "var(--accent)" }}>
        {labelMap[value] ?? value}
      </span>
    </div>
  );
}

export default function AnalysisCard({ analysis }: Props) {
  return (
    <div className="space-y-4 px-4">
      {/* Gender + skin tone badges */}
      {(analysis.gender || analysis.skinTone) && (
        <div className="flex justify-center gap-2 flex-wrap">
          {analysis.gender && (
            <span className="badge-blue">
              {analysis.gender === "female" ? "👩" : "👨"} {analysis.gender} styles
            </span>
          )}
          {analysis.skinTone && (
            <span className="badge-purple">
              🎨 {analysis.skinTone}{analysis.undertone ? ` · ${analysis.undertone}` : ""} tone
            </span>
          )}
          {analysis.freshCut !== undefined && (
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={
                analysis.freshCut
                  ? { background: "rgba(79,214,156,0.12)", color: "#4FD69C", border: "1px solid rgba(79,214,156,0.25)" }
                  : { background: "rgba(201,161,92,0.12)", color: "#C9A15C", border: "1px solid rgba(201,161,92,0.25)" }
              }
              title={analysis.freshCutNotes}
            >
              {analysis.freshCut ? "✂️ Fresh cut" : "🕐 Needs a cut"}
            </span>
          )}
        </div>
      )}

      {/* Hair stats row */}
      <div className="flex gap-2">
        <StatBubble icon="📏" label="Length"  value={analysis.hairLength} />
        <StatBubble icon="🌊" label="Texture" value={analysis.hairTexture} />
        <StatBubble icon="💪" label="Density" value={analysis.hairDensity} />
        <StatBubble icon="💎" label="Face"    value={analysis.faceShape} />
      </div>

      {/* Per-side length measurements — each side read separately from its panel. */}
      {analysis.hairMeasurements && (() => {
        const m = analysis.hairMeasurements!;
        const zones = [
          { label: "Front", cm: m.frontCm },
          { label: "Top",   cm: m.crownCm ?? m.topCm },
          { label: "Left",  cm: m.leftSideCm ?? m.sideCm },
          { label: "Right", cm: m.rightSideCm ?? m.sideCm },
          { label: "Nape",  cm: m.napeCm },
        ].filter((z) => z.cm);
        if (zones.length === 0) return null;
        return (
          <div>
            <p className="section-label mb-1.5">Length by zone</p>
            <div className="flex flex-wrap gap-2">
              {zones.map((z) => (
                <div key={z.label} className="rounded-xl px-3 py-1.5 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-bright)" }}>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{z.label}</p>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{z.cm}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Hair color + current style */}
      <div
        className="rounded-2xl p-4 flex gap-3 items-center"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border-bright)",
        }}
      >
        <span className="text-2xl">🎨</span>
        <div>
          <p className="section-label mb-0.5">Hair Color &amp; Current Style</p>
          <p className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
            {analysis.hairColor} — {analysis.currentStyle}
          </p>
        </div>
      </div>

      {/* Best match — hero card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(143,167,154,0.08) 0%, rgba(169,162,184,0.05) 100%)",
          border: "1px solid rgba(143,167,154,0.25)",
          boxShadow: "0 0 20px rgba(143,167,154,0.06)",
        }}
      >
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(143,167,154,0.12) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }} />
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">⭐</span>
          <span className="section-label" style={{ color: "var(--accent)" }}>Best Match</span>
        </div>
        <p className="font-black text-2xl mb-2 capitalize gradient-text">
          {analysis.bestMatch}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {analysis.bestMatchReason}
        </p>
      </div>

      {/* Colours now live in their own "Colour" tab (ColorSection). */}

      {/* Styling tips */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(169,162,184,0.05)",
          border: "1px solid rgba(169,162,184,0.15)",
          borderLeft: "3px solid var(--accent-purple)",
        }}
      >
        <p className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span>💡</span> Styling Tips
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {analysis.stylingTips}
        </p>
      </div>
    </div>
  );
}
