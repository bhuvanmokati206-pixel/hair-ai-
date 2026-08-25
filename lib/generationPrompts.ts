// Image-GENERATION prompt registry (nano-banana-2, in generate-hairstyle route).
//
// NOTE: this is a DIFFERENT prompt system from lib/analysisPrompts.ts. That one
// READS hair from photos; this one tells the image model how to DRAW the new cut.
// They both happen to use "p1"/"p2" version names, but they are unrelated.
//
//  p1 — the shipped prompt, frozen verbatim (baseline).
//  p2 — length-adaptive: the finish + texture language changes with how short the
//       target style is, so a buzz cut is no longer told "wavy texture, individual
//       strands visible" (impossible at 1-3mm) the way p1 does.

export type GenPromptVersion = "p1" | "p2";

export type HairGenParams = {
  hairDescription: string;         // the style name / custom description
  hairColor?: string;
  hairTexture?: string;
  hairDensity?: string;
  styleName?: string;              // used to detect ultra-short styles
  hairLength?: string;             // analysis hairLength, if present
  contextLine: string;             // "Person has oval face shape, medium skin tone"
  lengthConstraint: string;        // the "do not increase length" line
  beardInstruction: string;
  gridMode: boolean;
  // Per-zone target lengths for the chosen style (cm), from getStyleTargetCm().
  // p2 turns these into an explicit "cut to roughly Xcm on top…" instruction so the
  // model has real numbers instead of guessing from the style name alone.
  targetCm?: { top: number; side: number; nape: number } | null;
  // Hairline from analysis — kept honest so a receding hairline isn't lowered.
  hairlineShape?: string;
  hairlineNotes?: string;
};

// Keep prompts SHORT. Long, repetitive "keep everything the same / do NOT change X"
// prompts confuse the image model and produce artefacted, low-quality output. We
// state only what must stay (face, colour, texture, density) in one line.
function keepClause(p: HairGenParams, ultraShort: boolean): string {
  const own: string[] = [];
  if (p.hairColor) own.push(`${p.hairColor} colour`);
  if (!ultraShort && p.hairTexture) own.push(`${p.hairTexture} texture`);
  if (p.hairDensity) own.push(`${p.hairDensity} density`);
  const ownLine = own.length ? ` Keep the hair's own ${own.join(", ")}.` : "";
  // Identity lock, stated first and concretely. Naming the specific features the
  // model must not touch holds identity far better than a generic "keep the face".
  return `This is a real photograph of one specific real person. Preserve their exact identity: keep the same face, eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone and any facial hair EXACTLY as in the photo — the face must be indistinguishable from the original. Do not beautify, slim, age, lighten or redraw the face. Change ONLY the hair on the scalp.${ownLine}`;
}

// Beard: only speak up when one is explicitly added or removed. When it's "leave the
// beard alone", the "change only the hair" instruction already covers it — so we
// stay silent rather than repeat "keep the beard the same".
function beardLine(instruction: string): string {
  return /\b(add|clean shaven|shave)\b/i.test(instruction) ? instruction : "";
}

// Short closer. One line keeps it a photo EDIT (no studio re-render) and pushes
// real hair (visible strands, matte) to fight the plastic/CGI look.
const FINISH =
  "Change only the hair; keep the same background and lighting — a photo edit, not a new render. Real photographic hair: visible individual strands, natural matte finish, no plastic, waxy or CGI look.";
const FINISH_BUZZ =
  "Change only the hair; keep the same background and lighting. Even clipper-short length all over, real short-hair texture with the scalp faintly visible, no plastic or CGI look. Photorealistic.";

// Styles that are clipper-short by definition — texture/waves do not apply.
const ULTRA_SHORT_STYLES = new Set([
  "buzz cut", "induction cut", "crew cut", "caesar cut", "burr cut", "butch cut",
]);

