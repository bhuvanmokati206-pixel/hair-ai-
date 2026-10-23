"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/ui/coverflow-carousel";
import type { HairAnalysis, StyleAngles } from "@/components/HairAIAutomation";

// ── NOIR palette ─────────────────────────────────────────────────
const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const FAINT = "#7C766C";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: FAINT,
};

const ANGLE_LABEL: Record<string, string> = { front: "Front", left: "Left", right: "Right", back: "Back" };
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export type DashPhoto = { preview: string; label: string; base64?: string; mediaType?: string };
export type AppliedChip = { label: string; tone: "hair" | "colour" | "beard" };

const CHIP_TONE: Record<AppliedChip["tone"], { bg: string; color: string; icon: string }> = {
  hair:   { bg: "rgba(143,167,154,0.14)", color: "#BFD2C7", icon: "💇" },
  colour: { bg: "rgba(201,161,92,0.14)",  color: "#C9A15C", icon: "🎨" },
  beard:  { bg: "rgba(169,162,184,0.14)", color: "#A9A2B8", icon: "🧔" },
};

/**
 * The customer-facing review screen: the AI-generated preview (when a look was
 * generated), their 4 captured angles, and the hair analysis. Presentational —
 * the parent supplies the data and decides what sits below.
 */
export default function CustomerDashboardView({
  name,
  photos,
  analysis,
  generatedLook,
  applied,
  onSeeLooks,
}: {
  name: string;
  photos: DashPhoto[];
  analysis: HairAnalysis | null;
  generatedLook?: StyleAngles | null;
  applied?: AppliedChip[];
  onSeeLooks?: () => void;
}) {
  const [active, setActive] = useState(0);
  const [scanActive, setScanActive] = useState(0);

  const scanSlides: CoverflowSlide[] = useMemo(
    () =>
      photos
        .map((p) => {
          const src =
            p.preview ||
            (p.base64 ? `data:${p.mediaType || "image/jpeg"};base64,${p.base64}` : "");
          return {
            src,
            alt: ANGLE_LABEL[p.label] ?? p.label,
            title: ANGLE_LABEL[p.label] ?? p.label,
          };
        })
        .filter((s) => Boolean(s.src)),
    [photos],
  );

  // The generated 4-angle preview, in a stable order, keeping only rendered angles.
  const lookSlides: CoverflowSlide[] = useMemo(() => {
    if (!generatedLook) return [];
    return (["front", "left", "right", "back"] as const)
      .filter((a) => generatedLook[a])
      .map((a) => ({ src: generatedLook[a] as string, alt: ANGLE_LABEL[a], title: ANGLE_LABEL[a] }));
  }, [generatedLook]);

  const hasLook = lookSlides.length > 0;

  const stats = analysis
    ? [
        { label: "Hair type", value: cap(analysis.hairTexture) || "—" },
        { label: "Length", value: cap(analysis.hairLength) || "—" },
        { label: "Density", value: cap(analysis.hairDensity) || "—" },
        { label: "Colour", value: cap(analysis.hairColor) || "—" },
        { label: "Face shape", value: cap(analysis.faceShape) || "—" },
        { label: "Current", value: cap(analysis.currentStyle) || "—" },
      ]
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: INK, paddingBottom: onSeeLooks ? 110 : 104 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>

        {/* Header — customer name */}
        <div style={{ padding: "60px 24px 0", textAlign: "center" }}>
          <div style={MICRO}>{hasLook ? "Your AI preview" : "Your scan"}</div>
          <div style={{ marginTop: 9, fontSize: 26, fontWeight: 300, letterSpacing: ".01em", color: "#BFD2C7" }}>
            Hello, {name.split(" ")[0]}
          </div>
        </div>

        {hasLook ? (
          <>
            {/* Generated look — the preview, front & centre */}
            <div style={{ marginTop: 6 }}>
              <CoverflowCarousel
                slides={lookSlides}
                loop={lookSlides.length > 2}
                cardWidth="clamp(168px, 52vw, 260px)"
                onSelect={setActive}
                label="Your new look"
                cardClassName="ring-1 ring-white/10"
              />
              <div style={{ marginTop: -6, textAlign: "center", ...MICRO, color: ACC }}>
                Your new look · {lookSlides[active]?.title ?? ""}
              </div>
            </div>

            {/* What was applied */}
            {applied && applied.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", padding: "14px 20px 0" }}>
                {applied.map((c) => {
                  const t = CHIP_TONE[c.tone];
                  return (
                    <span key={c.label} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: t.bg, color: t.color }}>
                      {t.icon} {c.label}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        ) : scanSlides.length > 0 ? (
          /* No generated look (standalone dashboard) — show the scan */
          <div style={{ marginTop: 6 }}>
            <CoverflowCarousel
              slides={scanSlides}
              loop={false}
              cardWidth="clamp(150px, 44vw, 230px)"
              onSelect={setScanActive}
              label="Your scan angles"
              cardClassName="ring-1 ring-white/10"
            />
            <div style={{ marginTop: -6, textAlign: "center", ...MICRO, color: ACC }}>
              {scanSlides[scanActive]?.title ?? ""}
            </div>
          </div>
        ) : null}

        {analysis ? (
          <div style={{ padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Hair facts */}
            <div>
              <div style={{ ...MICRO, marginBottom: 12, paddingLeft: 2 }}>Your hair</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {stats.map((s) => (
                  <div key={s.label} style={{ borderRadius: 16, padding: "14px 12px", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
                    <div style={{ ...MICRO, fontSize: 8, letterSpacing: ".16em" }}>{s.label}</div>
                    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "#C7BDAE", lineHeight: 1.2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best hairstyle */}
            <div style={{ borderRadius: 22, padding: "20px 18px", background: "linear-gradient(160deg, rgba(143,167,154,.1), rgba(23,22,20,.72))", border: "1px solid rgba(143,167,154,.24)" }}>
              <div style={{ ...MICRO, color: ACC }}>Best hairstyle for you</div>
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: 300, letterSpacing: ".01em", color: INK }}>
                {analysis.bestMatch || "Tailored recommendation"}
              </div>
              {analysis.bestMatchReason && (
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: "#C9C3B8", textWrap: "pretty" as React.CSSProperties["textWrap"] }}>
                  {analysis.bestMatchReason}
                </div>
              )}
            </div>

            {/* A little info about the hair */}
            {(analysis.stylingTips || analysis.currentStyle) && (
              <div style={{ borderRadius: 22, padding: "20px 18px", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
                <div style={MICRO}>About your hair</div>
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.65, color: "#948D82", textWrap: "pretty" as React.CSSProperties["textWrap"] }}>
                  {analysis.stylingTips || `Your current look reads as ${analysis.currentStyle}. Ask your stylist how the recommended cut adapts it.`}
                </div>
              </div>
            )}

            {/* Original scan photos gallery — always shown so the user sees their actual photos */}
            {scanSlides.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingLeft: 2 }}>
                  <div style={MICRO}>Your 4-angle scan photos</div>
                  <div style={{ ...MICRO, color: ACC }}>{scanSlides.length} angles captured</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {photos.map((p, idx) => {
                    const src = p.preview || (p.base64 ? `data:${p.mediaType || "image/jpeg"};base64,${p.base64}` : "");
                    return (
                      <div
                        key={p.label || idx}
                        onClick={() => setScanActive(idx)}
                        style={{
                          borderRadius: 14,
                          overflow: "hidden",
                          border: scanActive === idx ? `2px solid ${ACC}` : "1px solid rgba(242,239,233,.12)",
                          background: "rgba(23,22,20,.8)",
                          cursor: "pointer",
                          transition: "all .2s ease",
                        }}
                      >
                        <div style={{ aspectRatio: "3/4", width: "100%", position: "relative" }}>
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={src}
                              alt={ANGLE_LABEL[p.label] ?? p.label}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: MUTE }}>
                              No photo
                            </div>
                          )}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: "4px 2px",
                              background: "rgba(12,11,10,0.75)",
                              textAlign: "center",
                              fontSize: 9,
                              fontWeight: 600,
                              letterSpacing: ".1em",
                              textTransform: "uppercase",
                              color: scanActive === idx ? "#F2EFE9" : MUTE,
                            }}
                          >
                            {ANGLE_LABEL[p.label] ?? p.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "24px 20px 0" }}>
            <div style={{ borderRadius: 22, padding: "26px 18px", textAlign: "center", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: MUTE }}>Analysis in progress…</div>
              <div style={{ marginTop: 6, fontSize: 12, color: FAINT }}>Your hair breakdown will appear here in a moment.</div>
            </div>
          </div>
        )}
      </motion.div>

      {/* In-flow: open the full set of options (hair / beard / colour tabs) */}
      {onSeeLooks && (
        <div className="fixed bottom-0 left-0 right-0" style={{ padding: "14px 22px calc(20px + env(safe-area-inset-bottom))", background: "linear-gradient(to top, var(--bg) 72%, transparent)" }}>
          <div
            onClick={onSeeLooks}
            style={{
              height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase",
              background: "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)", color: "#14130F",
              boxShadow: "0 16px 34px -14px rgba(143,167,154,.6)",
            }}
          >
            {hasLook ? "Explore all options" : "See your recommended look"}
          </div>
        </div>
      )}
    </div>
  );
}
