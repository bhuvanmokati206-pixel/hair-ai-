"use client";

import type { SuggestedColor } from "./HairAIAutomation";

type Props = {
  colors: SuggestedColor[];
  onTryColor: (color: string) => void;
  busyColor: string | null;
};

// A rough visual swatch from the colour name, so the card has a dab of colour.
function swatchFor(name: string): string {
  const n = name.toLowerCase();
  if (/platinum|ash|silver|grey|gray/.test(n)) return "#c9ccd1";
  if (/blonde|honey|golden|caramel|bronze/.test(n)) return "#c8963e";
  if (/burgundy|wine|plum|maroon/.test(n)) return "#5b1a2b";
  if (/red|copper|ginger|auburn/.test(n)) return "#8a3320";
  if (/chocolate|espresso|coffee|mocha|chestnut|brown/.test(n)) return "#4a2c1a";
  if (/black|jet|raven/.test(n)) return "#141414";
  if (/blue/.test(n)) return "#1c3a5e";
  return "#5a3a2a";
}

export default function ColorSection({ colors, onTryColor, busyColor }: Props) {
  if (!colors || colors.length === 0) {
    return (
      <div className="px-5">
        <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-3xl mb-2">🎨</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No colour suggestions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 flex flex-col gap-3">
      {colors.map((c, i) => {
        const needsBleach = /bleach|lift|lighten/i.test(`${c.process ?? ""} ${c.reason}`);
        const busy = busyColor === c.color;
        return (
          <div key={i} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full flex-shrink-0"
                style={{ background: swatchFor(c.color), border: "2px solid var(--border-bright)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold capitalize" style={{ color: "var(--text-primary)" }}>{c.color}</p>
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  {c.sessions && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: "rgba(143,167,154,0.1)", color: "#8FA79A" }}>
                      🗓 {/^\d/.test(c.sessions) ? `${c.sessions} session${c.sessions === "1" ? "" : "s"}` : c.sessions}
                    </span>
                  )}
                  {c.process && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                      style={{ background: "rgba(169,162,184,0.1)", color: "#A9A2B8" }}>
                      {c.process}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-muted)" }}>Why it works: </span>{c.reason}
            </p>

            {needsBleach && (
              <p className="text-[11px] mt-2" style={{ color: "#C9A15C" }}>
                ⚠️ Requires bleaching/lifting from dark hair — more sessions, some damage, and the real shade can vary with hair condition.
              </p>
            )}

            <button
              type="button"
              onClick={() => onTryColor(c.color)}
              disabled={!!busyColor}
              className="w-full mt-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              style={{
                background: busy ? "var(--bg-subtle)" : "linear-gradient(135deg,#8FA79A,#6E8778)",
                color: busy ? "var(--text-muted)" : "#000",
                opacity: busyColor && !busy ? 0.4 : 1,
              }}
            >
              {busy ? "Rendering preview…" : "🎨 Try this colour on the customer"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