// Grid instruction. The quadrant positions MUST match splitGrid()'s crop order —
// top-left, top-right, bottom-left, bottom-right → front, left, right, back — or the
// four split images get mislabelled (a right profile shown as "LEFT SIDE" etc.).
const GRID_LINE =
  "Output a 2×2 grid, one head per panel, in this exact order: TOP-LEFT = front view (face to camera), TOP-RIGHT = LEFT-side profile (head turned so the left ear faces us), BOTTOM-LEFT = RIGHT-side profile (right ear faces us), BOTTOM-RIGHT = back of the head. The TOP-LEFT front panel MUST keep the person's face exactly as in the input photo — same eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone and facial hair, indistinguishable from the original; do not redraw, beautify or change the face at all. The other three panels show that SAME identical person and SAME face from other angles — never a different person. It is ONE identical haircut on that one head: the hair length, shape, parting and texture are exactly the same in all four panels; the ONLY difference between panels is the camera angle. Do NOT restyle, re-comb or change the hair from one panel to the next.";

function isUltraShort(styleName?: string, hairDescription?: string, hairLength?: string): boolean {
  const name = (styleName ?? hairDescription ?? "").toLowerCase();
  if ([...ULTRA_SHORT_STYLES].some((s) => name.includes(s))) return true;
  if (/\bbuzz|shaved|induction|number \d|grade \d|skin\s*fade all\b/.test(name)) return true;
  if ((hairLength ?? "").toLowerCase() === "very_short") return true;
  return false;
}

// ── P1 — shipped prompt, verbatim behaviour ─────────────────────────────────────
function buildP1(p: HairGenParams): string {
  const styleDetails = [
    p.hairColor   ? `Keep ${p.hairColor} hair color` : "",
    p.hairTexture ? `${p.hairTexture} texture`        : "",
    p.hairDensity ? `${p.hairDensity} density`        : "",
  ].filter(Boolean).join(", ");

  const lines = [
    "Edit only the hair on this real photograph of one specific real person.",
    "Preserve their exact identity: keep the same face, eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone, facial hair, ears, neck, clothing, background and lighting EXACTLY as in the photo — the face must be indistinguishable from the original. Do not beautify, slim, age or redraw the face. Change ONLY the hair on the scalp.",
    `Apply a ${p.hairDescription}.${styleDetails ? ` ${styleDetails}.` : ""}${p.contextLine ? ` ${p.contextLine}.` : ""}`,
    p.lengthConstraint,
    p.beardInstruction,
  ];
  if (p.gridMode) {
    lines.push(
      "Create one 2×2 collage of the SAME real person from four views: Front (0°), Left (90°), Right (270°), Back (180°).",
      "The front (top-left) panel MUST keep the person's face exactly as in the input photo — same eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone and facial hair, indistinguishable from the original. The other three panels are that SAME identical person and face from other angles, never a different person. The hairstyle is identical in every panel; the only difference between panels is the camera angle.",
    );
  }
  lines.push("No gel, no product sheen, no smoothing. Individual strands visible, matte natural finish, realistic scalp, seamless blend at the hairline. Photorealistic.");
  return lines.filter(Boolean).join("\n\n");
}

// ── P2 — words-only, kept short ─────────────────────────────────────────────────
function buildP2(p: HairGenParams): string {
  const ultraShort = isUltraShort(p.styleName, p.hairDescription, p.hairLength);
  const style = ultraShort
    ? `Give them a ${p.hairDescription} — short and even clipper length all over.`
    : `Give them a ${p.hairDescription}.`;
  const beard = beardLine(p.beardInstruction);

  const lines = [
    `Edit this photo of the person. ${style}${beard ? " " + beard : ""}`,
    keepClause(p, ultraShort),
  ];
  if (p.gridMode) lines.push(GRID_LINE);
  lines.push(ultraShort ? FINISH_BUZZ : FINISH);
  return lines.filter(Boolean).join("\n\n");
}

