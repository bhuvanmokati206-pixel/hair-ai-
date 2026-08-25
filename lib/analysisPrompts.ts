// Hair-analysis prompt registry + two-pass router.
//
// Two ways to run:
//  • MANUAL — pass an explicit version ("p1" | "p2"). One Gemini call. For testing.
//  • AUTO   — the default. A cheap pass-1 classifier reads gender + length band,
//    then the matching SPECIALISED prompt runs the full analysis. Two calls, but
//    each specialised prompt is tuned for one hair type, so the read is sharper
//    than one generic prompt stretched across everyone.
//
// Rules for any prompt here:
//  • It MUST return every key in the P1 JSON shape — the scoring engine
//    (compatibilityEngine.ts) and the UI read those keys by name. Add keys freely,
//    never rename or drop the existing ones. Always keep topCm/sideCm/napeCm:
//    scoreStyles() reads exactly those three.

export type PromptVersion = "p1" | "p2";
export type Category =
  | "male-short" | "male-medium" | "male-long"
  | "female-short" | "female-medium" | "female-long";

export type AnalysisPromptContext = {
  knownStyles: string[];
  // Optional block from the customer preference questionnaire (lib/preferences.ts).
  // Empty/absent = analyse on hair alone, exactly as before the questionnaire existed.
  preferenceBlock?: string;
};

export type PromptDef = {
  id: PromptVersion;
  label: string;
  summary: string;
  build: (ctx: AnalysisPromptContext) => string;
};

// ── Shared building blocks ──────────────────────────────────────────────────────

// The style-naming rules + colour ask. One copy so every prompt stays
// answer-compatible with the scoring engine and UI.
function styleNamingBlock(knownStyles: string[]): string {
  return `Then provide EXACTLY 6 distinct hairstyles that suit this person AND are achievable with their CURRENT length or shorter (never require more length than observed). Match men's vs women's styles to the gender. "bestMatch" must be copied verbatim from one of the 6 feasibleStyles.

BE HONEST AND SPECIFIC — this is the most important rule. Judge THIS person's actual face shape, hair texture, density and length, and pick the 6 styles that genuinely suit THEM. Do NOT fall back on the same safe answer every time. "textured crop" is NOT the automatic best match — only pick it if it truly fits better than the alternatives. Two different people should usually get different recommendations. Make real use of the whole list below; pick varied, distinct styles, not six near-identical crops.

STYLE NAMING — choose from these exact names (spelled exactly as written), which are the styles the salon can actually cut and show a reference for:
${knownStyles.join(", ")}
Pick the 6 that best fit this specific person from that list. Only invent a name if nothing in the list fits at all, and then keep it to 2-3 words.
Then suggest EXACTLY 3 hair colours that flatter their skin tone + undertone (avoid their current colour). For EACH colour give: reason (why it suits THIS person's skin tone + features), process (single-process | needs bleaching | multi-step lift), and sessions = how many salon visits to reach it from their CURRENT observed hair colour — a similar or darker shade is 1 session; a lighter shade that needs bleaching/lifting is 2-3 sessions depending on how light.`;
}

// The full JSON envelope for the 6-zone prompts (P2 + all specialised prompts).
const SIX_ZONE_JSON = `Return ONLY valid JSON, no markdown, with EXACTLY these keys:
{
  "gender": "...",
  "skinTone": "...",
  "undertone": "...",
  "hairLength": "longest zone (very_short|short|medium|long|very_long)",
  "hairMeasurements": {
    "topLength": "very_short|short|medium|long|very_long",
    "sideLength": "very_short|short|medium|long|very_long",
    "napeLength": "very_short|short|medium|long|very_long",
    "topCm": "~Xcm",
    "sideCm": "~Xcm",
    "napeCm": "~Xcm",
    "frontLength": "very_short|short|medium|long|very_long",
    "leftSideLength": "very_short|short|medium|long|very_long",
    "rightSideLength": "very_short|short|medium|long|very_long",
    "crownLength": "very_short|short|medium|long|very_long",
    "frontCm": "~Xcm",
    "leftSideCm": "~Xcm",
    "rightSideCm": "~Xcm",
    "crownCm": "~Xcm"
  },
  "hairDensity": "thin|medium|thick",
  "hairTexture": "...",
  "hairColor": "...",
  "hairlineShape": "straight|rounded|m-shaped|widows-peak|receding|uneven",
  "hairlineNotes": "one short phrase on recession/forehead, or empty",
  "freshCut": true,
  "freshCutNotes": "why it does or doesn't look freshly cut",
  "faceShape": "...",
  "faceLength": "...",
  "currentStyle": "short description of their current haircut",
  "feasibleStyles": ["s1","s2","s3","s4","s5","s6"],
  "bestMatch": "one of feasibleStyles verbatim",
  "bestMatchReason": "1-2 sentences specific to this person's face + hair",
  "suggestedColors": [
    { "color": "...", "reason": "why it suits them", "process": "single-process|needs bleaching|multi-step lift", "sessions": "1|2|2-3" },
    { "color": "...", "reason": "...", "process": "...", "sessions": "..." },
    { "color": "...", "reason": "...", "process": "...", "sessions": "..." }
  ],
  "stylingTips": "practical tip for the bestMatch style"
}`;

