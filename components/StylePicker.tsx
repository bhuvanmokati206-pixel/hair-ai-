"use client";

import { motion } from "framer-motion";
import type { GeneratedStyle } from "./HairAIAutomation";

const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const FAINT = "#7C766C";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: FAINT,
};

const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Between "What service?" and generation: the customer picks WHICH hairstyle to
 * preview from the AI's fitting suggestions, so each pick is a genuinely different
 * look rather than always the single best-match.
 */
export default function StylePicker({
  styles,
  bestMatch,
  busy,
  error,
  onPick,
  onBack,
}: {
  styles: GeneratedStyle[];
  bestMatch?: string;
  busy?: boolean;
  error?: string | null;
  onPick: (styleName: string) => void;
  onBack: () => void;
}) {
  // De-dupe + keep order (already scored best-first).
  const seen = new Set<string>();
  const list = styles.filter((s) => {
    const k = s.styleName.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ minHeight: "100vh", background: "var(--bg)", color: INK, padding: "56px 22px calc(24px + env(safe-area-inset-bottom))" }}
    >
      <button type="button" onClick={onBack} disabled={busy}
        style={{ position: "absolute", top: 22, left: 22, background: "transparent", border: 0, color: MUTE, fontSize: 12, letterSpacing: ".08em", cursor: busy ? "default" : "pointer", opacity: busy ? 0.4 : 1 }}>
        ← Back
      </button>

      <div style={{ marginTop: 8, marginBottom: 22 }}>
        <div style={MICRO}>Recommended for you</div>
        <div style={{ marginTop: 10, fontSize: 26, fontWeight: 200, letterSpacing: ".04em" }}>Choose a hairstyle</div>
        <div style={{ marginTop: 8, fontSize: 13, color: MUTE }}>Tap a style to preview it on the customer.</div>
      </div>

      {error && (
        <div style={{ marginBottom: 14, borderRadius: 12, padding: "10px 14px", fontSize: 12, background: "rgba(224,106,92,0.1)", border: "1px solid rgba(224,106,92,0.28)", color: "#E06A5C" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((s) => {
          const isBest = bestMatch && s.styleName.toLowerCase() === bestMatch.toLowerCase();
          const pct = typeof s.compatibilityScore === "number" ? Math.round(s.compatibilityScore) : null;
          return (
            <button
              key={s.styleName}
              type="button"
              disabled={busy}
              onClick={() => onPick(s.styleName)}
              style={{
                textAlign: "left", borderRadius: 18, padding: "16px 18px", cursor: busy ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                background: isBest ? "linear-gradient(160deg, rgba(143,167,154,.14), rgba(23,22,20,.72))" : "rgba(23,22,20,.72)",
                border: `1px solid ${isBest ? "rgba(143,167,154,.4)" : "rgba(242,239,233,.08)"}`,
                opacity: busy ? 0.5 : 1, transition: "opacity .2s ease",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>{cap(s.styleName)}</span>
                  {isBest && (
                    <span style={{ ...MICRO, fontSize: 8, color: "#BFD2C7", padding: "2px 7px", borderRadius: 999, background: "rgba(143,167,154,.16)", border: "1px solid rgba(143,167,154,.34)" }}>Best match</span>
                  )}
                </div>
                {pct !== null && (
                  <div style={{ marginTop: 4, fontSize: 11, color: MUTE }}>{pct}% suited to this face &amp; hair</div>
                )}
              </div>
              <span style={{ flex: "none", fontSize: 18, color: ACC }}>›</span>
            </button>
          );
        })}
        {list.length === 0 && (
          <div style={{ borderRadius: 18, padding: "22px 16px", textAlign: "center", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
            <div style={{ fontSize: 13, color: MUTE }}>No suggestions available — using the recommended look.</div>
            <button type="button" className="tap" onClick={() => bestMatch && onPick(bestMatch)}
              style={{ width: "100%", marginTop: 14, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                fontSize: 11, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase",
                background: "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)", color: "#14130F" }}>
              Continue
            </button>
          </div>
        )}
      </div>

      {/* Generating overlay */}
      {busy && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
          background: "rgba(12,11,10,.78)", backdropFilter: "blur(6px)" }}>
          <motion.div
            style={{ width: 46, height: 46, borderRadius: "50%", border: "2px solid rgba(143,167,154,.18)", borderTopColor: ACC }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div style={{ ...MICRO, color: "rgba(242,239,233,.7)" }}>Creating the look…</div>
          <div style={{ fontSize: 12, color: FAINT }}>Rendering all four angles</div>
        </div>
      )}
    </motion.div>
  );
}
