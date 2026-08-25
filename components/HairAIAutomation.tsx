"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CameraCapture, { CapturedPhoto } from "./CameraCapture";
import PreferencesStep from "./PreferencesStep";
import type { PreferenceAnswers } from "@/lib/preferences";
import AnalysisCard from "./AnalysisCard";
import ColorSection from "./ColorSection";
import TreatmentsSection from "./TreatmentsSection";
import ServiceSelection, { type ServicePick } from "./ServiceSelection";
import StyleGrid from "./StyleGrid";
import CreditBadge from "./CreditBadge";
import CreditModal from "./CreditModal";
import { getCredits, deductCredits, addCredits } from "@/lib/credits";
import { scoreStyles } from "@/lib/compatibilityEngine";
import { useStore } from "@/lib/store";

export type SuggestedColor = {
  color: string;
  reason: string;
  process?: string;   // "single-process" | "needs bleaching" | "multi-step lift"
  sessions?: string;  // salon visits to achieve it, e.g. "1", "2", "2-3"
};

export type HairMeasurements = {
  // Legacy 3-zone (kept for the scoring engine and generation length targets).
  topLength: string;
  sideLength: string;
  napeLength: string;
  topCm: string;
  sideCm: string;
  napeCm: string;
  // Per-side 6-zone reading from the analysis (front/crown/left/right/nape). Front,
  // left and right are measured separately so the barber sees each side's length.
  frontLength?: string;
  leftSideLength?: string;
  rightSideLength?: string;
  crownLength?: string;
  frontCm?: string;
  leftSideCm?: string;
  rightSideCm?: string;
  crownCm?: string;
};

export type HairAnalysis = {
  gender?: string;
  skinTone?: string;
  undertone?: string;
  hairLength: string;
  hairMeasurements?: HairMeasurements;
  hairDensity: string;
  hairTexture: string;
  hairColor: string;
  hairlineShape?: string;
  hairlineNotes?: string;
  freshCut?: boolean;      // true = looks freshly/recently cut, false = grown out
  freshCutNotes?: string;
  faceShape: string;
  faceLength?: string;
  currentStyle: string;
  feasibleStyles: string[];
  bestMatch: string;
  bestMatchReason: string;
  suggestedColors?: SuggestedColor[];
  stylingTips: string;
};

export type StyleAngles = Partial<{ front: string; left: string; right: string; back: string }>;

export type GeneratedStyle = {
  styleName: string;
  compatibilityScore?: number;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  gifUrl: string | null;
  gifLoading: boolean;
  angles?: StyleAngles;
  anglesLoading?: Partial<Record<"left" | "right" | "back", boolean>>;
  summary?: string;
  barberInstructions?: string;
};

type Step = "capture" | "preferences" | "analyzing" | "services" | "results";
type ResultsTab = "hair" | "beard" | "color" | "treatments";

const BEARD_STYLES = ["Full Beard", "Stubble", "Goatee", "French Cut", "Circle Beard", "Chin Strap"];

export type ResumeGeneratedImage = {
  styleName: string;
  angle: "front" | "left" | "right" | "back";
  serviceType: "haircut" | "beard";
  url: string;
};

export type ResumeData = {
  analysis: HairAnalysis;
  generated: ResumeGeneratedImage[];
};

type Props = {
  customerName?: string;
  onAnalysisComplete?: (analysis: HairAnalysis, photos: CapturedPhoto[]) => void;
  onReset?: () => void;
  /** Confirms the preview and moves on to the haircut — the visit is already saved. */
  onContinueToHaircut?: () => void;
  /** When set, skip capture/analysis and reopen an existing visit at its results. */
  resumeData?: ResumeData;
};

const ANALYSIS_STAGES = [
  { icon: "🔬", label: "Detecting face shape" },
  { icon: "📏", label: "Measuring hair length" },
  { icon: "💪", label: "Checking density & texture" },
  { icon: "✨", label: "Finding best styles" },
];

