import type { HairAnalysis } from "@/components/HairAIAutomation";

type StyleRequirements = {
  minTopCm: number;
  minSideCm: number;
  minNapeCm: number;
  textures: string[];  // empty = any
  densities: string[]; // empty = any
};

// All measurements are minimums in cm.
// Textures / densities list what works well — empty means the style suits anything.
const STYLE_TABLE: Record<string, StyleRequirements> = {
  // ── Ultra-short ───────────────────────────────────────────────────
  "buzz cut":           { minTopCm: 0.3, minSideCm: 0.3, minNapeCm: 0.3, textures: [], densities: [] },
  "induction cut":      { minTopCm: 0.1, minSideCm: 0.1, minNapeCm: 0.1, textures: [], densities: [] },

  // ── Short ─────────────────────────────────────────────────────────
  "caesar cut":         { minTopCm: 3,   minSideCm: 1,   minNapeCm: 1,   textures: [], densities: [] },
  "crew cut":           { minTopCm: 3,   minSideCm: 1,   minNapeCm: 1,   textures: ["straight", "wavy"], densities: [] },
  "pixie cut":          { minTopCm: 3,   minSideCm: 1,   minNapeCm: 1,   textures: [], densities: [] },
  "french crop":        { minTopCm: 4,   minSideCm: 1,   minNapeCm: 1,   textures: [], densities: [] },
  "textured crop":      { minTopCm: 5,   minSideCm: 2,   minNapeCm: 2,   textures: ["straight", "wavy"], densities: ["medium", "thick"] },
  "fade with quiff":    { minTopCm: 6,   minSideCm: 1,   minNapeCm: 1,   textures: ["straight", "wavy"], densities: ["medium", "thick"] },
  "undercut":           { minTopCm: 5,   minSideCm: 1,   minNapeCm: 1,   textures: [], densities: [] },
  "side part":          { minTopCm: 6,   minSideCm: 2,   minNapeCm: 2,   textures: ["straight", "wavy"], densities: [] },

  // ── Medium ────────────────────────────────────────────────────────
  "slick back":         { minTopCm: 8,   minSideCm: 2,   minNapeCm: 3,   textures: ["straight", "wavy"], densities: ["medium", "thick"] },
  "pompadour":          { minTopCm: 8,   minSideCm: 2,   minNapeCm: 2,   textures: ["straight", "wavy"], densities: ["thick"] },
  "quiff":              { minTopCm: 7,   minSideCm: 2,   minNapeCm: 2,   textures: ["straight", "wavy"], densities: ["medium", "thick"] },
  "bob":                { minTopCm: 8,   minSideCm: 6,   minNapeCm: 4,   textures: [], densities: [] },
  "lob":                { minTopCm: 12,  minSideCm: 10,  minNapeCm: 8,   textures: [], densities: [] },
  "curtain bangs":      { minTopCm: 10,  minSideCm: 4,   minNapeCm: 4,   textures: ["straight", "wavy"], densities: [] },
  "shag":               { minTopCm: 10,  minSideCm: 6,   minNapeCm: 8,   textures: ["wavy", "curly"], densities: [] },

  // ── Long ──────────────────────────────────────────────────────────
  "wolf cut":           { minTopCm: 12,  minSideCm: 8,   minNapeCm: 10,  textures: ["wavy", "curly"], densities: ["thick"] },
  "bun":                { minTopCm: 15,  minSideCm: 10,  minNapeCm: 12,  textures: [], densities: [] },
  "man bun":            { minTopCm: 15,  minSideCm: 10,  minNapeCm: 12,  textures: [], densities: [] },
  "ponytail":           { minTopCm: 12,  minSideCm: 8,   minNapeCm: 10,  textures: [], densities: [] },
  "beach waves":        { minTopCm: 15,  minSideCm: 10,  minNapeCm: 12,  textures: ["wavy", "curly"], densities: [] },

  // ── Beard styles ──────────────────────────────────────────────────
  "full beard":         { minTopCm: 0,   minSideCm: 0,   minNapeCm: 0,   textures: [], densities: [] },
  "stubble":            { minTopCm: 0,   minSideCm: 0,   minNapeCm: 0,   textures: [], densities: [] },
  "goatee":             { minTopCm: 0,   minSideCm: 0,   minNapeCm: 0,   textures: [], densities: [] },
  "french cut":         { minTopCm: 0,   minSideCm: 0,   minNapeCm: 0,   textures: [], densities: [] },
  "circle beard":       { minTopCm: 0,   minSideCm: 0,   minNapeCm: 0,   textures: [], densities: [] },
  "chin strap":         { minTopCm: 0,   minSideCm: 0,   minNapeCm: 0,   textures: [], densities: [] },
};

