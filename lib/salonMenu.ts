// Salon service menu — the priced rate card a salon actually books against.
//
// Seeded from the Green Trends "A25 Women" digital rate card and attached to the
// Fish Net Salon (see supabase/seed-salon-menu.sql). Prices are in ₹ and inclusive
// of taxes, exactly as printed on the card. Each service can have several priced
// variants (by hair length or staff seniority) and carries recommendation
// metadata (`kind` + `targets`) so lib/menuRecommender.ts can pick from the menu
// deterministically — no LLM call.
//
// NOTE: this file covers the HAIR services on the card (Hair Care, Hair Care
// Protocols, Texture Change, Colouring, and Haircut combos). The card's skin /
// nail / waxing / bridal pages are not transcribed here — those load through the
// menu importer instead (a salon owner pastes/uploads them). See the importer
// notes in the recommender docs.

export type MenuKind =
  | "haircut"
  | "styling"
  | "treatment"   // hair/scalp care protocols
  | "texture"     // straightening, rebonding, botox…
  | "colour"
  | "massage"
  | "combo"
  | "other";

// Condition tags a service addresses. These are matched against the customer's
// HairHealthAnswers (concern + scalpCondition) and HairAnalysis. Keep the
// vocabulary in sync with CONCERN_TARGETS / SCALP_TARGETS in menuRecommender.ts.
export type Target =
  | "dryness"
  | "frizz"
  | "hairfall"
  | "dandruff"
  | "oiliness"
  | "colour-damage"
  | "breakage"
  | "damage"
  | "scalp-sensitive"
  | "itchy-scalp"
  | "greying"
  | "volume"
  | "straightening"
  | "smoothening"
  | "shine"
  | "relax";

export type LengthBand = "short" | "medium" | "long" | "any";

export type PriceVariant = {
  label: string;          // "Upto Medium Length" | "Long" | "Regular" | "Senior" | "Artist" …
  price: number;          // regular price, ₹
  memberPrice?: number;   // member price, ₹ (omitted when same as price)
  lengthBand?: LengthBand; // used to auto-pick the right variant for a customer
};

export type MenuService = {
  id: string;
  category: string;       // top-level card section, e.g. "Hair Care Protocols"
  section: string;        // sub-heading, e.g. "Biolage Rituals"
  name: string;
  gender: "women" | "men" | "unisex";
  kind: MenuKind;
  variants: PriceVariant[];
  targets?: Target[];     // conditions/goals this service is good for
  note?: string;
};

// ── helpers ──────────────────────────────────────────────────────────────────
// Most protocol services are priced by two length tiers.
function byLength(medium: [number, number], long: [number, number]): PriceVariant[] {
  return [
    { label: "Upto Medium Length", price: medium[0], memberPrice: medium[1], lengthBand: "medium" },
    { label: "Long", price: long[0], memberPrice: long[1], lengthBand: "long" },
  ];
}
const flat = (price: number, memberPrice?: number): PriceVariant[] => [
  { label: "", price, memberPrice, lengthBand: "any" },
];