// ── Reference-guided prompt (kept short) ────────────────────────────────────────
// The LAST image is a faceless mannequin card showing the target cut (only mannequin
// cards are ever used — see referenceLibrary). Copy the SHAPE from it; keep the
// person's own face, colour, texture and density. Short on purpose.
export function buildReferenceGenPrompt(p: HairGenParams): string {
  const ultraShort = isUltraShort(p.styleName, p.hairDescription, p.hairLength);
  const beard = beardLine(p.beardInstruction);

  const lines = [
    `Edit the first photo of the person. Give them the haircut shown in the LAST image — a ${p.hairDescription}. Copy its shape and length onto this person.${beard ? " " + beard : ""}`,
    keepClause(p, ultraShort),
  ];
  if (p.gridMode) lines.push(GRID_LINE);
  lines.push(ultraShort ? FINISH_BUZZ : FINISH);
  return lines.filter(Boolean).join("\n\n");
}

// ── Four-angle, describe-then-generate prompt (the validated pipeline) ───────────
// Input = the customer's FOUR real angle photos (front/left/right/back). The style
// comes from a pre-computed WORD description (from a reference card, or the style
// name) — NOT a reference image, so no second head competes with the customer's
// identity. Each panel is edited from a real photo of that angle, so the face is
// never invented. Includes the anti-smoothing fix from testing.
export function buildFourAngleGridPrompt(p: {
  hairDescription: string;
  hairColor?: string;
  hairTexture?: string;
  beardInstruction: string;
  gender?: string; // "male" | "female" — selects the identity-lock wording
}): string {
  const isFemale = (p.gender ?? "").toLowerCase().startsWith("f");
  const beard = beardLine(p.beardInstruction);
  const own: string[] = [];
  if (p.hairColor) own.push(`${p.hairColor} colour`);
  if (p.hairTexture) own.push(`${p.hairTexture} texture`);

  const IMAGES =
    "You are given FOUR photos of the SAME real person from four angles:\nIMAGE 1 = front view (face to camera)\nIMAGE 2 = LEFT-side profile (left ear toward camera)\nIMAGE 3 = RIGHT-side profile (right ear toward camera)\nIMAGE 4 = back of the head";
  const GRID =
    "Output a 2×2 grid arranged in this EXACT order, each panel edited from the matching input photo: TOP-LEFT = IMAGE 1 (front); TOP-RIGHT = IMAGE 2 (left profile); BOTTOM-LEFT = IMAGE 3 (right profile); BOTTOM-RIGHT = IMAGE 4 (back). The hairstyle must be IDENTICAL in all four panels — same length, shape, parting and texture; the only difference between panels is the camera angle. Do not swap, mirror or rearrange the panels.";
  const SALON =
    "Give it a fresh professional SALON FINISH: the hair neatly cut, cleanly shaped and styled as if the client has just walked out of a top salon or barbershop — tidy edges, clean lineups and a well-groomed look, not the messy walk-in state. Keep it natural and realistic (real strands, matte), never glossy, waxy or over-styled.";
  const RENDER =
    "A photo edit, not a new render. Real photographic hair: visible individual strands, natural matte finish, no plastic, waxy or CGI look. Photorealistic.";

  if (isFemale) {
    const keepOwn = own.length ? ` Keep her own ${own.join(" and ")}.` : "";
    return [
      IMAGES,
      `PRIMARY TASK — RESTYLE her hair. Give her a NEW hairstyle that looks clearly and obviously DIFFERENT from her current hair: ${p.hairDescription}. Actually change the cut, shape and length as described — do NOT reproduce, copy or keep her current hairstyle. The result must not look the same as the input hair.${keepOwn}`,
      "CRITICAL — this is real photography of one specific real woman. In every photo keep her exact face, eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone, makeup and earrings EXACTLY as in that photo — indistinguishable from the original. Do NOT smooth skin, beautify, slim, round, age or lighten the face; keep the exact face shape and real skin texture. Keep each photo's own background and lighting. Change ONLY the hair.",
      GRID,
      SALON,
      RENDER,
    ].join("\n\n");
  }

  const keepOwn = own.length ? ` Keep the hair's own ${own.join(" and ")}.` : "";
  return [
    IMAGES,
    `PRIMARY TASK — RESTYLE his hair. Give him a NEW haircut that looks clearly and obviously DIFFERENT from his current hair: ${p.hairDescription}. Actually cut and restyle the hair as described — do NOT reproduce, copy or keep his current hairstyle. The result must not look the same as the input hair.${keepOwn}${beard ? " " + beard : ""}`,
    "CRITICAL — this is real photography of one specific real man. In every photo keep his exact face, eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone and FACIAL HAIR (beard and moustache) EXACTLY as in that photo — indistinguishable from the original, and keep the beard equally full and the same shape in all four panels. Do NOT smooth skin, beautify, slim, round, age or lighten the face; keep the exact face shape and real skin texture. Keep each photo's own background and lighting. Change ONLY the hair on the scalp.",
    GRID,
    SALON,
    RENDER,
  ].join("\n\n");
}

