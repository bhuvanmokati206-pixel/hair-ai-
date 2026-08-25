// Menu recommender — picks bookable services from a salon's own menu for a given
// customer. Fully deterministic: no LLM / no Claude call. It combines two inputs
// the app already collects:
//
//   • HairAnalysis     (from the photo scan) — length, texture, density, colour
//   • HairHealthAnswers (from the health wizard) — concerns + scalp conditions
//
// and returns a haircut service tier + condition-matched treatment(s) + a colour
// suggestion when relevant, each with the real menu price, plus a ticket total.
//
// The matching is tag-based: every menu service carries `targets` (see
// lib/salonMenu.ts); we translate the customer's answers into the same tag
// vocabulary and intersect. That keeps recommendations explainable ("suggested
// because you selected Dandruff") and free to run.

import type { HairAnalysis } from "@/components/HairAIAutomation";
import type { HairHealthAnswers } from "@/app/api/hair-health/route";
import {
  SALON_MENU,
  variantForLength,
  type MenuService,
  type PriceVariant,
  type Target,
  type LengthBand,
} from "@/lib/salonMenu";

// Map the wizard's `concern` labels → menu target tags.
const CONCERN_TARGETS: Record<string, Target[]> = {
  Dryness: ["dryness"],
  Frizz: ["frizz", "smoothening"],
  "Hair fall": ["hairfall"],
  Dandruff: ["dandruff", "itchy-scalp"],
  Oiliness: ["oiliness"],
  "Colour damage": ["colour-damage", "damage"],
  Breakage: ["breakage", "damage"],
};

// Map the wizard's `scalpCondition` labels → menu target tags.
const SCALP_TARGETS: Record<string, Target[]> = {
  "Itchy scalp": ["itchy-scalp"],
  "Flaky / Dandruff": ["dandruff", "itchy-scalp"],
  "Oily scalp": ["oiliness"],
  "Sensitive scalp": ["scalp-sensitive"],
};

export type ServicePick = {
  service: MenuService;
  variant: PriceVariant;
  reason: string;
  matchedTargets: Target[];
};

export type MenuRecommendation = {
  lengthBand: LengthBand;
  haircut?: ServicePick;
  treatments: ServicePick[];
  colour?: ServicePick;
  /** Ticket totals across all picks, in ₹. */
  total: number;
  memberTotal: number;
};

// analysis.hairLength → menu length band.
function lengthBandOf(analysis: HairAnalysis): LengthBand {
  const l = (analysis.hairLength ?? "").toLowerCase();
  if (l.includes("very_long") || l === "long") return "long";
  if (l.includes("medium")) return "medium";
  if (l.includes("short")) return "short";
  return "medium";
}

// Collect the customer's condition tags from both wizard answers and the scan.
function customerTargets(analysis: HairAnalysis, health?: HairHealthAnswers): Set<Target> {
  const tags = new Set<Target>();
  const add = (arr?: Target[]) => arr?.forEach((t) => tags.add(t));

  for (const c of health?.concern ?? []) add(CONCERN_TARGETS[c]);
  for (const s of health?.scalpCondition ?? []) add(SCALP_TARGETS[s]);

  // Signals inferable from the photo analysis.
  const colour = (analysis.hairColor ?? "").toLowerCase();
  if (colour.includes("grey") || colour.includes("gray") || colour.includes("white")) {
    tags.add("greying");
  }
  const texture = (analysis.hairTexture ?? "").toLowerCase();
  if (texture.includes("frizz")) tags.add("frizz");

  return tags;
}

function labelFor(tags: Target[]): string {
  const nice: Partial<Record<Target, string>> = {
    dryness: "dryness", frizz: "frizz", hairfall: "hair fall", dandruff: "dandruff",
    oiliness: "oily scalp", "colour-damage": "colour damage", breakage: "breakage",
    damage: "damage", "scalp-sensitive": "sensitive scalp", "itchy-scalp": "itchy scalp",
    greying: "greys", volume: "thin hair", straightening: "straightening",
    smoothening: "smoothening", shine: "shine", relax: "relaxation",
  };
  return tags.map((t) => nice[t] ?? t).join(", ");
}

