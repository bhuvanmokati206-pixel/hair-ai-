"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import CameraCapture, { CapturedPhoto } from "./CameraCapture";
import AnalysisCard from "./AnalysisCard";
import StyleGrid from "./StyleGrid";

export type SuggestedColor = { color: string; reason: string };

export type HairAnalysis = {
  gender?: string;
  skinTone?: string;
  undertone?: string;
  hairLength: string;
  hairDensity: string;
  hairTexture: string;
  hairColor: string;
  faceShape: string;
  currentStyle: string;
  feasibleStyles: string[];
  bestMatch: string;
  bestMatchReason: string;
  suggestedColors?: SuggestedColor[];
  stylingTips: string;
};

export type GeneratedStyle = {
  styleName: string;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
};

type Step = "capture" | "analyzing" | "results";

type Props = {
  customerName?: string;
  onAnalysisComplete?: (analysis: HairAnalysis, photos: CapturedPhoto[]) => void;
  onReset?: () => void;
};

export default function HairAIAutomation({ customerName, onAnalysisComplete, onReset }: Props) {
  const [step, setStep] = useState<Step>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [analysis, setAnalysis] = useState<HairAnalysis | null>(null);
  const [generatedStyles, setGeneratedStyles] = useState<GeneratedStyle[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handlePhotosComplete = useCallback(async (capturedPhotos: CapturedPhoto[]) => {
    setPhotos(capturedPhotos);
    setStep("analyzing");
    setAnalyzeError(null);

    try {
      const res = await fetch("/api/analyze-hair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: capturedPhotos.map((p) => ({
            base64: p.base64,
            mediaType: p.mediaType,
            label: p.label,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      const result: HairAnalysis = data.analysis;
      setAnalysis(result);
      setGeneratedStyles(
        result.feasibleStyles.map((name) => ({
          styleName: name,
          imageUrl: null,
          loading: false,
          error: null,
        }))
      );
      setStep("results");
      onAnalysisComplete?.(result, capturedPhotos);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Unknown error");
      setStep("capture");
    }
  }, [onAnalysisComplete]);

  const generateStyleImage = useCallback(
    async (index: number) => {
      const frontPhoto = photos.find((p) => p.label === "front") ?? photos[0];
      if (!frontPhoto || !analysis) return;
      const style = generatedStyles[index];
      if (!style || style.loading || style.imageUrl) return;

      setGeneratedStyles((prev) =>
        prev.map((s, i) => (i === index ? { ...s, loading: true, error: null } : s))
      );

      try {
        const res = await fetch("/api/generate-hairstyle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleName: style.styleName,
            gender: analysis.gender,
            hairColor: analysis.hairColor,
            hairTexture: analysis.hairTexture,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");

        setGeneratedStyles((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, loading: false, imageUrl: data.imageUrl } : s
          )
        );
      } catch (err) {
        setGeneratedStyles((prev) =>
          prev.map((s, i) =>
            i === index
              ? { ...s, loading: false, error: err instanceof Error ? err.message : "Failed" }
              : s
          )
        );
      }
    },
    [photos, analysis, generatedStyles]
  );

  const reset = () => {
    setStep("capture");
    setPhotos([]);
    setAnalysis(null);
    setGeneratedStyles([]);
    setAnalyzeError(null);
    onReset?.();
  };

  // ── CAPTURE STEP ─────────────────────────────────────────────────
  if (step === "capture") {
    return (
      <>
        {analyzeError && (
          <div className="fixed top-0 left-0 right-0 z-50 text-white text-sm text-center py-3 px-4"
            style={{ background: "var(--danger)" }}>
            {analyzeError} — please try again
          </div>
        )}
        <CameraCapture onComplete={handlePhotosComplete} />
      </>
    );
  }

  // ── ANALYZING STEP ───────────────────────────────────────────────
  if (step === "analyzing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8"
        style={{ background: "var(--bg)" }}>
        {/* Spinner */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full" style={{ border: "3px solid var(--accent-light)" }} />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "3px solid transparent", borderTopColor: "var(--accent)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">✂️</div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Analysing{customerName ? ` ${customerName}'s` : ""} hair
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            AI is examining {photos.length} photo{photos.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Photo row */}
        <div className="flex gap-3">
          {photos.map((p, i) => (
            <div key={i} className="w-16 h-16 rounded-xl overflow-hidden"
              style={{ border: "2px solid var(--border)" }}>
              <img src={p.preview} alt={p.label} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-center">
          {["Detecting face shape…", "Measuring hair length…", "Checking density…", "Finding best styles…"].map(
            (msg, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.5] }}
                transition={{ delay: i * 0.6, duration: 1.2, repeat: Infinity }}
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {msg}
              </motion.p>
            )
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS STEP ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Hair Analysis</h1>
            {customerName && (
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>For {customerName}</p>
            )}
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            New scan
          </button>
        </div>
      </div>

      {/* Photo strip */}
      <div className="px-5 mb-5">
        <div className="flex gap-2">
          {photos.map((p, i) => (
            <div key={i} className={`overflow-hidden rounded-xl ${i === 0 ? "flex-[2]" : "flex-1"}`}
              style={{ border: "1px solid var(--border)" }}>
              <img src={p.preview} alt={p.label}
                className={`w-full object-cover ${i === 0 ? "aspect-[3/4]" : "aspect-square"}`} />
            </div>
          ))}
        </div>
      </div>

      {analysis && (
        <>
          <AnalysisCard analysis={analysis} />
          <div className="h-6" />
          <StyleGrid
            styles={generatedStyles}
            bestMatch={analysis.bestMatch}
            onGenerate={generateStyleImage}
          />
        </>
      )}

      <div className="px-5 mt-8">
        <button onClick={reset} className="btn-ghost">
          ↩ Start new customer
        </button>
      </div>
    </div>
  );
}