// ── Colour preview — recolour the CURRENT haircut, don't restyle ────────────────
// Four real photos in; keep the exact existing cut + face + background, only change
// the hair COLOUR. Used by the "Try this colour" action.
export function buildRecolorGridPrompt(p: { recolorTo: string; gender?: string; hex?: string }): string {
  const isFemale = (p.gender ?? "").toLowerCase().startsWith("f");
  const subject = isFemale ? "woman" : "man";
  const poss = isFemale ? "her" : "his";
  const extras = isFemale ? "makeup and earrings" : "facial hair";
  const beardColour = isFemale ? "" : " Keep the beard its own natural colour — recolour only the hair on the scalp.";
  // The hex pins the EXACT shade — a colour name alone drifts, a hex renders true.
  const shade = p.hex ? `${p.recolorTo} (exact target shade, approximately ${p.hex})` : p.recolorTo;
  return [
    "You are given FOUR photos of the SAME real person from four angles:\nIMAGE 1 = front view (face to camera)\nIMAGE 2 = LEFT-side profile (left ear toward camera)\nIMAGE 3 = RIGHT-side profile (right ear toward camera)\nIMAGE 4 = back of the head",
    `PRIMARY TASK — RECOLOUR the hair. Change the hair COLOUR to ${shade} in all four photos, applied evenly and naturally with realistic roots, depth and shine. Keep the person's EXACT current haircut — same length, shape, cut, parting and texture; do NOT restyle, cut or reshape the hair, change ONLY its colour.${beardColour}`,
    `CRITICAL — this is real photography of one specific real ${subject}. In every photo keep ${poss} exact face, eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone and ${extras} EXACTLY as in that photo — indistinguishable from the original. Do NOT smooth skin, beautify or change the face. Keep each photo's own background and lighting.`,
    "Output a 2×2 grid arranged in this EXACT order, each panel edited from the matching input photo: TOP-LEFT = IMAGE 1 (front); TOP-RIGHT = IMAGE 2 (left profile); BOTTOM-LEFT = IMAGE 3 (right profile); BOTTOM-RIGHT = IMAGE 4 (back). Same haircut and the SAME new colour in all four panels; only the camera angle differs.",
    "A photo edit, not a new render. Realistic hair colour: natural individual strands, believable shine, matte skin, no plastic or CGI look. Photorealistic.",
  ].join("\n\n");
}

