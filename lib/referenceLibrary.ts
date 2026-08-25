// Reference hairstyle library (the aura-hairstyles dataset).
//
// 118 mannequin reference cards, each showing one men's style from four angles.
// Installed by scripts (see lib/referenceLibrary.data.json). Given a suggested
// style name from the analysis, findReference() returns the closest reference
// image so generation can copy the real shape instead of guessing from a name.
//
// Men AND women (aura-hairstyles-combined `reference` bucket — faceless mannequin
// and style cards only; the real-person `realistic` bucket is never installed).

import raw from "./referenceLibrary.data.json" with { type: "json" };

export type ReferenceEntry = {
  id: string;
  name: string;
  length: "short" | "medium" | "long";
  gender: "men" | "women";
  slug: string;
  image: string;     // public URL, e.g. /aura-hairstyles/reference/men/short/buzz-cut/…
  diskPath: string;  // repo-relative path for server-side file reads
  // true = faceless mannequin card (SAFE to use — no real face to bleed onto the
  // customer). Only these are ever returned; real-person cards are never used.
  isMannequin?: boolean;
  // A generation-ready text description of the cut (shape/length/texture only, no
  // face/colour), pre-computed once per card (scripts/describe-all-cards). Generation
  // injects THIS instead of passing the card image — the "describe, don't copy the
  // image" pipeline, which stops the reference's head competing with the customer's.
  description?: string;
  styleSpec?: Record<string, string>; // structured fields behind the description
};

export const REFERENCES = raw as ReferenceEntry[];

// Tokens that appear in half the catalogue — matching on them means nothing, so
// they do not count toward a match score.
const GENERIC_TOKENS = new Set(["cut", "hair", "style", "mens", "men", "the", "and"]);

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** analysis hairLength → dataset length band. */
export function lengthBand(hairLength?: string): "short" | "medium" | "long" {
  const l = (hairLength ?? "").toLowerCase();
  if (l.includes("very_long") || l === "long") return "long";
  if (l.includes("medium")) return "medium";
  return "short";
}

const BAND_ORDER: Record<string, number> = { short: 0, medium: 1, long: 2 };

/**
 * The dataset's own style NAMES for a gender, up to a max length band. This is the
 * honest recommendation vocabulary: every name here has a real reference card and is
 * achievable at the customer's length or shorter. Giving the analysis THIS list —
 * instead of the tiny 22-style scoring table — is what stops it defaulting to
 * "textured crop" for everyone; it now has the full menu the salon can actually cut.
 */
export function styleNamesForGender(
  gender: "men" | "women" | null,
  maxBand: "short" | "medium" | "long" = "long"
): string[] {
  const max = BAND_ORDER[maxBand] ?? 2;
  const names = new Set<string>();
  for (const e of REFERENCES) {
    if (gender && e.gender !== gender) continue;
    if ((BAND_ORDER[e.length] ?? 2) > max) continue;
    names.add(e.name);
  }
  return [...names].sort();
}

export type ReferenceMatch = ReferenceEntry & { score: number; reason: string };

/**
 * Best reference image for a style. Returns null when nothing meaningful matches
 * (or the customer is female) so the caller can fall back to text-only generation.
 *
 * @param styleName  a feasibleStyles entry, e.g. "textured crop"
 * @param gender     analysis gender ("male"/"female") — matched to men/women cards
 * @param hairLength analysis hairLength, used only as a soft tie-breaker
 */
export function findReference(styleName: string, gender?: string, hairLength?: string): ReferenceMatch | null {
  if (!styleName) return null;

  const wantGender: "men" | "women" | null =
    (gender ?? "").toLowerCase().startsWith("f") ? "women" :
    (gender ?? "").toLowerCase().startsWith("m") ? "men" : null;

  const querySlug = slugify(styleName);
  const qTokens = tokens(styleName).filter((t) => !GENERIC_TOKENS.has(t));
  if (qTokens.length === 0) return null;

  const band = lengthBand(hairLength);

  let best: ReferenceMatch | null = null;
  for (const e of REFERENCES) {
    // SAFETY: only faceless mannequin/style cards (reference bucket). Real-person
    // cards bleed face/identity onto the customer, so they are never installed.
    if (!e.isMannequin) continue;
    // Match men's styles to men's cards, women's to women's.
    if (wantGender && e.gender !== wantGender) continue;

    const eTokens = new Set([...tokens(e.slug), ...tokens(e.name)].filter((t) => !GENERIC_TOKENS.has(t)));

    // Exact slug match is the strongest possible signal.
    const exact = e.slug === querySlug;
    const matched = qTokens.filter((t) => eTokens.has(t)).length;
    if (!exact && matched === 0) continue;

    // Base: fraction of the query's meaningful tokens found in this entry.
    let score = exact ? 1 : matched / qTokens.length;
    // Prefer the simplest name that still matches (fewer unrelated extra tokens).
    const extra = [...eTokens].filter((t) => !qTokens.includes(t)).length;
    score -= extra * 0.03;
    // Soft nudge toward the right length band.
    if (e.length === band) score += 0.05;

    if (!best || score > best.score) {
      best = { ...e, score, reason: exact ? "exact style match" : `matched ${matched}/${qTokens.length} terms` };
    }
  }

  // Require a real signal — a single weak token on a long name isn't enough.
  if (best && best.score < 0.34) return null;
  return best;
}