// The 6-zone base. `expertFocus` is where a specialised prompt injects the
// hair-type-specific instructions that make its read sharper than the generic one.
// `preferenceBlock` carries the customer's questionnaire answers.
function build6Zone(knownStyles: string[], expertFocus = "", preferenceBlock = ""): string {
  return `You are a professional hairstylist and colour specialist. The image is ONE picture containing up to 4 photos of the SAME person arranged in a 2x2 grid (a "Shared Hair Blueprint"):
- TOP-LEFT    = 0°   front view    — face shape, skin tone, current style, front/fringe length, crown height
- TOP-RIGHT   = 90°  left profile  — LEFT side length (ear to tip), sideburn, texture
- BOTTOM-LEFT = 270° right profile — RIGHT side length (ear to tip), sideburn, symmetry vs left
- BOTTOM-RIGHT= 180° back of head  — nape length, crown length, density

Analyse ONLY what you actually see. Do NOT give the "average" or "safe" answer. Read every zone from the panel named for it — never copy one side's number onto the other; report them independently even when they look equal.
${expertFocus ? `\n${expertFocus}\n` : ""}
HAIR MEASUREMENTS — read ALL of these zones separately:
- FRONT / FRINGE: from the FRONT panel (0°). Length of hair falling over or toward the forehead.
- CROWN / TOP: from the FRONT and BACK panels. Length of hair on the very top of the head.
- LEFT SIDE (above the ear): from the LEFT profile (90°).
- RIGHT SIDE (above the ear): from the RIGHT profile (270°).
- NAPE (back, below the occipital bone): from the BACK panel (180°).

For each zone provide BOTH a scale label AND an approximate cm estimate:
Scale: very_short (0–1cm) | short (1–4cm) | medium (4–8cm) | long (8–15cm) | very_long (15cm+)
Cm estimates are approximations — compare hair against ear length (~6cm) and neck width as references.

"hairLength" = the LONGEST zone (this limits what styles are achievable).
For backward compatibility also fill topCm/sideCm/napeCm: top = crown, side = the SHORTER of left & right, nape = nape.

CRITICAL — do NOT under-read the TOP. A very common cut is SHORT FADED/TAPERED SIDES with a LONG STYLED TOP (quiff, pompadour, brush-up, side part, slick-back, voluminous top). In that case:
- The short sides do NOT make this a "short" haircut. hairLength is set by the TOP, so it is medium (or long), never "short".
- Hair styled UPWARD or SWEPT BACK is being held up by product — its TRUE length (if pulled straight down) is longer than the height it sits at. A top with real volume/movement is at least medium (4cm+). Judge the real hair length, not how flat it lies.
- Only call the top "short" if it is genuinely cropped/uniformly short with no length to style (crop, buzz, caesar), not merely faded on the sides.

HAIR TEXTURE — do NOT default to "straight". If you see any wave, bend, curl, or coarse/thick surface, it is "wavy" (or curly/coily). A styled quiff/pompadour with visible flow or S-shaped movement is "wavy", not "straight". Scale: straight | wavy | curly | coily

HAIR DENSITY — judge how much scalp shows through, most reliably from the CROWN in the back panel:
- thin: scalp clearly visible through the hair, sparse coverage, or a visibly thinning/receding area.
- medium: normal coverage, scalp only shows when hair is parted.
- thick: dense, no scalp visible, hair stands full.
Be honest — do not flatter a thinning crown as "thick"; density decides whether volume styles will actually hold.

HAIRLINE — read from the FRONT panel (0°). It drives which fringes and crops sit right:
- hairlineShape: straight | rounded | m-shaped | widows-peak | receding | uneven
- hairlineNotes: note temple recession or a high forehead — some styles (blunt/low fringe) hide it, others (slick back) expose it.

RECENT HAIRCUT CHECK — decide whether this person has EVIDENTLY just had a fresh, recent professional haircut, or their hair has grown out and needs one. Signs of a FRESH cut: sharp clean lineups at the hairline/temples, a crisp defined fade or taper, freshly shaped even edges, tidy neckline, no split/straggly ends. Signs it is NOT fresh: grown-out shapeless edges, uneven length, fuzzy undefined hairline, overgrown neckline.
- freshCut: true if it clearly looks freshly/recently cut, false if grown out or overdue.
- freshCutNotes: one short phrase saying why (e.g. "sharp fresh fade and lineup" or "grown out, edges need cleaning up").

Other fields:
- gender: male | female
- skinTone: fair | light | medium | olive | tan | brown | deep
- undertone: warm | cool | neutral
- hairColor: the actual observed colour
- faceShape: oval | round | square | oblong | heart | diamond
- faceLength: short | average | long

${preferenceBlock ? `${preferenceBlock}\n\n` : ""}${styleNamingBlock(knownStyles)}

${SIX_ZONE_JSON}`;
}