// ── Combined composer — the "no-Claude-in-the-loop" prompt brain ────────────────
// Given whatever mix of services the customer selected (cut / colour / beard), this
// assembles ONE four-angle grid prompt that applies them all together. Any field can
// be omitted; an omitted service is preserved as-is. Handles gender wording, keeps
// the beard when it isn't being changed, keeps the colour when it isn't, etc.
export function buildCombinedPrompt(p: {
  gender?: string;
  hairDescription?: string;               // restyle target; omit → keep current cut
  colorName?: string; colorHex?: string;  // recolour target; omit → keep own colour
  hairColor?: string; hairTexture?: string; // own colour/texture to preserve when NOT recolouring
  beardInstruction?: string;              // e.g. "a neat short boxed beard"; omit → keep beard
}): string {
  const isFemale = (p.gender ?? "").toLowerCase().startsWith("f");
  const subj = isFemale ? "woman" : "man";
  const poss = isFemale ? "her" : "his";
  const changingHair = !!p.hairDescription;
  const changingColour = !!p.colorName;
  const changingBeard = !isFemale && !!p.beardInstruction;

  const IMAGES =
    "You are given FOUR photos of the SAME real person from four angles:\nIMAGE 1 = front view (face to camera)\nIMAGE 2 = LEFT-side profile (left ear toward camera)\nIMAGE 3 = RIGHT-side profile (right ear toward camera)\nIMAGE 4 = back of the head";
  const GRID =
    "Output a 2×2 grid arranged in this EXACT order, each panel edited from the matching input photo: TOP-LEFT = IMAGE 1 (front); TOP-RIGHT = IMAGE 2 (left profile); BOTTOM-LEFT = IMAGE 3 (right profile); BOTTOM-RIGHT = IMAGE 4 (back). The look must be IDENTICAL in all four panels; the only difference between panels is the camera angle. Do not swap, mirror or rearrange the panels.";
  const SALON =
    "Give it a fresh professional SALON FINISH: neatly cut, coloured and styled as if the client just walked out of a top salon — tidy edges, clean lineups, well-groomed. Keep it natural and realistic (real strands, matte), never glossy, waxy or over-styled.";
  const RENDER =
    "A photo edit, not a new render. Real photographic hair: visible individual strands, natural matte finish, no plastic, waxy or CGI look. Photorealistic.";

  // Build the task bullets for whatever was selected.
  const bullets: string[] = [];
  if (changingHair) {
    bullets.push(`• HAIRCUT: give ${poss === "her" ? "her" : "him"} this new cut — ${p.hairDescription}. It MUST look clearly restyled, not ${poss} current hair.`);
  }
  if (changingColour) {
    const shade = p.colorHex ? `${p.colorName} (exact target shade, approximately ${p.colorHex})` : p.colorName;
    bullets.push(`• COLOUR: recolour the hair to ${shade}, applied evenly and naturally with realistic roots, depth and shine.`);
  }
  if (changingBeard) {
    bullets.push(`• BEARD: ${p.beardInstruction}.`);
  }

  // Preservation notes for the services NOT selected.
  const keep: string[] = [];
  if (!changingHair) keep.push(`Keep ${poss} EXACT current haircut — same length, shape, cut, parting and texture; do not restyle or cut the hair`);
  if (!changingColour) {
    const own: string[] = [];
    if (p.hairColor) own.push(`${p.hairColor} colour`);
    if (p.hairTexture) own.push(`${p.hairTexture} texture`);
    keep.push(own.length ? `keep the hair's own ${own.join(" and ")}` : `keep the hair's own natural colour`);
  }
  if (!isFemale && !changingBeard) keep.push(`keep the beard/facial hair exactly as it is`);
  const keepLine = keep.length ? ` ${keep.join("; ")}.` : "";

  // Identity lock — when the beard is being changed, don't also lock it.
  const faceExtras = isFemale ? "makeup and earrings" : (changingBeard ? "" : "and FACIAL HAIR (beard and moustache)");
  const identity =
    `CRITICAL — this is real photography of one specific real ${subj}. In every photo keep ${poss} exact face, eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone${faceExtras ? " " + faceExtras : ""} EXACTLY as in that photo — indistinguishable from the original. Do NOT smooth skin, beautify, slim, round, age or lighten the face; keep the exact face shape and real skin texture. Keep each photo's own background and lighting.`;

  return [
    IMAGES,
    `PRIMARY TASK — give this ${subj} a NEW salon look in all four photos, applying ALL of the following together:\n${bullets.join("\n")}${keepLine}`,
    identity,
    GRID,
    SALON,
    RENDER,
  ].join("\n\n");
}

const BUILDERS: Record<GenPromptVersion, (p: HairGenParams) => string> = {
  p1: buildP1,
  p2: buildP2,
};

export const DEFAULT_GEN_PROMPT_VERSION: GenPromptVersion = "p1";

/** Build the hair generation prompt for a version, falling back to the default. */
export function buildHairGenPrompt(version: string | undefined, params: HairGenParams): {
  version: GenPromptVersion;
  text: string;
} {
  const v: GenPromptVersion = version === "p2" || version === "p1" ? version : DEFAULT_GEN_PROMPT_VERSION;
  return { version: v, text: BUILDERS[v](params) };
}