export const SALON_MENU: MenuService[] = [
  // ══ HAIR CARE ══════════════════════════════════════════════════════════════
  {
    id: "kids-girls-cut-basic", category: "Hair Care", section: "Kids Haircuts",
    name: "Girls Hair Cut - Basic (Below 10 yrs)", gender: "women", kind: "haircut",
    variants: flat(279, 239), note: "with shampoo & conditioner wash",
  },
  {
    id: "kids-girls-cut-makeover", category: "Hair Care", section: "Kids Haircuts",
    name: "Girls Cut - Makeover (Below 10 yrs)", gender: "women", kind: "haircut",
    variants: flat(389, 349), note: "with shampoo & conditioner wash",
  },
  {
    id: "cut-basic", category: "Hair Care", section: "Haircuts",
    name: "Basic Cut", gender: "women", kind: "haircut",
    variants: [{ label: "Stylist", price: 419, memberPrice: 349, lengthBand: "any" }],
    note: "with blast dry",
  },
  {
    id: "cut-basic-senior", category: "Hair Care", section: "Haircuts",
    name: "Basic Cut - Senior", gender: "women", kind: "haircut",
    variants: [{ label: "Senior", price: 639, memberPrice: 529, lengthBand: "any" }],
    note: "with blast dry",
  },
  {
    id: "cut-advanced", category: "Hair Care", section: "Haircuts",
    name: "Advanced Cut", gender: "women", kind: "haircut",
    variants: [{ label: "Stylist", price: 859, memberPrice: 709, lengthBand: "any" }],
    note: "with in-curls / out-curls blow dry",
  },
  {
    id: "cut-advanced-senior", category: "Hair Care", section: "Haircuts",
    name: "Advanced Cut - Senior", gender: "women", kind: "haircut",
    variants: [{ label: "Senior", price: 1129, memberPrice: 939, lengthBand: "any" }],
    note: "with in-curls / out-curls blow dry",
  },
  {
    id: "cut-change-of-style", category: "Hair Care", section: "Haircuts",
    name: "Change of Style", gender: "women", kind: "haircut",
    variants: [{ label: "Stylist", price: 1209, memberPrice: 1009, lengthBand: "any" }],
    note: "with in-curls / out-curls blow dry",
  },
  {
    id: "cut-change-of-style-senior", category: "Hair Care", section: "Haircuts",
    name: "Change of Style - Senior", gender: "women", kind: "haircut",
    variants: [{ label: "Senior", price: 1599, memberPrice: 1329, lengthBand: "any" }],
    note: "with in-curls / out-curls blow dry",
  },

  // ── Styling & Party Makeovers ──
  {
    id: "shampoo-conditioning", category: "Hair Care", section: "Styling & Party Makeovers",
    name: "Shampoo and Conditioning (Blast Dry)", gender: "women", kind: "styling",
    variants: byLength([399, 329], [509, 419]),
  },
  {
    id: "blow-styling", category: "Hair Care", section: "Styling & Party Makeovers",
    name: "Blow Styling with Shampoo & Conditioning", gender: "women", kind: "styling",
    variants: byLength([659, 539], [869, 719]),
  },
  {
    id: "ironing", category: "Hair Care", section: "Styling & Party Makeovers",
    name: "Ironing", gender: "women", kind: "styling", targets: ["smoothening", "frizz"],
    variants: byLength([1199, 999], [1469, 1219]),
  },
  {
    id: "roller-setting", category: "Hair Care", section: "Styling & Party Makeovers",
    name: "Roller Setting", gender: "women", kind: "styling", targets: ["volume"],
    variants: flat(1319, 1099),
  },
  {
    id: "party-makeup", category: "Hair Care", section: "Styling & Party Makeovers",
    name: "Party Makeup", gender: "women", kind: "styling",
    variants: [
      { label: "Artist", price: 1719, memberPrice: 1719, lengthBand: "any" },
      { label: "Sr. Artist", price: 2289, memberPrice: 2289, lengthBand: "any" },
      { label: "Expert", price: 2859, memberPrice: 2859, lengthBand: "any" },
    ],
  },

  // ══ HAIR CARE PROTOCOLS ════════════════════════════════════════════════════
  // ── Biolage Rituals ──
  {
    id: "biolage-scalp-cleanup", category: "Hair Care Protocols", section: "Biolage Rituals",
    name: "Rejuvenating Scalp Clean Up", gender: "women", kind: "treatment",
    targets: ["oiliness", "itchy-scalp", "dandruff"], variants: byLength([1199, 999], [1439, 1199]),
  },
  {
    id: "biolage-anti-frizz", category: "Hair Care Protocols", section: "Biolage Rituals",
    name: "Anti Frizz Ritual", gender: "women", kind: "treatment",
    targets: ["frizz"], variants: byLength([1559, 1299], [1799, 1499]),
  },
  {
    id: "biolage-deep-hydration", category: "Hair Care Protocols", section: "Biolage Rituals",
    name: "Deep Hydration Ritual", gender: "women", kind: "treatment",
    targets: ["dryness"], variants: byLength([1559, 1299], [1799, 1499]),
  },
  {
    id: "biolage-color-last", category: "Hair Care Protocols", section: "Biolage Rituals",
    name: "Color Last Ritual", gender: "women", kind: "treatment",
    targets: ["colour-damage"], variants: byLength([1559, 1299], [1799, 1499]),
  },
  {
    id: "biolage-follicle-fortifying", category: "Hair Care Protocols", section: "Biolage Rituals",
    name: "Follicle Fortifying Infusion", gender: "women", kind: "treatment",
    targets: ["hairfall"], variants: byLength([2039, 1699], [2399, 1999]),
  },
  {
    id: "biolage-scalp-facial", category: "Hair Care Protocols", section: "Biolage Rituals",
    name: "Rejuvenating Scalp Facial", gender: "women", kind: "treatment",
    targets: ["itchy-scalp", "dandruff", "oiliness"], variants: byLength([2279, 1899], [2639, 2199]),
  },

  // ── L'Oréal ──
  {
    id: "loreal-hair-spa", category: "Hair Care Protocols", section: "L'Oréal",
    name: "L'Oréal Hair Spa", gender: "women", kind: "treatment",
    targets: ["dryness", "relax"], variants: byLength([1439, 1199], [1779, 1489]),
    note: "3+1 free offer available",
  },
  {
    id: "loreal-mentho-burst", category: "Hair Care Protocols", section: "L'Oréal",
    name: "Mentho Burst Spa", gender: "women", kind: "treatment",
    targets: ["oiliness", "itchy-scalp", "relax"], variants: byLength([1849, 1539], [2129, 1769]),
  },
  {
    id: "loreal-color-sealing", category: "Hair Care Protocols", section: "L'Oréal",
    name: "L'Oréal Color Sealing Treatment", gender: "women", kind: "treatment",
    targets: ["colour-damage"], variants: byLength([2469, 2059], [3019, 2519]),
  },
  {
    id: "loreal-deep-nourishing", category: "Hair Care Protocols", section: "L'Oréal",
    name: "L'Oréal Deep Nourishing Treatment", gender: "women", kind: "treatment",
    targets: ["dryness", "damage"], variants: byLength([2469, 2059], [3019, 2519]),
  },
  {
    id: "loreal-frizz-control", category: "Hair Care Protocols", section: "L'Oréal",
    name: "L'Oréal Frizz Control Treatment", gender: "women", kind: "treatment",
    targets: ["frizz"], variants: byLength([2469, 2059], [3019, 2519]),
  },
  {
    id: "loreal-scalp-soothing", category: "Hair Care Protocols", section: "L'Oréal",
    name: "L'Oréal Scalp Soothing Treatment", gender: "women", kind: "treatment",
    targets: ["scalp-sensitive", "itchy-scalp"], variants: byLength([2469, 2059], [3019, 2519]),
  },

  // ══ LUXURY HAIR CARE PROTOCOLS ═════════════════════════════════════════════
  // ── Wellaplex ──
  {
    id: "wellaplex-restore-rebuild", category: "Luxury Hair Care Protocols", section: "Wellaplex",
    name: "Restore & Rebuild", gender: "women", kind: "treatment",
    targets: ["damage", "breakage"], variants: byLength([2329, 1999], [2679, 2299]),
  },
  {
    id: "wellaplex-sleek-strong", category: "Luxury Hair Care Protocols", section: "Wellaplex",
    name: "Sleek & Strong", gender: "women", kind: "treatment",
    targets: ["frizz", "breakage"], variants: byLength([2329, 1999], [2679, 2299]),
  },

  // ── System Professional ──
  {
    id: "sp-essential", category: "Luxury Hair Care Protocols", section: "System Professional",
    name: "Essential Service", gender: "women", kind: "treatment",
    targets: ["dryness"], variants: byLength([3429, 2859], [3839, 3199]),
  },
  {
    id: "sp-regenerate", category: "Luxury Hair Care Protocols", section: "System Professional",
    name: "Regenerate Service", gender: "women", kind: "treatment",
    targets: ["damage", "breakage"], variants: byLength([3429, 2859], [3839, 3199]),
  },
  {
    id: "sp-elixir-pro", category: "Luxury Hair Care Protocols", section: "System Professional",
    name: "Elixir Pro - Luxe Oil Treatment", gender: "women", kind: "treatment",
    targets: ["dryness", "frizz", "shine"], variants: byLength([3429, 2859], [3839, 3199]),
  },
  {
    id: "sp-anti-hair-loss", category: "Luxury Hair Care Protocols", section: "System Professional",
    name: "Anti Hair Loss", gender: "women", kind: "treatment",
    targets: ["hairfall"], variants: byLength([4069, 3389], [4669, 3889]),
  },
  {
    id: "sp-shampeeling", category: "Luxury Hair Care Protocols", section: "System Professional",
    name: "Shampeeling", gender: "women", kind: "treatment",
    targets: ["oiliness", "itchy-scalp"], variants: byLength([4069, 3389], [4669, 3889]),
  },
  // Booster add-ons (single price)
  {
    id: "boost-shampeeling", category: "Luxury Hair Care Protocols", section: "Booster Services",
    name: "Shampeeling (Booster)", gender: "women", kind: "treatment",
    targets: ["oiliness", "itchy-scalp"], variants: flat(1299, 1089),
  },
  {
    id: "boost-alpha-energy", category: "Luxury Hair Care Protocols", section: "Booster Services",
    name: "Alpha Energy", gender: "women", kind: "treatment",
    targets: ["hairfall", "volume"], variants: flat(1299, 1089),
  },
  {
    id: "boost-molecular-refilling", category: "Luxury Hair Care Protocols", section: "Booster Services",
    name: "Molecular Hair Refilling", gender: "women", kind: "treatment",
    targets: ["damage", "breakage"], variants: flat(1299, 1089),
  },
  {
    id: "boost-elastic-force", category: "Luxury Hair Care Protocols", section: "Booster Services",
    name: "Elastic Force", gender: "women", kind: "treatment",
    targets: ["breakage", "damage"], variants: flat(1299, 1089),
  },
  {
    id: "boost-scalp-energy-serum", category: "Luxury Hair Care Protocols", section: "Booster Services",
    name: "Balance Scalp Energy Serum", gender: "women", kind: "treatment",
    targets: ["itchy-scalp", "oiliness", "scalp-sensitive"], variants: flat(2059, 1719),
  },
  {
    id: "boost-color-lock", category: "Luxury Hair Care Protocols", section: "Booster Services",
    name: "Color Lock", gender: "women", kind: "treatment",
    targets: ["colour-damage"], variants: flat(2059, 1719),
  },

  // ══ HAIR GROWTH ACTIVATOR & HAIR LOSS CONTROL ══════════════════════════════
  {
    id: "aminexil-anti-hair-fall", category: "Hair Growth & Loss Control", section: "Hair Loss Control",
    name: "Aminexil Anti Hair Fall Treatment", gender: "women", kind: "treatment",
    targets: ["hairfall"], variants: byLength([3089, 2569], [3839, 3199]),
  },
  {
    id: "serioxyl-density-activator", category: "Hair Growth & Loss Control", section: "Hair Loss Control",
    name: "Serioxyl Hair Density Activator Treatment", gender: "women", kind: "treatment",
    targets: ["hairfall", "volume"], variants: byLength([3089, 2569], [3839, 3199]),
  },
  {
    id: "anti-dandruff", category: "Hair Growth & Loss Control", section: "Dandruff Control",
    name: "Anti Dandruff Treatment", gender: "women", kind: "treatment",
    targets: ["dandruff", "itchy-scalp"], variants: byLength([2469, 2059], [3019, 2519]),
  },

  // ══ HEAD MASSAGE ═══════════════════════════════════════════════════════════
  {
    id: "massage-coconut", category: "Head Massage", section: "Head Massage",
    name: "Pure Coconut Nourisher", gender: "unisex", kind: "massage",
    targets: ["dryness", "relax"], variants: flat(859, 709), note: "with shampoo & conditioner wash",
  },
  {
    id: "massage-menthol", category: "Head Massage", section: "Head Massage",
    name: "Menthol Chiller", gender: "unisex", kind: "massage",
    targets: ["oiliness", "itchy-scalp", "relax"], variants: flat(859, 709), note: "with shampoo & conditioner wash",
  },
  {
    id: "massage-olive", category: "Head Massage", section: "Head Massage",
    name: "Olive Bliss", gender: "unisex", kind: "massage",
    targets: ["dryness", "relax"], variants: flat(859, 709), note: "with shampoo & conditioner wash",
  },

  // ══ TEXTURE CHANGE TREATMENTS ══════════════════════════════════════════════
  {
    id: "straightening-smoothening", category: "Texture Change", section: "Permanent Straight Hair",
    name: "Straightening / Smoothening", gender: "women", kind: "texture",
    targets: ["straightening", "smoothening", "frizz"], variants: byLength([7269, 6049], [10439, 8699]),
    note: "wavy hair texture change · result lasts till re-growth",
  },
  {
    id: "rebonding", category: "Texture Change", section: "Permanent Straight Hair",
    name: "Rebonding", gender: "women", kind: "texture",
    targets: ["straightening", "smoothening"], variants: byLength([9529, 7939], [13729, 11439]),
    note: "curly hair texture change · result lasts till re-growth",
  },
  {
    id: "protein-hair-botox", category: "Texture Change", section: "Natural Straight Hair Texture",
    name: "Protein Hair Botox", gender: "women", kind: "texture",
    targets: ["damage", "frizz", "shine"], variants: byLength([8559, 7129], [10919, 9099]),
  },
  {
    id: "nanoplastia", category: "Texture Change", section: "Natural Straight Hair Texture",
    name: "Nanoplastia Silky Shine Treatment", gender: "women", kind: "texture",
    targets: ["frizz", "smoothening", "shine"], variants: byLength([8559, 7129], [10919, 9099]),
  },

  // ══ COLOURING - HAIR ═══════════════════════════════════════════════════════
  {
    id: "colour-root-touchup-krone", category: "Colouring", section: "Root Touch-up",
    name: "Root Touch-up - Krone (Ammonia Free)", gender: "women", kind: "colour",
    targets: ["greying"], variants: flat(1169, 969),
  },
  {
    id: "colour-root-touchup-regular", category: "Colouring", section: "Root Touch-up",
    name: "Root Touch-up - Regular", gender: "women", kind: "colour",
    targets: ["greying"], variants: flat(1399, 1149),
  },
  {
    id: "colour-root-touchup-af", category: "Colouring", section: "Root Touch-up",
    name: "Root Touch-up - Ammonia Free", gender: "women", kind: "colour",
    targets: ["greying"], variants: flat(2019, 1679),
  },
  {
    id: "colour-global-regular", category: "Colouring", section: "Global Colouring",
    name: "Global Colouring - Regular", gender: "women", kind: "colour",
    targets: ["greying"], variants: byLength([3489, 2909], [4809, 3999]),
  },
  {
    id: "colour-global-krone", category: "Colouring", section: "Global Colouring",
    name: "Global Colouring - Krone (Ammonia Free)", gender: "women", kind: "colour",
    targets: ["greying"], variants: byLength([3659, 3039], [4749, 3959]),
  },
  {
    id: "colour-global-af", category: "Colouring", section: "Global Colouring",
    name: "Global Colouring - Ammonia Free", gender: "women", kind: "colour",
    targets: ["greying"], variants: byLength([4829, 4019], [6819, 5679]),
  },
  // ── Fashion Colouring ──
  {
    id: "colour-streaks", category: "Colouring", section: "Fashion Colouring",
    name: "Streaks (per streak)", gender: "women", kind: "colour", variants: flat(379, 309),
  },
  {
    id: "colour-advanced-streaks", category: "Colouring", section: "Fashion Colouring",
    name: "Advanced Streaks (per streak, min 6)", gender: "women", kind: "colour", variants: flat(609, 499),
  },
  {
    id: "colour-partial-highlights", category: "Colouring", section: "Fashion Colouring",
    name: "Partial Highlights (12 streaks)", gender: "women", kind: "colour", variants: flat(4119, 3429),
  },
  {
    id: "colour-full-highlights", category: "Colouring", section: "Fashion Colouring",
    name: "Full Highlights (18 streaks)", gender: "women", kind: "colour", variants: flat(5489, 4579),
  },
  {
    id: "colour-creative", category: "Colouring", section: "Fashion Colouring",
    name: "Creative Colouring (Global + Partial Highlights)", gender: "women", kind: "colour",
    variants: byLength([7549, 6289], [8929, 7439]),
  },
  {
    id: "colour-advanced-creative", category: "Colouring", section: "Fashion Colouring",
    name: "Advanced Creative Colouring (Global + Full Highlights)", gender: "women", kind: "colour",
    variants: byLength([8929, 7439], [10299, 8579]),
  },
  {
    id: "colour-balayage-ombre", category: "Colouring", section: "Fashion Colouring",
    name: "Balayage / Ombre", gender: "women", kind: "colour",
    variants: byLength([11089, 8869], [12869, 10299]),
  },

  // ══ HAIRCUT COMBOS (Beauty Unlock) ═════════════════════════════════════════
  {
    id: "combo-cut-cleanup", category: "Combos", section: "Haircut Combos",
    name: "Haircut Change of Style + Skin Lightening Face Cleanup", gender: "women", kind: "combo",
    variants: [
      { label: "Regular", price: 1748, memberPrice: 1469, lengthBand: "any" },
      { label: "Senior", price: 2068, memberPrice: 1739, lengthBand: "any" },
    ],
    note: "save up to 20% · combo code WH1-WH1SR",
  },
  {
    id: "combo-cut-hairspa", category: "Combos", section: "Haircut Combos",
    name: "Haircut Change of Style + L'Oréal Hair Spa (Medium)", gender: "women", kind: "combo",
    targets: ["dryness"],
    variants: [
      { label: "Regular", price: 2208, memberPrice: 1849, lengthBand: "any" },
      { label: "Senior", price: 2528, memberPrice: 2119, lengthBand: "any" },
    ],
    note: "save up to 20% · combo code WH3-WH3SR",
  },
  {
    id: "combo-cut-deep-nourishing", category: "Combos", section: "Haircut Combos",
    name: "Haircut Change of Style + L'Oréal Deep Nourishing Treatment (Medium)", gender: "women", kind: "combo",
    targets: ["dryness", "damage"],
    variants: [
      { label: "Regular", price: 3068, memberPrice: 2579, lengthBand: "any" },
      { label: "Senior", price: 3388, memberPrice: 2849, lengthBand: "any" },
    ],
    note: "save up to 20% · combo code WH4-WH4SR",
  },
];

// ── lookups ──────────────────────────────────────────────────────────────────
export function getServiceById(id: string): MenuService | undefined {
  return SALON_MENU.find((s) => s.id === id);
}

export function servicesByKind(kind: MenuKind): MenuService[] {
  return SALON_MENU.filter((s) => s.kind === kind);
}

/** Pick the variant that fits a customer's hair-length band, falling back sensibly. */
export function variantForLength(service: MenuService, band: LengthBand): PriceVariant {
  return (
    service.variants.find((v) => v.lengthBand === band) ??
    service.variants.find((v) => v.lengthBand === "any") ??
    service.variants[0]
  );
}