// ── P1 — the shipped baseline (frozen verbatim, 3 zones) ─────────────────────────
const P1: PromptDef = {
  id: "p1",
  label: "P1 — Baseline (3 zones)",
  summary: "Top, sides (L+R combined), nape. The original shipped prompt.",
  build: ({ knownStyles }) => `You are a professional hairstylist and colour specialist. The image is ONE picture containing up to 4 photos of the SAME person arranged in a 2x2 grid (a "Shared Hair Blueprint"):
- TOP-LEFT   = 0°   front view       — read face shape, skin tone, current style, and top hair length
- TOP-RIGHT  = 90°  left profile     — read side hair length (ear to tip) and texture
- BOTTOM-LEFT = 270° right profile   — confirm side length and check for symmetry
- BOTTOM-RIGHT = 180° back of head   — read nape length and hair density at the crown/nape

Analyse ONLY what you actually see. Do NOT give the "average" or "safe" answer.

HAIR MEASUREMENTS — read each zone separately from the matching panel:
- TOP (crown/top of head): read from the FRONT panel (0°). How long is the hair on top?
- SIDES (above the ears): read from the LEFT and RIGHT profile panels (90°/270°). How long is the hair on the sides?
- NAPE (back, below the occipital bone): read from the BACK panel (180°). How long does the hair grow at the nape?

For each zone provide BOTH a scale label AND an approximate cm estimate:
Scale: very_short (0–1cm) | short (1–4cm) | medium (4–8cm) | long (8–15cm) | very_long (15cm+)
Cm estimates are approximations — compare hair against ear length (~6cm) and neck width as references.

"hairLength" = the LONGEST of the three zones (this limits what styles are achievable).

HAIR TEXTURE — do NOT default to "straight". If you see any wave, bend, curl, or coarse/thick surface, it is "wavy" (or curly/coily). Scale: straight | wavy | curly | coily

Other fields:
- gender: male | female
- skinTone: fair | light | medium | olive | tan | brown | deep
- undertone: warm | cool | neutral
- hairDensity: thin | medium | thick
- hairColor: the actual observed colour
- faceShape: oval | round | square | oblong | heart | diamond
- faceLength: short | average | long (short = face width ≈ height; average = balanced; long = face noticeably taller than wide — look at the front panel to judge)

${styleNamingBlock(knownStyles)}

Return ONLY valid JSON, no markdown, with EXACTLY these keys:
{
  "gender": "...",
  "skinTone": "...",
  "undertone": "...",
  "hairLength": "longest zone (very_short|short|medium|long|very_long)",
  "hairMeasurements": {
    "topLength": "very_short|short|medium|long|very_long",
    "sideLength": "very_short|short|medium|long|very_long",
    "napeLength": "very_short|short|medium|long|very_long",
    "topCm": "~Xcm",
    "sideCm": "~Xcm",
    "napeCm": "~Xcm"
  },
  "hairDensity": "...",
  "hairTexture": "...",
  "hairColor": "...",
  "faceShape": "...",
  "faceLength": "...",
  "currentStyle": "short description of their current haircut",
  "feasibleStyles": ["s1","s2","s3","s4","s5","s6"],
  "bestMatch": "one of feasibleStyles verbatim",
  "bestMatchReason": "1-2 sentences specific to this person's face + hair",
  "suggestedColors": [
    { "color": "...", "reason": "why it suits them", "process": "single-process|needs bleaching|multi-step lift", "sessions": "1|2|2-3" },
    { "color": "...", "reason": "...", "process": "...", "sessions": "..." },
    { "color": "...", "reason": "...", "process": "...", "sessions": "..." }
  ],
  "stylingTips": "practical tip for the bestMatch style"
}`,
};

// ── P2 — All-sides general (6 zones, no type specialisation) ─────────────────────
const P2: PromptDef = {
  id: "p2",
  label: "P2 — All sides (6 zones)",
  summary: "Splits sides into left & right, adds front hairline + crown. Fuller length map.",
  build: ({ knownStyles, preferenceBlock }) => build6Zone(knownStyles, "", preferenceBlock),
};