/**
 * Build a recommendation from the salon's menu.
 * @param menu  the salon's services (defaults to the bundled Fish Net menu).
 * @param opts.maxTreatments  cap on treatment picks (default 2).
 * @param opts.useMemberPrice which price drives ranking/notes (default false).
 */
export function recommendFromMenu(
  analysis: HairAnalysis,
  health?: HairHealthAnswers,
  menu: MenuService[] = SALON_MENU,
  opts: { maxTreatments?: number; gender?: "women" | "men" | "unisex" } = {},
): MenuRecommendation {
  const band = lengthBandOf(analysis);
  const wanted = customerTargets(analysis, health);
  const gender = opts.gender ?? (analysis.gender === "male" ? "men" : "women");
  const maxTreatments = opts.maxTreatments ?? 2;

  const eligible = menu.filter((s) => s.gender === gender || s.gender === "unisex");

  // ── Haircut: default to a sensible bookable tier. Change-of-style when the
  // scan says the customer is switching looks, else the standard advanced cut. ──
  const wantsNewLook =
    !!analysis.bestMatch &&
    !!analysis.currentStyle &&
    !analysis.currentStyle.toLowerCase().includes((analysis.bestMatch ?? "").toLowerCase());
  const haircutId = wantsNewLook ? "cut-change-of-style" : "cut-advanced";
  const haircutSvc = eligible.find((s) => s.id === haircutId) ?? eligible.find((s) => s.kind === "haircut");
  const haircut: ServicePick | undefined = haircutSvc && {
    service: haircutSvc,
    variant: variantForLength(haircutSvc, band),
    matchedTargets: [],
    reason: wantsNewLook
      ? `To move from “${analysis.currentStyle}” to “${analysis.bestMatch}”.`
      : `A precision cut to shape “${analysis.bestMatch || "your style"}”.`,
  };

  // ── Treatments: greedy set-cover so picks spread ACROSS the customer's distinct
  // concerns instead of piling several onto the same one. Each round picks the
  // service covering the most still-uncovered conditions (cheaper wins ties). ──
  const candidates = eligible.filter(
    (s) => s.kind === "treatment" || s.kind === "texture" || s.kind === "massage",
  );
  const treatments: ServicePick[] = [];
  const uncovered = new Set(wanted);
  const usedIds = new Set<string>();
  while (treatments.length < maxTreatments && uncovered.size > 0) {
    let best: { s: MenuService; matched: Target[] } | undefined;
    for (const s of candidates) {
      if (usedIds.has(s.id)) continue;
      const matched = (s.targets ?? []).filter((t) => uncovered.has(t));
      if (matched.length === 0) continue;
      if (
        !best ||
        matched.length > best.matched.length ||
        (matched.length === best.matched.length && pickPrice(s, band) < pickPrice(best.s, band))
      ) {
        best = { s, matched };
      }
    }
    if (!best) break;
    usedIds.add(best.s.id);
    best.matched.forEach((t) => uncovered.delete(t));
    treatments.push({
      service: best.s,
      variant: variantForLength(best.s, band),
      matchedTargets: best.matched,
      reason: `Recommended for your ${labelFor(best.matched)}.`,
    });
  }

  // ── Colour: only if greying is a signal. Cheapest matching colour service. ──
  let colour: ServicePick | undefined;
  if (wanted.has("greying")) {
    const c = eligible
      .filter((s) => s.kind === "colour" && (s.targets ?? []).includes("greying"))
      .sort((a, b) => pickPrice(a, band) - pickPrice(b, band))[0];
    if (c) {
      colour = {
        service: c,
        variant: variantForLength(c, band),
        matchedTargets: ["greying"],
        reason: "Covers greys visible in your scan.",
      };
    }
  }

  const picks = [haircut, ...treatments, colour].filter(Boolean) as ServicePick[];
  const total = picks.reduce((sum, p) => sum + p.variant.price, 0);
  const memberTotal = picks.reduce((sum, p) => sum + (p.variant.memberPrice ?? p.variant.price), 0);

  return { lengthBand: band, haircut, treatments, colour, total, memberTotal };
}

function pickPrice(s: MenuService, band: LengthBand): number {
  return variantForLength(s, band).price;
}
