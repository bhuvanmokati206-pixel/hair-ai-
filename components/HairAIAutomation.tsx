"use client";

import { useState, useCallback } from "react";
import CameraCapture, { CapturedPhoto } from "./CameraCapture";
import AnalysisCard from "./AnalysisCard";
import StyleGrid from "./StyleGrid";

export type HairAnalysis = {
  hairLength: string;
  hairDensity: string;
  hairTexture: string;
  hairColor: string;
  faceShape: string;
  currentStyle: string;
  feasibleStyles: string[];
  bestMatch: string;
  bestMatchReason: string;
  stylingTips: string;
};

export type GeneratedStyle = {
  styleName: string;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
};

type Step = "capture" | "analyzing" | "results";

export default function HairAIAutomation() {
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
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Unknown error");
      setStep("capture");
    }
  }, []);

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
            imageBase64: frontPhoto.base64,
            styleName: style.styleName,
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
  };

  // ── CAPTURE STEP ────────────────────────────────────────────────
  if (step === "capture") {
    return (
      <>
        {analyzeError && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-sm text-center py-3 px-4">
            {analyzeError} — please try again
          </div>
        )}
        <CameraCapture onComplete={handlePhotosComplete} />
      </>
    );
  }

  // ── ANALYZING STEP ──────────────────────────────────────────────
  if (step === "analyzing") {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center px-6 gap-8">
        {/* Spinner */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full"
            style={{ border: "3px solid #f9731622" }} />
          <div className="absolute inset-0 rounded-full animate-spin"
            style={{ border: "3px solid transparent", borderTopColor: "#f97316" }} />
          <div className="absolute inset-3 rounded-full animate-spin"
            style={{ border: "3px solid transparent", borderTopColor: "#facc15", animationDirection: "reverse", animationDuration: "0.8s" }} />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">✂️</div>
        </div>

        <div className="text-center">
          <h2 className="text-white font-black text-2xl mb-2">Analysing Hair</h2>
          <p className="text-gray-400 text-sm">
            Claude AI is examining {photos.length} photo{photos.length > 1 ? "s" : ""}…
          </p>
        </div>

        {/* Photo row */}
        <div className="flex gap-3">
          {photos.map((p, i) => (
            <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-700">
              <img src={p.preview} alt={p.label} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-center">
          {["Detecting face shape…", "Measuring hair length…", "Checking hair density…", "Finding best styles…"].map(
            (msg, i) => (
              <p key={i} className="text-xs text-gray-600 animate-pulse"
                style={{ animationDelay: `${i * 0.4}s` }}>
                {msg}
              </p>
            )
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS STEP ────────────────────────────────────────────────
  const frontPreview = photos.find((p) => p.label === "front") ?? photos[0];

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-16">
      {/* Results header */}
      <div className="px-4 pt-10 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="gradient-text font-black text-2xl">Hair Analysis</h1>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 border border-gray-700 active:scale-95"
          >
            New Customer
          </button>
        </div>
        <p className="text-gray-500 text-sm">
          Analysed from {photos.length} angle{photos.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Photo strip */}
      <div className="px-4 mb-5">
        <div className="flex gap-2">
          {photos.map((p, i) => (
            <div key={i} className={`overflow-hidden rounded-xl border ${i === 0 ? "flex-[2]" : "flex-1"}`}
              style={{ borderColor: "#ffffff20" }}>
              <img src={p.preview} alt={p.label}
                className={`w-full object-cover ${i === 0 ? "aspect-[3/4]" : "aspect-square"}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Analysis */}
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

      {/* Bottom CTA */}
      <div className="px-4 mt-8">
        <button
          onClick={reset}
          className="w-full py-4 rounded-2xl font-bold text-gray-400 border border-gray-700 active:scale-95 transition-transform text-sm"
        >
          ↩ Start New Customer
        </button>
      </div>
    </div>
  );
}