export const PROMPT_VERSIONS: Record<PromptVersion, PromptDef> = { p1: P1, p2: P2 };
export const DEFAULT_PROMPT_VERSION: PromptVersion = "p1";

// ── Specialised prompts — one expert focus per hair type ────────────────────────
// Each is the 6-zone base + instructions that make the model read what actually
// matters for that type. This is the "better, more efficient analysis": the model
// isn't guessing which details matter — it's told, for this exact hair type.
const EXPERT_FOCUS: Record<Category, string> = {
  "male-short": `EXPERT FOCUS — short men's cut (fade / crop / buzz territory):
- Read the FADE precisely: where does it start (low = above ear, mid = temple, high = above temple) and does it blend to skin (skin fade) or to short stubble (taper)?
- Judge the top texture and whether there is a defined fringe/crop shape or it is uniform.
- Note the natural HAIRLINE shape (straight, rounded, receding, widow's peak) — it decides which crops and fringes will actually sit right.
- Precision on top length in cm matters most here: 2cm vs 5cm is the difference between a buzz and a textured crop.`,

  "male-medium": `EXPERT FOCUS — medium men's hair (quiff / pompadour / slick-back / side part territory):
- Top length is the key measurement — it gates quiff/pompadour/slick feasibility. Be exact in cm.
- Read whether hair currently sits UP (volume/styled) or DOWN (flat), and where the natural part falls.
- Judge how much the sides can still be tightened without losing the length needed on top.
- Note movement/wave — it decides whether a textured or a sleek finish will hold.`,

  "male-long": `EXPERT FOCUS — longer men's hair (flow / man bun / long layers):
- Read whether the length can tie back (roughly 10cm+ all round) and where the shortest zone limits that.
- Judge layering and the condition of the ENDS (blunt, tapered, split/dry).
- Note the natural curl/wave pattern at length — it drives which long styles fall correctly.`,

  "female-short": `EXPERT FOCUS — short women's cut (pixie / short bob territory):
- Distinguish clearly between a PIXIE (very short sides/nape, short top) and a BOB (chin-length, weight kept).
- Read graduation/stacking at the back and whether there is a fringe.
- Face shape drives short-cut suitability more than anything — be precise on faceShape and faceLength.`,

  "female-medium": `EXPERT FOCUS — medium women's hair (lob / shoulder-length / shag):
- Read layering and face-framing pieces, and the condition of the ENDS.
- Note where the length actually falls (jaw, chin, shoulder) — it separates a lob from a shag.
- Judge natural texture at this length; it decides whether blunt or layered will suit.`,

  "female-long": `EXPERT FOCUS — long women's hair (long layers / curtain bangs / waves):
- Read the natural wave/curl pattern carefully — it is the biggest driver of which long styles work.
- Judge the ENDS for damage/dryness and whether a trim is needed before a restyle.
- Note existing colour treatment (highlights, ombré, roots) — it constrains the colour suggestions.`,
};

/** Full analysis prompt for a detected category. */
export function buildSpecialisedPrompt(category: Category, ctx: AnalysisPromptContext): string {
  return build6Zone(ctx.knownStyles, EXPERT_FOCUS[category], ctx.preferenceBlock);
}

// ── Pass-1 classifier — tiny + cheap ────────────────────────────────────────────
// Returns just enough to route. Kept to two fields so the output is a handful of
// tokens; the expensive read happens in pass 2 with the specialised prompt.
export const CLASSIFIER_PROMPT = `Look at this 2x2 grid of one person's hair from four angles. Return ONLY this JSON, nothing else:
{"gender":"male|female","lengthBand":"short|medium|long"}
lengthBand = the LONGEST hair anywhere on the head: short (buzz to just past the ears), medium (ears to shoulders), long (past the shoulders).`;

/** Map a classifier result to a specialised category, tolerating loose values. */
export function toCategory(gender?: string, lengthBand?: string): Category {
  const g = (gender ?? "").toLowerCase().startsWith("f") ? "female" : "male";
  const raw = (lengthBand ?? "").toLowerCase();
  const band =
    raw.includes("long") ? "long" :
    raw.includes("med") ? "medium" :
    "short";
  return `${g}-${band}` as Category;
}

/** Resolve a MANUAL version request, falling back to the default. */
export function getPrompt(version: string | undefined, ctx: AnalysisPromptContext): {
  version: PromptVersion;
  text: string;
} {
  const v: PromptVersion = version === "p2" || version === "p1" ? version : DEFAULT_PROMPT_VERSION;
  return { version: v, text: PROMPT_VERSIONS[v].build(ctx) };
}
