// Combo & treatment recommender — DATA + PURE LOGIC ONLY.
//
// ⚠️ NOT WIRED INTO ANYTHING YET (by request). This just defines the rules and a
// recommendCombos(analysis) function. Nothing imports it until we agree the rules
// and where it should surface (results screen? bill upsell? both?).
//
// It maps the hair analysis → suggested service COMBOS (e.g. Haircut + Beard) and
// TREATMENTS (e.g. Keratin for frizz), each with the reason it was triggered, so the
// salon can upsell what actually fits the customer. Service names match
// lib/billing.ts SERVICE_CATALOG so they can later drop straight onto the bill.

export type ComboKind = "combo" | "treatment";

export type ComboSuggestion = {
  id: string;
  name: string;
  kind: ComboKind;
  services: string[];  // names from SERVICE_CATALOG
  whatItDoes: string;  // plain description of the service itself
  reason: string;      // why it suits THIS customer, from the analysis
  priority: number;    // higher = show first
};

// Only the analysis fields the rules read — kept local so this file couples to nothing.
export type AnalysisLike = {
  gender?: string;
  hairTexture?: string;   // straight | wavy | curly | coily
  hairDensity?: string;   // thin | medium | thick
  hairLength?: string;
  hairlineShape?: string; // ... | receding | m-shaped | thinning
  hairlineNotes?: string;
  skinTone?: string;      // ... | tan | brown | deep
  freshCut?: boolean;     // true = already freshly cut
  suggestedColors?: { color: string }[];
};

const has = (v: string | undefined, ...opts: string[]) =>
  !!v && opts.some((o) => v.toLowerCase().includes(o));

/**
 * Ranked combo/treatment suggestions for a customer's analysis. Each rule is
 * independent; the ones whose condition matches are returned, highest priority first.
 */
export function recommendCombos(a: AnalysisLike): ComboSuggestion[] {
  const out: ComboSuggestion[] = [];
  const male = has(a.gender, "m") && !has(a.gender, "f");
  const frizzy = has(a.hairTexture, "wavy", "curly", "coily");
  const thin = has(a.hairDensity, "thin");
  const receding = has(a.hairlineShape, "receding", "m-shaped", "thinning") || has(a.hairlineNotes, "reced", "thinning");
  const tan = has(a.skinTone, "tan", "brown", "deep");

  // 1. Hair + Beard — the classic men's combo.
  if (male) out.push({
    id: "hair-beard", name: "Haircut + Beard Grooming", kind: "combo",
    services: ["Haircut", "Beard trim"],
    whatItDoes: "Cuts and styles the hair, then trims and lines up the beard to match.",
    reason: "A matching beard shape finishes the haircut and frames the face.",
    priority: 90,
  });

  // 2. Hair + Colour — if they already look freshly cut, colour is the better upsell
  //    (they don't need another cut); otherwise it's a style refresh.
  out.push({
    id: "hair-colour", name: a.freshCut ? "Colour (skip the cut — already fresh)" : "Haircut + Colour", kind: "combo",
    services: a.freshCut ? ["Hair colour"] : ["Haircut", "Hair colour"],
    whatItDoes: "Applies a professional hair colour" + (a.freshCut ? "." : " along with the cut."),
    reason: a.freshCut
      ? "Their cut is still fresh, so a colour refresh adds the biggest change without cutting."
      : (a.suggestedColors?.[0]?.color ? `${a.suggestedColors[0].color} would suit their skin tone.` : "A flattering colour lifts the whole look."),
    priority: a.freshCut ? 85 : 70,
  });

  // 3. Keratin / smoothening — for frizz-prone wavy/curly hair.
  if (frizzy) out.push({
    id: "keratin", name: "Keratin Smoothening", kind: "treatment",
    services: ["Keratin"],
    whatItDoes: "A smoothing treatment that coats the hair in keratin protein to relax frizz and make hair sleek and manageable for months.",
    reason: "Wavy/curly texture is frizz-prone — keratin smooths it and cuts daily styling time.",
    priority: 75,
  });

  // 4. Hair spa — nourishment for thin / dry hair.
  if (thin) out.push({
    id: "hair-spa", name: "Hair Spa", kind: "treatment",
    services: ["Hair spa"],
    whatItDoes: "A deep-conditioning scalp-and-hair spa that cleanses, hydrates and nourishes to add softness and body.",
    reason: "Thinner hair benefits from a nourishing spa to add body and scalp health.",
    priority: 60,
  });

  // 5. Scalp / anti-hairfall — for a receding or thinning hairline.
  if (receding) out.push({
    id: "scalp", name: "Scalp & Anti-Hairfall Treatment", kind: "treatment",
    services: ["Head massage", "Hair spa"],
    whatItDoes: "A stimulating scalp massage plus a nourishing spa that boosts blood flow to the roots and strengthens the hair base.",
    reason: "Signs of a receding/thinning hairline — a scalp treatment supports the roots.",
    priority: 65,
  });

  // 6. D-Tan / cleanup — grooming add-on that pairs with a cut, esp. tanned skin.
  if (tan) out.push({
    id: "dtan", name: "D-Tan / Face Cleanup", kind: "treatment",
    services: ["D-Tan"],
    whatItDoes: "A de-tan facial cleanup that removes tan and dead skin to brighten and even the complexion.",
    reason: "Evens out tan and brightens the skin to match a fresh haircut.",
    priority: 40,
  });

  // 7. Wash + style finish — universal light add-on.
  out.push({
    id: "wash-style", name: "Wash + Blow-dry Finish", kind: "combo",
    services: ["Shampoo & wash", "Blow-dry / styling"],
    whatItDoes: "A shampoo wash followed by a blow-dry and styling to set the finished look.",
    reason: "A wash and blow-dry shows the new look at its best before they leave.",
    priority: 30,
  });

  return out.sort((x, y) => y.priority - x.priority);
}