// The hair-style vocabulary the scoring table actually knows.
//
// The analysis prompt is built from this list so the model returns names that
// match. Without it a model is free to answer "Textured French Crop with Skin
// Fade", which normalises to nothing in STYLE_TABLE — every style then silently
// scores the 78 default and the compatibility engine stops doing anything.
// Beard entries are the ones with no length requirement at all, so minTopCm
// separates them from hair styles without a second list to keep in sync.
export const KNOWN_HAIR_STYLES: string[] = Object.keys(STYLE_TABLE).filter(
  (k) => STYLE_TABLE[k].minTopCm > 0
);

// Parses "~3cm", "3cm", "3", etc. → number. Returns null if unparseable.
function parseCm(raw?: string): number | null {
  if (!raw) return null;
  const match = raw.replace(/~/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// Converts scale labels to approximate midpoint cm for fallback scoring.
const SCALE_TO_CM: Record<string, number> = {
  very_short: 0.5,
  short: 2.5,
  medium: 6,
  long: 12,
  very_long: 20,
};

function lengthScore(actualCm: number, requiredCm: number): number {
  if (requiredCm === 0) return 100;
  if (actualCm >= requiredCm) return 100;
  return Math.round((actualCm / requiredCm) * 100);
}

function listScore(actual: string, allowed: string[]): number {
  if (!allowed.length) return 100;
  const norm = actual.toLowerCase();
  return allowed.some((a) => norm.includes(a.toLowerCase())) ? 100 : 45;
}

// Normalize style name for table lookup: lowercase, collapse spaces, strip punctuation.
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

// Approximate TARGET length per zone for a known style, in cm. These are the
// table's minimums — i.e. the shortest length at which the style reads correctly —
// which is a reasonable "aim for roughly this" for the generated look. Returns null
// for an unknown style so the caller can skip the target line.
export function getStyleTargetCm(styleName: string): { top: number; side: number; nape: number } | null {
  const req = STYLE_TABLE[normalize(styleName)];
  if (!req) return null;
  return { top: req.minTopCm, side: req.minSideCm, nape: req.minNapeCm };
}

export type ScoredStyle = {
  styleName: string;
  score: number; // 0–100
  breakdown: { top: number; sides: number; nape: number; texture: number; density: number };
};

export function scoreStyles(analysis: HairAnalysis, styleNames: string[]): ScoredStyle[] {
  const m = analysis.hairMeasurements;

  // Resolve actual cm values — prefer explicit cm strings, fall back to scale labels.
  const topCm    = parseCm(m?.topCm)    ?? SCALE_TO_CM[m?.topLength    ?? ""] ?? SCALE_TO_CM[analysis.hairLength] ?? 2.5;
  const sideCm   = parseCm(m?.sideCm)   ?? SCALE_TO_CM[m?.sideLength   ?? ""] ?? SCALE_TO_CM[analysis.hairLength] ?? 2.5;
  const napeCm   = parseCm(m?.napeCm)   ?? SCALE_TO_CM[m?.napeLength   ?? ""] ?? SCALE_TO_CM[analysis.hairLength] ?? 2.5;
  const texture  = (analysis.hairTexture  ?? "").toLowerCase();
  const density  = (analysis.hairDensity  ?? "").toLowerCase();

  return styleNames.map((name) => {
    const req = STYLE_TABLE[normalize(name)];

    if (!req) {
      // Style not in our table — AI said it's feasible, give a reasonable default.
      return { styleName: name, score: 78, breakdown: { top: 78, sides: 78, nape: 78, texture: 78, density: 78 } };
    }

    const top     = lengthScore(topCm,  req.minTopCm);
    const sides   = lengthScore(sideCm, req.minSideCm);
    const nape    = lengthScore(napeCm, req.minNapeCm);
    const tex     = listScore(texture,  req.textures);
    const den     = listScore(density,  req.densities);

    // Weights: length zones matter most, then texture, then density.
    const score = Math.round(top * 0.35 + sides * 0.25 + nape * 0.20 + tex * 0.10 + den * 0.10);

    return { styleName: name, score, breakdown: { top, sides, nape, texture: tex, density: den } };
  }).sort((a, b) => b.score - a.score);
}
