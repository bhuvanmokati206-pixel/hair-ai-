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
import CustomerDashboardView from "./CustomerDashboardView";
import HairHealthWizard from "./HairHealthWizard";
import CustomerHistory from "./CustomerHistory";
import DashNav, { type DashTab } from "./DashNav";
import TrimViewMark from "./TrimViewMark";
import StyleGrid from "./StyleGrid";
import CreditBadge from "./CreditBadge";
import CreditModal from "./CreditModal";
import { getCredits, deductCredits, addCredits } from "@/lib/credits";
import { scoreStyles } from "@/lib/compatibilityEngine";
import { useStore } from "@/lib/store";
import ReferenceUploadModal from "./ReferenceUploadModal";
import ReferenceResultCard, {
  type ReferenceAnalysisData,
  type ReferenceAngles,
} from "./ReferenceResultCard";
import CustomerExploreTab from "./CustomerExploreTab";

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
  whySuits?: string;
  summary?: string;
  barberInstructions?: string;
};

type Step = "capture" | "style_choice" | "preferences" | "analyzing" | "services" | "stylepick" | "dashboard" | "results" | "reference_result";
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
  const customerId = useStore((s) => s.currentCustomer?.id);
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
  const [chosenStyleName, setChosenStyleName] = useState<string | null>(null);
  const [dashTab, setDashTab] = useState<DashTab>("home");

  // Reference first flow states
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [refBusy, setRefBusy] = useState(false);
  const [referenceResult, setReferenceResult] = useState<{
    referencePhotoUrl: string;
    generatedPhotoUrl: string;
    angles?: ReferenceAngles | null;
    analysis: ReferenceAnalysisData;
  } | null>(null);

  // Capture done → ask customer whether they have a reference photo or want AI face-shape recommendations
  const handlePhotosComplete = useCallback((capturedPhotos: CapturedPhoto[]) => {
    setPhotos(capturedPhotos);
    setAnalyzeError(null);
    setStep("style_choice");
  }, []);

  const handleReferenceSubmit = useCallback(
    async (refPhoto: { base64: string; mediaType: string }) => {
      setRefBusy(true);
      try {
        const frontPhoto = photos.find((p) => p.label === "front") ?? photos[0];
        if (!frontPhoto) throw new Error("Customer front photo is required.");

        // 1. Vision breakdown comparing customer actual hair & face with reference photo
        const analyzeRes = await fetch("/api/analyze-reference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: refPhoto.base64,
            mediaType: refPhoto.mediaType,
            customerPhotoBase64: frontPhoto.base64,
            customerMediaType: frontPhoto.mediaType,
            customerContext: {
              faceShape: analysis?.faceShape,
              hairLength: analysis?.hairLength,
              hairMeasurements: analysis?.hairMeasurements,
              gender: customerGender,
            },
          }),
        });
        const analyzeData = await analyzeRes.json();
        const refAnalysis: ReferenceAnalysisData = analyzeData.analysis;

        // 2. Transfer the hairstyle onto customer's face generating 4-angle views
        const transferRes = await fetch("/api/hair-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetBase64: frontPhoto.base64,
            targetMediaType: frontPhoto.mediaType,
            referenceBase64: refPhoto.base64,
            referenceMediaType: refPhoto.mediaType,
            styleName: refAnalysis.styleName,
          }),
        });
        const transferData = await transferRes.json();
        if (!transferRes.ok) throw new Error(transferData.error ?? "Hair transfer failed");

        const generatedUrl = transferData.imageUrl;
        const generatedAngles: ReferenceAngles = transferData.angles || {
          front: generatedUrl,
          left: generatedUrl,
          right: generatedUrl,
          back: generatedUrl,
        };
        const refUrl = `data:${refPhoto.mediaType};base64,${refPhoto.base64}`;

        // 3. Save reference and all generated angle views into visit photos in Supabase
        if (currentVisitId) {
          const photosToSave = [
            {
              image: generatedAngles.front || generatedUrl,
              kind: "generated",
              angle: "front",
              serviceType: "haircut",
              styleName: refAnalysis.styleName,
              isHero: true,
            },
          ];
          if (generatedAngles.left) {
            photosToSave.push({
              image: generatedAngles.left,
              kind: "generated",
              angle: "left",
              serviceType: "haircut",
              styleName: refAnalysis.styleName,
              isHero: false,
            });
          }
          if (generatedAngles.right) {
            photosToSave.push({
              image: generatedAngles.right,
              kind: "generated",
              angle: "right",
              serviceType: "haircut",
              styleName: refAnalysis.styleName,
              isHero: false,
            });
          }
          if (generatedAngles.back) {
            photosToSave.push({
              image: generatedAngles.back,
              kind: "generated",
              angle: "back",
              serviceType: "haircut",
              styleName: refAnalysis.styleName,
              isHero: false,
            });
          }

          void fetch("/api/visit-photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitId: currentVisitId,
              photos: photosToSave,
            }),
          }).catch((err) => console.warn("[ref-transfer] save failed:", err));
        }

        setReferenceResult({
          referencePhotoUrl: refUrl,
          generatedPhotoUrl: generatedUrl,
          angles: generatedAngles,
          analysis: refAnalysis,
        });

        setRefModalOpen(false);
        setStep("reference_result");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Reference processing failed");
      } finally {
        setRefBusy(false);
      }
    },
    [photos, currentVisitId, analysis, customerGender]
  );

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
              ? { ...s, loading: false, imageUrl: data.imageUrl, angles: { front: data.imageUrl, ...data.angles }, whySuits: data.whySuits, summary: data.summary, barberInstructions: data.barberInstructions }
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

  // The actual generation. `chosenStyle` is the hairstyle the customer picked on
  // the style-picker step — when absent (no haircut, or beard/colour only) it is
  // ignored. Composes ONE prompt for whatever was picked and renders a 4-angle grid.
  const runCombined = useCallback(async (pick: ServicePick, chosenStyle?: string) => {
    if (!analysis) return;
    const styleForCut = pick.hair ? (chosenStyle || analysis.bestMatch) : undefined;
    setChosenStyleName(styleForCut ?? null);

    const needsImage = pick.hair || pick.beard || pick.colour;
    if (!needsImage) { setComboAngles(null); setStep("dashboard"); return; }

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
          styleName: styleForCut,
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
      setStep("dashboard");
    } catch (err) {
      addCredits(1);
      setComboError(err instanceof Error ? err.message : "Could not create the look");
    } finally {
      setComboBusy(false);
    }
  }, [analysis, photos]);

  // From the service-selection page. If a haircut was picked, let the customer
  // choose WHICH style first (so every pick is a genuinely different look, not
  // always the single best-match). Otherwise generate straight away.
  // Service page → straight to the customer dashboard. The customer browses and
  // generates styles on the Previews tab; no pre-generated combined look.
  const onServicesContinue = useCallback((pick: ServicePick) => {
    setComboPick(pick);
    setComboError(null);
    setDashTab("home");
    setStep("dashboard");
  }, []);

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

  const handleExploreTryOnFace = useCallback(
    (styleName: string) => {
      let targetIndex = generatedStyles.findIndex(
        (s) => s.styleName.toLowerCase() === styleName.toLowerCase()
      );

      if (targetIndex === -1) {
        const newStyle: GeneratedStyle = {
          styleName,
          compatibilityScore: 92,
          imageUrl: null,
          loading: false,
          error: null,
          gifUrl: null,
          gifLoading: false,
        };
        setGeneratedStyles((prev) => [newStyle, ...prev]);
        targetIndex = 0;
      }

      setDashTab("previews");
      setResultsTab("hair");

      setTimeout(() => {
        generateStyleImage(targetIndex);
      }, 150);
    },
    [generatedStyles, generateStyleImage]
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

  // ── STYLE CHOICE STEP — Ask if customer has a reference photo ──────
  if (step === "style_choice") {
    return (
      <div className="min-h-screen flex flex-col justify-between px-6 pt-16 pb-24" style={{ background: "var(--bg)", color: "#F2EFE9" }}>
        <div className="space-y-2 text-center max-w-sm mx-auto">
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, letterSpacing: ".28em", textTransform: "uppercase", color: "#7C766C" }}>
            Hairstyle Discovery
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 300, color: "#F2EFE9" }}>
            How would you like to style your look?
          </h1>
          <p className="text-xs text-[#948D82] pt-1">
            Choose whether to bring your own inspo photo or let AI recommend cuts for your face shape.
          </p>
        </div>

        {/* The 2 Choice Cards */}
        <div className="space-y-3 max-w-sm mx-auto w-full my-auto py-6">
          {/* Choice 1: Reference Photo */}
          <button
            onClick={() => setRefModalOpen(true)}
            className="w-full card p-5 rounded-2xl border border-white/10 hover:border-[#8FA79A] bg-gradient-to-b from-white/[0.04] to-transparent text-left flex items-start gap-4 active:scale-[0.98] transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#8FA79A]/15 border border-[#8FA79A]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
              📸
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white group-hover:text-[#8FA79A] transition-colors">
                  I have a reference photo
                </h3>
                <span className="text-xs text-white/40">➔</span>
              </div>
              <p className="text-[11px] text-[#948D82] mt-1 leading-relaxed">
                Upload or snap a photo from Instagram, Pinterest, or magazine. We&apos;ll analyze the cut &amp; generate it on your face.
              </p>
            </div>
          </button>

          {/* Choice 2: AI Face Shape Recommendations */}
          <button
            onClick={() => setStep("preferences")}
            className="w-full card p-5 rounded-2xl border border-white/10 hover:border-[#BFD2C7] bg-gradient-to-b from-white/[0.04] to-transparent text-left flex items-start gap-4 active:scale-[0.98] transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
              ✨
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  Show what suits my face shape
                </h3>
                <span className="text-xs text-white/40">➔</span>
              </div>
              <p className="text-[11px] text-[#948D82] mt-1 leading-relaxed">
                AI detects your face shape, density, and texture to recommend tailored styles that enhance your features.
              </p>
            </div>
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => setStep("capture")}
            className="text-xs text-[#7C766C] hover:text-[#948D82]"
          >
            ← Retake face scan
          </button>
        </div>

        <ReferenceUploadModal
          isOpen={refModalOpen}
          onClose={() => setRefModalOpen(false)}
          onSubmit={handleReferenceSubmit}
          busy={refBusy}
        />
      </div>
    );
  }

  // ── REFERENCE RESULT STEP — Show transferred hairstyle on customer face ──
  if (step === "reference_result" && referenceResult) {
    return (
      <div className="min-h-screen px-5 pt-12 pb-28" style={{ background: "var(--bg)" }}>
        <ReferenceResultCard
          referencePhotoUrl={referenceResult.referencePhotoUrl}
          generatedPhotoUrl={referenceResult.generatedPhotoUrl}
          angles={referenceResult.angles}
          analysis={referenceResult.analysis}
          onExploreRecommendations={() => setStep("preferences")}
          onContinueToHaircut={() => onContinueToHaircut?.()}
          onTryAnotherReference={() => setRefModalOpen(true)}
        />
        <ReferenceUploadModal
          isOpen={refModalOpen}
          onClose={() => setRefModalOpen(false)}
          onSubmit={handleReferenceSubmit}
          busy={refBusy}
        />
      </div>
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
          <div className="absolute inset-0 flex items-center justify-center"><TrimViewMark size={30} color="#F2EFE9" /></div>
          {/* Glow */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: "0 0 24px rgba(143,167,154,0.15)" }} />
        </div>

        {/* Title */}
        <div className="text-center">
          <div style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 9, letterSpacing: ".28em", textTransform: "uppercase", color: "#7C766C" }}>
            Analysing
          </div>
          <h2 style={{ marginTop: 8, fontSize: 20, fontWeight: 200, letterSpacing: ".04em", color: "#F2EFE9" }}>
            {customerName ? `${customerName}'s hair` : "Your hair"}
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
        <ServiceSelection gender={analysis?.gender} busy={comboBusy} onContinue={onServicesContinue} />
      </>
    );
  }

  // ── CUSTOMER DASHBOARD — 4-tab shell handed to the customer ──────
  // Home = photos + analysis; Previews = generate styles in place;
  // Hair Test = the wizard; History = past visits.
  const noCredits = getCredits() === 0;
  const isMalePreview = analysis?.gender?.toLowerCase().startsWith("m");
  const previewTabs: ResultsTab[] = isMalePreview ? ["hair", "beard", "color"] : ["hair", "color"];
  const previewLabels: Record<ResultsTab, string> = { hair: "💇 Hair", beard: "🧔 Beard", color: "🎨 Colour", treatments: "✨" };
  const activePreviewTab: ResultsTab = previewTabs.includes(resultsTab) ? resultsTab : "hair";
  const frontPhoto = photos.find((p) => p.label === "front") ?? photos[0];
  const dashMicro: React.CSSProperties = { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: "#7C766C" };
  const dashTitle: React.CSSProperties = { marginTop: 8, fontSize: 26, fontWeight: 200, letterSpacing: ".04em", color: "#F2EFE9" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", paddingBottom: 96 }}>
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

      {/* HOME — photos carousel + name + hair details + best style */}
      {dashTab === "home" && (
        <CustomerDashboardView name={customerName ?? "there"} photos={photos} analysis={analysis} />
      )}

      {/* HAIR TEST — the wizard, unchanged */}
      {dashTab === "hairtest" && (
        <div>
          <div className="px-5 pt-14 pb-4">
            <div style={dashMicro}>Hair &amp; scalp</div>
            <h1 style={dashTitle}>Hair Test</h1>
          </div>
          <div className="px-5">
            <HairHealthWizard photoBase64={frontPhoto?.base64} photoMediaType={frontPhoto?.mediaType} gender={analysis?.gender} />
          </div>
        </div>
      )}

      {/* HISTORY — past visits, rating, preferences by date */}
      {dashTab === "history" && (
        <CustomerHistory customerId={customerId} customerName={customerName} />
      )}

      {/* EXPLORE — discover hairstyles classified by hair type */}
      {dashTab === "explore" && (
        <CustomerExploreTab
          analysis={analysis}
          onTryOnFace={handleExploreTryOnFace}
        />
      )}

      {/* PREVIEWS — generate the styles in place */}
      {dashTab === "previews" && (<>

      {/* Photo quality warnings */}
      {qualityWarnings.length > 0 && (
        <div className="mx-5 mt-4 rounded-xl p-3 text-sm flex flex-col gap-1"
          style={{ background: "rgba(201,161,92,0.1)", border: "1px solid rgba(201,161,92,0.35)", color: "#C9A15C" }}>
          <p className="font-semibold">⚠️ Photo quality issues detected</p>
          {qualityWarnings.map((w) => (
            <p key={w.label} style={{ color: "#948D82" }}>• {w.message}</p>
          ))}
          <p className="mt-1 text-xs" style={{ color: "#7C766C" }}>
            Analysis proceeded — retake affected angles for better accuracy.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div style={dashMicro}>Try a look</div>
            <h1 style={dashTitle}>Previews</h1>
            <p className="mt-1 text-xs" style={{ color: "#948D82" }}>Tap a style to generate it on the customer.</p>
          </div>
          <CreditBadge onBuyClick={() => setCreditModalOpen(true)} />
        </div>
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {colorError && (
              <p className="px-5 mb-2 text-xs" style={{ color: "var(--danger)" }}>{colorError}</p>
            )}

            {/* Hair / Beard / Colour tabs (beard only for men). */}
            <div className="px-5 mb-4 flex gap-2">
              {previewTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setResultsTab(tab)}
                  className="px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                  style={
                    activePreviewTab === tab
                      ? { background: "linear-gradient(135deg, #8FA79A, #6E8778)", color: "#000" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                  }
                >
                  {previewLabels[tab]}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activePreviewTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {activePreviewTab === "hair" ? (
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
                ) : activePreviewTab === "color" ? (
                  <ColorSection
                    colors={analysis.suggestedColors ?? []}
                    onTryColor={tryColor}
                    busyColor={colorBusy}
                  />
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

      </>)}

      <DashNav tab={dashTab} onTab={setDashTab} />
    </div>
  );
}