function AnalysisStages({ photoCount }: { photoCount: number }) {
  const [checked, setChecked] = useState<number[]>([]);

  // Reveal checkmarks sequentially
  useState(() => {
    ANALYSIS_STAGES.forEach((_, i) => {
      setTimeout(() => {
        setChecked((prev) => [...prev, i]);
      }, 900 + i * 700);
    });
  });

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs">
      {ANALYSIS_STAGES.map((stage, i) => {
        const done = checked.includes(i);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="flex items-center gap-3"
          >
            <motion.div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{
                background: done ? "rgba(79,214,156,0.12)" : "rgba(255,255,255,0.05)",
                border: `1.5px solid ${done ? "rgba(79,214,156,0.4)" : "rgba(255,255,255,0.1)"}`,
              }}
              animate={{ scale: done ? [1.2, 1] : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {done ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  style={{ color: "var(--success)", fontSize: 13 }}
                >
                  ✓
                </motion.span>
              ) : (
                <span>{stage.icon}</span>
              )}
            </motion.div>
            <span
              className="text-sm font-medium"
              style={{ color: done ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {stage.label}
            </span>
            {!done && i === Math.min(checked.length, ANALYSIS_STAGES.length - 1) && (
              <motion.div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: "rgba(143,167,154,0.3)", border: "1.5px solid var(--accent)" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </motion.div>
        );
      })}
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        Examining {photoCount} photo{photoCount > 1 ? "s" : ""} with AI…
      </p>
    </div>
  );
}

// Rebuilds the style cards for a resumed visit: the scored feasible styles, with
// any already-generated images (front + extra angles) merged back onto them so
// nothing is regenerated — and paid for — twice.
function buildResumedStyles(resume: ResumeData): GeneratedStyle[] {
  // A resumed analysis may predate feasibleStyles being stored, or have been
  // saved minimally. Fall back to the styles that actually have images, then the
  // chosen style, so resume never crashes on an incomplete analysis.
  const feasible =
    resume.analysis.feasibleStyles?.length
      ? resume.analysis.feasibleStyles
      : [...new Set(resume.generated.filter((g) => g.serviceType === "haircut").map((g) => g.styleName))];

  const scored = scoreStyles(resume.analysis, feasible);

  const byStyle = new Map<string, ResumeGeneratedImage[]>();
  for (const g of resume.generated.filter((g) => g.serviceType === "haircut")) {
    const key = g.styleName.toLowerCase();
    (byStyle.get(key) ?? byStyle.set(key, []).get(key)!).push(g);
  }

  return scored.map((s) => {
    const imgs = byStyle.get(s.styleName.toLowerCase()) ?? [];
    const front = imgs.find((i) => i.angle === "front")?.url ?? null;
    const angles = imgs.reduce<StyleAngles>((acc, i) => ({ ...acc, [i.angle]: i.url }), {});

    return {
      styleName: s.styleName,
      compatibilityScore: s.score,
      imageUrl: front,
      angles: Object.keys(angles).length ? angles : undefined,
      loading: false,
      error: null,
      gifUrl: null,
      gifLoading: false,
    };
  });
}

export default function HairAIAutomation({ customerName, onAnalysisComplete, onReset, onContinueToHaircut, resumeData }: Props) {
  // Set by the scan page once the visit row exists. Generated images are filed
  // under it; without a visit there is nothing to attach them to.
  const currentVisitId = useStore((s) => s.currentVisitId);
  // The gender the barber picked on the entry form — the reliable source of truth.
  // Passed to analysis so it never has to guess (guessing defaulted to male → women
  // were getting men's styles).
  const customerGender = useStore((s) => s.currentCustomer?.gender);
  const [step, setStep] = useState<Step>(resumeData ? "results" : "capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [analysis, setAnalysis] = useState<HairAnalysis | null>(resumeData?.analysis ?? null);
  const [generatedStyles, setGeneratedStyles] = useState<GeneratedStyle[]>(
    resumeData ? buildResumedStyles(resumeData) : []
  );
  const [generatedBeardStyles, setGeneratedBeardStyles] = useState<GeneratedStyle[]>(
    BEARD_STYLES.map((name) => ({ styleName: name, imageUrl: null, loading: false, error: null, gifUrl: null, gifLoading: false }))
  );
  const [resultsTab, setResultsTab] = useState<ResultsTab>("hair");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [qualityWarnings, setQualityWarnings] = useState<{ label: string; message: string }[]>([]);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  // "Try this colour" preview state.
  const [colorBusy, setColorBusy] = useState<string | null>(null);
  const [colorPreview, setColorPreview] = useState<{ color: string; url: string } | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);

  // Combined service-selection look (cut + colour + beard picked on the services page).
  const [comboBusy, setComboBusy] = useState(false);
  const [comboError, setComboError] = useState<string | null>(null);
  const [comboPick, setComboPick] = useState<ServicePick | null>(null);
  const [comboAngles, setComboAngles] = useState<StyleAngles | null>(null);

  // Capture done → collect preferences before analysing. The photos are held so
  // the preferences step can hand them straight to runAnalysis.
  const handlePhotosComplete = useCallback((capturedPhotos: CapturedPhoto[]) => {
    setPhotos(capturedPhotos);
    setAnalyzeError(null);
    setStep("preferences");
  }, []);

  // The actual analysis call. `preferences` may be empty (customer skipped the
  // questionnaire) — the route treats an empty answer set as "hair only".
  const runAnalysis = useCallback(
    async (capturedPhotos: CapturedPhoto[], preferences: PreferenceAnswers) => {
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
            preferences,
            gender: customerGender, // human-provided; overrides the model's guess
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");

        if (data.qualityWarnings?.length) setQualityWarnings(data.qualityWarnings);

        const result: HairAnalysis = data.analysis;
        setAnalysis(result);

        const scored = scoreStyles(result, result.feasibleStyles);
        setGeneratedStyles(
          scored.map((s) => ({
            styleName: s.styleName,
            compatibilityScore: s.score,
            imageUrl: null,
            loading: false,
            error: null,
            gifUrl: null,
            gifLoading: false,
          }))
        );
        // Go to the service-selection page first (gender is now known from analysis).
        setStep("services");
        onAnalysisComplete?.(result, capturedPhotos);
      } catch (err) {
        setAnalyzeError(err instanceof Error ? err.message : "Unknown error");
        setStep("capture");
      }
    },
    [onAnalysisComplete, customerGender]
  );

  // Generates one extra angle (left/right/back) for a style that already has its
  // front image. Deliberately reads nothing from generatedStyles — it is called
  // immediately after the front image resolves, when that state is still stale.
  const runAngleGeneration = useCallback(
    async (styleIndex: number, styleName: string, angleKey: "left" | "right" | "back") => {
      if (!analysis) return;

      // Match on the capture label first; fall back to positional order only if
      // the photos were added without labels.
      const anglePhoto =
        photos.find((p) => p.label === angleKey) ??
        photos[{ left: 1, right: 2, back: 3 }[angleKey]];
      if (!anglePhoto) {
        console.warn(`[angles] no "${angleKey}" photo captured — skipping`);
        return;
      }

      setGeneratedStyles((prev) =>
        prev.map((s, i) => i === styleIndex
          ? { ...s, anglesLoading: { ...s.anglesLoading, [angleKey]: true } }
          : s)
      );

      try {
        const res = await fetch("/api/generate-hairstyle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleName,
            editTarget: "hair",
            gender: analysis.gender,
            skinTone: analysis.skinTone,
            hairDensity: analysis.hairDensity,
            faceShape: analysis.faceShape,
            faceLength: analysis.faceLength,
            hairColor: analysis.hairColor,
            hairTexture: analysis.hairTexture,
            hairLength: analysis.hairLength,
            hairMeasurements: analysis.hairMeasurements,
            angle: angleKey,
            photoBase64: anglePhoto.base64,
            photoMediaType: anglePhoto.mediaType,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        setGeneratedStyles((prev) =>
          prev.map((s, i) => i === styleIndex
            ? {
                ...s,
                anglesLoading: { ...s.anglesLoading, [angleKey]: false },
                angles: { ...s.angles, [angleKey]: data.imageUrl },
              }
            : s)
        );
      } catch (err) {
        console.error(`[angles] ${angleKey} failed:`, err);
        setGeneratedStyles((prev) =>
          prev.map((s, i) => i === styleIndex
            ? { ...s, anglesLoading: { ...s.anglesLoading, [angleKey]: false } }
            : s)
        );
      }
    },
    [analysis, photos]
  );

  // Generates the requested angles TWO at a time. nano-banana-2 handles a pair of
  // concurrent calls fine (the old sequential rule was for the retired grounded_sam
  // pipeline, which tripped Replicate's rate limit). Two-up roughly halves the wait.
  const generateRemainingAngles = useCallback(
    async (styleIndex: number, styleName: string, angleKeys: readonly ("left" | "right" | "back")[]) => {
      const CONCURRENCY = 2;
      for (let i = 0; i < angleKeys.length; i += CONCURRENCY) {
        const batch = angleKeys.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((angleKey) => runAngleGeneration(styleIndex, styleName, angleKey)));
      }
    },
    [runAngleGeneration]
  );

  const generateForTab = useCallback(
    async (kind: ResultsTab, index: number) => {
      if (!analysis) return;
      const setList = kind === "hair" ? setGeneratedStyles : setGeneratedBeardStyles;
      const list = kind === "hair" ? generatedStyles : generatedBeardStyles;
      const style = list[index];
      if (!style || style.loading || style.imageUrl) return;

      if (!deductCredits(1)) {
        setCreditModalOpen(true);
        return;
      }

      setList((prev) =>
        prev.map((s, i) => (i === index ? { ...s, loading: true, error: null } : s))
      );

      // Build angle photo map from all captured photos for the v2 pipeline.
      // v2 processes each angle independently (segment → inpaint → face-lock),
      // so we pass every photo we have and let the route handle whichever angles exist.
      const anglePhotos: Record<string, { base64: string; mediaType: string }> = {};
      for (const label of ["front", "left", "right", "back"]) {
        const p = photos.find((ph) => ph.label === label);
        if (p) anglePhotos[label] = { base64: p.base64, mediaType: p.mediaType };
      }
      // Fallback: if photos have no labels, treat the first one as front.
      if (Object.keys(anglePhotos).length === 0 && photos[0]) {
        anglePhotos.front = { base64: photos[0].base64, mediaType: photos[0].mediaType };
      }
      if (Object.keys(anglePhotos).length === 0) return;

      try {
        const res = await fetch("/api/generate-hairstyle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleName: style.styleName,
            editTarget: kind,
            gender: analysis.gender,
            hairColor: analysis.hairColor,
            hairTexture: analysis.hairTexture,
            hairLength: analysis.hairLength,
            hairDensity: analysis.hairDensity,
            hairlineShape: analysis.hairlineShape,
            hairlineNotes: analysis.hairlineNotes,
            photos: anglePhotos,
            // 2×2 grid for hair: one native-4K call returns all four angles (front,
            // both sides, back) in one collage, split server-side into four images.
            gridMode: kind === "hair",
            // Use the reference dataset (mannequin cards only — findReference returns
            // nothing but faceless mannequins, so a reference guides the hair SHAPE
            // without any face to bleed onto the customer). Men's styles with a match
            // use it; everything else falls back to words.
            useReference: kind === "hair",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");

        setList((prev) =>
          prev.map((s, i) =>
            i === index
              ? { ...s, loading: false, imageUrl: data.imageUrl, angles: { front: data.imageUrl, ...data.angles }, summary: data.summary, barberInstructions: data.barberInstructions }
              : s
          )
        );

        // ── Persist the generated image so it survives a refresh, and so the
        // 45-day WhatsApp message has a photo to show. The first hair style
        // generated becomes the hero image for that message.
        // Fire-and-forget: an upload failure must not block the barber.
        if (currentVisitId && data.imageUrl) {
          const isFirstHairImage = kind === "hair" && !list.some((s, i) => i !== index && s.imageUrl);
          void fetch("/api/visit-photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitId: currentVisitId,
              photos: [{
                image: data.imageUrl,
                kind: "generated",
                angle: "front",
                serviceType: kind === "beard" ? "beard" : "haircut",
                styleName: style.styleName,
                isHero: isFirstHairImage,
              }],
            }),
          }).catch((err) => console.warn("[generate] photo upload failed:", err));
        }

        // Identity verification (Qwen3-VL) removed — generation now edits the given
        // photo in place instead of re-rendering, so a separate accuracy check on a
        // synthesized face is no longer the right tool.
      } catch (err) {
        addCredits(1);
        setList((prev) =>
          prev.map((s, i) =>
            i === index
              ? { ...s, loading: false, error: err instanceof Error ? err.message : "Failed" }
              : s
          )
        );
      }
    },
    [analysis, generatedStyles, generatedBeardStyles, photos, currentVisitId]
  );

  const generateStyleImage = useCallback((index: number) => generateForTab("hair", index), [generateForTab]);
  const generateBeardImage = useCallback((index: number) => generateForTab("beard", index), [generateForTab]);

  // "Try this colour" — recolours the customer's CURRENT cut to a suggested shade
  // (keeps the haircut, only changes colour). One generation call.
  const tryColor = useCallback(async (color: string) => {
    if (!analysis || colorBusy) return;
    const anglePhotos: Record<string, { base64: string; mediaType: string }> = {};
    for (const label of ["front", "left", "right", "back"]) {
      const p = photos.find((ph) => ph.label === label);
      if (p) anglePhotos[label] = { base64: p.base64, mediaType: p.mediaType };
    }
    if (Object.keys(anglePhotos).length === 0 && photos[0]) {
      anglePhotos.front = { base64: photos[0].base64, mediaType: photos[0].mediaType };
    }
    if (Object.keys(anglePhotos).length === 0) return;
    if (!deductCredits(1)) { setCreditModalOpen(true); return; }

    setColorBusy(color); setColorError(null);
    try {
      const res = await fetch("/api/generate-hairstyle", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recolorTo: color, editTarget: "hair", gender: analysis.gender,
          photos: anglePhotos, gridMode: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Colour preview failed");
      setColorPreview({ color, url: data.imageUrl });
    } catch (err) {
      addCredits(1);
      setColorError(err instanceof Error ? err.message : "Colour preview failed");
    } finally {
      setColorBusy(null);
    }
  }, [analysis, photos, colorBusy]);

  // Combined look from the service-selection page: composes ONE prompt for whatever
  // was picked (cut + colour + beard) and renders a single 4-angle grid. Treatments-
  // only picks need no generation — they just show the treatment cards on results.
  const generateCombined = useCallback(async (pick: ServicePick) => {
    if (!analysis) return;
    setComboPick(pick);
    const needsImage = pick.hair || pick.beard || pick.colour;
    if (!needsImage) { setComboAngles(null); setStep("results"); return; }

    const anglePhotos: Record<string, { base64: string; mediaType: string }> = {};
    for (const label of ["front", "left", "right", "back"]) {
      const p = photos.find((ph) => ph.label === label);
      if (p) anglePhotos[label] = { base64: p.base64, mediaType: p.mediaType };
    }
    if (Object.keys(anglePhotos).length === 0 && photos[0]) {
      anglePhotos.front = { base64: photos[0].base64, mediaType: photos[0].mediaType };
    }
    if (Object.keys(anglePhotos).length === 0) return;
    if (!deductCredits(1)) { setCreditModalOpen(true); return; }

    setComboBusy(true); setComboError(null);
    try {
      const res = await fetch("/api/generate-hairstyle", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editTarget: "hair", gender: analysis.gender, gridMode: true, photos: anglePhotos,
          styleName: pick.hair ? analysis.bestMatch : undefined,
          hairColor: analysis.hairColor, hairTexture: analysis.hairTexture, hairLength: analysis.hairLength,
          useReference: true,
          combo: {
            hair: pick.hair,
            colorName: pick.colour ? analysis.suggestedColors?.[0]?.color : undefined,
            beardStyle: pick.beard ? "a neat, well-groomed short boxed beard with a clean cheek line and lineups" : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the look");
      setComboAngles({ front: data.imageUrl, ...data.angles });
      setStep("results");
    } catch (err) {
      addCredits(1);
      setComboError(err instanceof Error ? err.message : "Could not create the look");
    } finally {
      setComboBusy(false);
    }
  }, [analysis, photos]);

  // Single angle, on demand — used to retry one that failed.
  const generateAngle = useCallback(async (styleIndex: number, angleKey: "left" | "right" | "back") => {
    const style = generatedStyles[styleIndex];
    if (!style?.imageUrl) return;
    if (style.anglesLoading?.[angleKey] || style.angles?.[angleKey]) return;

    await runAngleGeneration(styleIndex, style.styleName, angleKey);
  }, [generatedStyles, runAngleGeneration]);

  // All three angles, on demand — bound to the "Generate 3 angle views" button.
  // Never fires on its own; the front image alone is what a card generation costs.
  const generateAllAngles = useCallback(async (styleIndex: number) => {
    const style = generatedStyles[styleIndex];
    if (!style?.imageUrl) return;

    // Skip any angle already rendered, so the button doubles as a retry.
    const pending = (["left", "right", "back"] as const).filter((a) => !style.angles?.[a]);
    if (pending.length === 0) return;

    await generateRemainingAngles(styleIndex, style.styleName, pending);
  }, [generatedStyles, generateRemainingAngles]);

  // Single gridMode call — sends all angle photos, asks model to output 2x2 grid, splits result.
  const generateGrid = useCallback(async (styleIndex: number) => {
    if (!analysis) return;
    const style = generatedStyles[styleIndex];
    if (!style?.imageUrl) return;

    const anglePhotos: Record<string, { base64: string; mediaType: string }> = {};
    for (const label of ["front", "left", "right", "back"]) {
      const p = photos.find((ph) => ph.label === label);
      if (p) anglePhotos[label] = { base64: p.base64, mediaType: p.mediaType };
    }

    setGeneratedStyles((prev) =>
      prev.map((s, i) => i === styleIndex
        ? { ...s, anglesLoading: { left: true, right: true, back: true } }
        : s)
    );

    try {
      const res = await fetch("/api/generate-hairstyle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleName: style.styleName,
          editTarget: "hair",
          skinTone: analysis.skinTone,
          hairDensity: analysis.hairDensity,
          faceShape: analysis.faceShape,
          faceLength: analysis.faceLength,
          hairColor: analysis.hairColor,
          hairTexture: analysis.hairTexture,
          hairLength: analysis.hairLength,
          hairMeasurements: analysis.hairMeasurements,
          photos: anglePhotos,
          gridMode: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setGeneratedStyles((prev) =>
        prev.map((s, i) => i === styleIndex
          ? {
              ...s,
              anglesLoading: { left: false, right: false, back: false },
              angles: {
                front: data.angles?.front ?? s.angles?.front,
                left: data.angles?.left,
                right: data.angles?.right,
                back: data.angles?.back,
              },
            }
          : s)
      );
    } catch {
      setGeneratedStyles((prev) =>
        prev.map((s, i) => i === styleIndex
          ? { ...s, anglesLoading: { left: false, right: false, back: false } }
          : s)
      );
    }
  }, [analysis, generatedStyles, photos]);

  const generateGif = useCallback(
    async (index: number) => {
      if (!analysis) return;
      const style = generatedStyles[index];
      if (!style || style.gifLoading || style.gifUrl) return;

      if (!deductCredits(4)) {
        setCreditModalOpen(true);
        return;
      }

      setGeneratedStyles((prev) =>
        prev.map((s, i) => (i === index ? { ...s, gifLoading: true } : s))
      );

      try {
        const res = await fetch("/api/generate-gif", {
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
        if (!res.ok) throw new Error(data.error || "GIF generation failed");

        setGeneratedStyles((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, gifLoading: false, gifUrl: data.gifUrl } : s
          )
        );
      } catch (err) {
        setGeneratedStyles((prev) =>
          prev.map((s, i) =>
            i === index
              ? { ...s, gifLoading: false, error: err instanceof Error ? err.message : "GIF failed" }
              : s
          )
        );
      }
    },
    [analysis, generatedStyles]
  );

  const reset = () => {
    setStep("capture");
    setPhotos([]);
    setAnalysis(null);
    setGeneratedStyles([]);
    setGeneratedBeardStyles(
      BEARD_STYLES.map((name) => ({ styleName: name, imageUrl: null, loading: false, error: null, gifUrl: null, gifLoading: false }))
    );
    setResultsTab("hair");
    setAnalyzeError(null);
    setQualityWarnings([]);
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

  // ── PREFERENCES STEP ─────────────────────────────────────────────
  if (step === "preferences") {
    return (
      <PreferencesStep
        onSubmit={(answers) => runAnalysis(photos, answers)}
        onSkip={() => runAnalysis(photos, {})}
      />
    );
  }

  // ── ANALYZING STEP ───────────────────────────────────────────────
  if (step === "analyzing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 pb-32"
        style={{ background: "var(--bg)" }}>

        {/* Orbital spinner */}
        <div className="relative w-24 h-24">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(143,167,154,0.12)" }}
          />
          {/* Spinning arc */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid transparent", borderTopColor: "var(--accent)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner purple ring */}
          <motion.div
            className="absolute"
            style={{
              inset: 8,
              borderRadius: "50%",
              border: "1.5px solid transparent",
              borderTopColor: "var(--accent-purple)",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center text-2xl">✂️</div>
          {/* Glow */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: "0 0 24px rgba(143,167,154,0.15)" }} />
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Analysing{customerName ? ` ${customerName}'s` : ""} hair
          </h2>
        </div>

        {/* Photo strip */}
        <div className="flex gap-2">
          {photos.map((p, i) => (
            <div key={i} className="w-16 h-16 rounded-xl overflow-hidden"
              style={{ border: "1.5px solid rgba(143,167,154,0.2)" }}>
              <img src={p.preview} alt={p.label} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        {/* Animated stages */}
        <AnalysisStages photoCount={photos.length} />
      </div>
    );
  }

  // ── SERVICES STEP — pick which services, then generate a combined look ──
  if (step === "services") {
    return (
      <>
        {comboError && (
          <div className="fixed top-4 left-4 right-4 z-50 rounded-xl p-3 text-sm text-center"
            style={{ background: "#FEE", color: "var(--danger)" }}>{comboError}</div>
        )}
        <ServiceSelection gender={analysis?.gender} busy={comboBusy} onContinue={generateCombined} />
      </>
    );
  }

  // ── RESULTS STEP ─────────────────────────────────────────────────
  const noCredits = getCredits() === 0;

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg)" }}>
      <CreditModal open={creditModalOpen} onClose={() => setCreditModalOpen(false)} />

      {/* Colour preview modal */}
      <AnimatePresence>
        {colorPreview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setColorPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={colorPreview.url} alt={colorPreview.color} className="w-full" />
              <div className="p-4">
                <p className="font-bold text-sm capitalize" style={{ color: "var(--text-primary)" }}>🎨 {colorPreview.color}</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                  AI preview — the real salon result depends on the customer&apos;s hair condition and may need bleaching.
                </p>
                <button onClick={() => setColorPreview(null)} className="btn-primary w-full mt-3">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo quality warnings */}
      {qualityWarnings.length > 0 && (
        <div className="mx-5 mt-4 rounded-xl p-3 text-sm flex flex-col gap-1"
          style={{ background: "#FFF7ED", border: "1px solid #C9A15C", color: "#92400E" }}>
          <p className="font-semibold">⚠️ Photo quality issues detected</p>
          {qualityWarnings.map((w) => (
            <p key={w.label}>• {w.message}</p>
          ))}
          <p className="mt-1 text-xs" style={{ color: "#B45309" }}>
            Analysis proceeded — retake affected angles for better accuracy.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: "var(--bg)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black gradient-text">Hair Analysis</h1>
            {customerName && (
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>For {customerName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CreditBadge onBuyClick={() => setCreditModalOpen(true)} />
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-bright)",
              }}
            >
              New scan
            </button>
          </div>
        </div>
      </div>

      {/* Photo strip */}
      <div className="px-5 mb-5">
        <div className="flex gap-2">
          {photos.map((p, i) => (
            <div key={i} className={`overflow-hidden rounded-xl ${i === 0 ? "flex-[2]" : "flex-1"}`}
              style={{ border: "1px solid rgba(143,167,154,0.15)" }}>
              <img src={p.preview} alt={p.label}
                className={`w-full object-cover ${i === 0 ? "aspect-[3/4]" : "aspect-square"}`} />
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnalysisCard analysis={analysis} />
            {colorError && (
              <p className="px-5 mt-2 text-xs" style={{ color: "var(--danger)" }}>{colorError}</p>
            )}
            <div className="h-6" />

            {/* Combined "your look" from the service-selection page — the tailored
                result showing exactly what was picked. */}
            {comboAngles && (
              <div className="px-5 mb-6">
                <h2 className="font-bold text-sm mb-2" style={{ color: "var(--text-primary)" }}>✨ Your look</h2>
                <div className="grid grid-cols-2 gap-2">
                  {(["front", "left", "right", "back"] as const).map((a) => comboAngles[a] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={a} src={comboAngles[a]} alt={a} className="rounded-xl w-full" style={{ border: "1px solid var(--border)" }} />
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                  {comboPick?.hair && (
                    <span className="px-2 py-1 rounded-lg text-[11px] font-bold" style={{ background: "rgba(143,167,154,0.1)", color: "#8FA79A" }}>💇 {analysis.bestMatch}</span>
                  )}
                  {comboPick?.colour && analysis.suggestedColors?.[0] && (
                    <span className="px-2 py-1 rounded-lg text-[11px] font-bold" style={{ background: "rgba(201,161,92,0.12)", color: "#C9A15C" }}>🎨 {analysis.suggestedColors[0].color}</span>
                  )}
                  {comboPick?.beard && (
                    <span className="px-2 py-1 rounded-lg text-[11px] font-bold" style={{ background: "rgba(169,162,184,0.12)", color: "#A9A2B8" }}>🧔 Beard shaped</span>
                  )}
                </div>
                <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                  Explore individual options in the tabs below.
                </p>
              </div>
            )}

            {/* Treatments picked on the services page → show the care suggestions. */}
            {comboPick?.treatments && (
              <div className="mb-6">
                <h2 className="font-bold text-sm mb-3 px-5" style={{ color: "var(--text-primary)" }}>✨ Recommended services</h2>
                <TreatmentsSection analysis={analysis} />
                <div className="h-4" />
              </div>
            )}

            {/* Hair / Beard / Colour choice. Beard only when the AI detects a man;
                Hair and Colour are for everyone. "Both" (hair+beard) is intentionally
                not built yet (pending a combined-prompt test). */}
            {(() => {
              const isMale = analysis.gender?.toLowerCase().startsWith("m");
              const tabs: ResultsTab[] = isMale ? ["hair", "beard", "color", "treatments"] : ["hair", "color", "treatments"];
              const labels: Record<ResultsTab, string> = { hair: "💇 Hair Cuts", beard: "🧔 Beard", color: "🎨 Colour", treatments: "✨ Treatments" };
              return (
                <div className="px-5 mb-4 flex gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setResultsTab(tab)}
                      className="px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                      style={
                        resultsTab === tab
                          ? { background: "linear-gradient(135deg, #8FA79A, #6E8778)", color: "#000" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                      }
                    >
                      {labels[tab]}
                    </button>
                  ))}
                </div>
              );
            })()}

            <AnimatePresence mode="wait">
              <motion.div key={resultsTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {resultsTab === "hair" ? (
                  <StyleGrid
                    styles={generatedStyles}
                    bestMatch={analysis.bestMatch}
                    onGenerate={generateStyleImage}
                    onGenerateAngle={generateAngle}
                    onGenerateAllAngles={generateAllAngles}
                    onGenerateGrid={generateGrid}
                    onGenerateGif={generateGif}
                    noCredits={noCredits}
                    onBuyCredits={() => setCreditModalOpen(true)}
                  />
                ) : resultsTab === "color" ? (
                  <ColorSection
                    colors={analysis.suggestedColors ?? []}
                    onTryColor={tryColor}
                    busyColor={colorBusy}
                  />
                ) : resultsTab === "treatments" ? (
                  <TreatmentsSection analysis={analysis} />
                ) : (
                  <StyleGrid
                    styles={generatedBeardStyles}
                    bestMatch=""
                    onGenerate={generateBeardImage}
                    noCredits={noCredits}
                    onBuyCredits={() => setCreditModalOpen(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm the preview and move to the haircut. The visit is already saved
          (on analysis), so this just returns the barber to the dashboard where
          the customer sits in the in-progress queue. */}
      {analysis && onContinueToHaircut && (
        <div className="px-5 mt-8">
          <button onClick={onContinueToHaircut} className="btn-primary w-full">
            ✓ Continue to haircut
          </button>
          <p className="text-center text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
            Saved to the in-progress queue — bill them when the cut is done.
          </p>
        </div>
      )}

      <div className="px-5 mt-4">
        <button onClick={reset} className="btn-ghost">
          ↩ Start new customer
        </button>
      </div>
    </div>
  );
}
