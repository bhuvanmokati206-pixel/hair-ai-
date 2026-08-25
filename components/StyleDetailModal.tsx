"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StyleAngles } from "./HairAIAutomation";
import { downloadImage, imageFilename } from "@/lib/download";

type AngleKey = "left" | "right" | "back";

type Props = {
  open: boolean;
  onClose: () => void;
  styleName: string;
  angles?: StyleAngles;
  anglesLoading?: Partial<Record<AngleKey, boolean>>;
  summary?: string;
  barberInstructions?: string;
  onGenerateAngle?: (angle: AngleKey) => void;
  onGenerateAllAngles?: () => void;
  onGenerateGrid?: () => void;
};

const EXTRA_ANGLES: { key: AngleKey; label: string; icon: string }[] = [
  { key: "left",  label: "Left",  icon: "◀" },
  { key: "right", label: "Right", icon: "▶" },
  { key: "back",  label: "Back",  icon: "↩" },
];

export default function StyleDetailModal({
  open, onClose, styleName, angles, anglesLoading, summary, barberInstructions, onGenerateAngle, onGenerateAllAngles, onGenerateGrid,
}: Props) {
  const [zoomed, setZoomed] = useState<{ url: string; label: string } | null>(null);

  const frontUrl = angles?.front;

  // Only render if at least the front image is ready
  if (!frontUrl) return null;

  const anyLoading = EXTRA_ANGLES.some((a) => !!anglesLoading?.[a.key]);
  const allGenerated = EXTRA_ANGLES.every((a) => !!angles?.[a.key]);

  const zoomImages = [
    { key: "front", label: "Front", url: frontUrl },
    ...EXTRA_ANGLES.filter((a) => angles?.[a.key]).map((a) => ({ key: a.key, label: a.label, url: angles![a.key]! })),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col"
          style={{ background: "rgba(0,0,0,0.88)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="m-4 mt-16 mb-8 rounded-3xl overflow-y-auto"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "calc(100vh - 96px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 z-10" style={{ background: "var(--bg-card)" }}>
              <h2 className="text-base font-black capitalize" style={{ color: "var(--text-primary)" }}>{styleName}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.08)", color: "var(--text-secondary)" }}>✕</button>
            </div>

            {/* 2×2 angle grid. Front (top-left) comes from the first generation
                and fills the screen on tap; the other three generate on demand,
                so a style only costs the extra angles when the barber asks. */}
            <div className="px-4">
              <div className="grid grid-cols-2 gap-2">
                {/* Front — already generated. Tap the image to fit the screen. */}
                <div className="rounded-xl overflow-hidden aspect-square relative"
                  style={{ border: "1px solid var(--border-accent)" }}>
                  <button onClick={() => setZoomed({ url: frontUrl, label: "Front" })}
                    className="w-full h-full block active:scale-[0.98] transition-transform">
                    <img src={frontUrl} alt="Front" className="w-full h-full object-cover object-top" />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>Front · 0°</span>
                    <span className="absolute top-1.5 right-1.5 text-[10px]"
                      style={{ background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "1px 4px", color: "#fff" }}>🔍</span>
                  </button>
                  <button
                    onClick={() => downloadImage(frontUrl, imageFilename(styleName, "front"))}
                    className="absolute bottom-1.5 right-1.5 h-7 px-2 rounded-full flex items-center gap-1 text-white text-[10px] font-bold active:scale-95 transition-transform"
                    style={{ background: "var(--accent)" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3V15M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Save
                  </button>
                </div>

                {/* The three remaining angles fill the other grid cells. */}
                {EXTRA_ANGLES.map((a) => {
                  const url = angles?.[a.key];
                  const loading = !!anglesLoading?.[a.key];

                  return (
                    <div key={a.key} className="rounded-xl overflow-hidden aspect-square flex items-center justify-center relative"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                      {url ? (
                        <>
                          <button onClick={() => setZoomed({ url, label: a.label })}
                            className="w-full h-full block active:scale-95 transition-transform">
                            <img src={url} alt={a.label} className="w-full h-full object-cover object-top" />
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold"
                              style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>{a.label}</span>
                            <span className="absolute top-1.5 right-1.5 text-[10px]"
                              style={{ background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "1px 4px", color: "#fff" }}>🔍</span>
                          </button>
                          <button
                            onClick={() => downloadImage(url, imageFilename(styleName, a.label))}
                            className="absolute bottom-1.5 right-1.5 h-7 px-2 rounded-full flex items-center gap-1 text-white text-[10px] font-bold active:scale-95 transition-transform"
                            style={{ background: "var(--accent)" }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M12 3V15M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Save
                          </button>
                        </>
                      ) : loading ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="spinner" style={{ width: 20, height: 20 }} />
                          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{a.label}…</span>
                        </div>
                      ) : (
                        // Tap an empty cell to generate just that one angle.
                        <button
                          onClick={() => onGenerateAngle?.(a.key)}
                          disabled={!onGenerateAngle}
                          className="w-full h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <span className="text-xl">{a.icon}</span>
                          <span className="text-[9px]">{a.label}</span>
                          {onGenerateAngle && <span className="text-[8px] opacity-60">tap to add</span>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generate-all button, below the grid. */}
            <div className="px-4 pt-3">
              {!allGenerated && !anyLoading && (
                <button
                  onClick={() => onGenerateAllAngles?.()}
                  disabled={!onGenerateAllAngles}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mb-3 active:scale-[0.97] transition-transform"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  <span>✦</span>
                  <span>Generate the other angles</span>
                  <span className="text-xs font-normal opacity-75">(Left · Right · Back)</span>
                </button>
              )}

              {anyLoading && (
                <p className="text-center text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Generating angles one at a time…
                </p>
              )}
            </div>

            {/* Summary */}
            {summary && (
              <div className="px-4 pb-3">
                <p className="section-label mb-1.5">Style summary</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{summary}</p>
              </div>
            )}

            {/* Barber instructions */}
            {barberInstructions && (
              <div className="px-4 pb-6">
                <p className="section-label mb-1.5">Instructions for the barber</p>
                <div className="rounded-2xl p-3" style={{ background: "rgba(143,167,154,0.05)", border: "1px solid rgba(143,167,154,0.15)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{barberInstructions}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Full-screen zoom viewer */}
          <AnimatePresence>
            {zoomed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex flex-col"
                style={{ background: "rgba(0,0,0,0.96)" }}
                onClick={(e) => { e.stopPropagation(); setZoomed(null); }}
              >
                <div className="flex items-center justify-between px-4 pt-12 pb-3">
                  <span className="text-sm font-bold text-white">{zoomed.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadImage(zoomed.url, imageFilename(styleName, zoomed.label)); }}
                      className="h-9 px-3 rounded-full flex items-center gap-1.5 text-white text-xs font-bold"
                      style={{ background: "var(--accent)" }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3V15M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Save
                    </button>
                    <button onClick={() => setZoomed(null)} className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                      style={{ background: "rgba(255,255,255,0.15)" }}>✕</button>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center px-2" style={{ touchAction: "pinch-zoom" }}>
                  <img src={zoomed.url} alt={zoomed.label} className="max-w-full max-h-full"
                    style={{ touchAction: "pinch-zoom" }} onClick={(e) => e.stopPropagation()} />
                </div>
                <div className="flex justify-center gap-2 pb-8 pt-2">
                  {zoomImages.map((img) => (
                    <button key={img.key}
                      onClick={(e) => { e.stopPropagation(); setZoomed({ url: img.url, label: img.label }); }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={img.url === zoomed.url
                        ? { background: "var(--accent)", color: "#fff" }
                        : { background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                      {img.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
