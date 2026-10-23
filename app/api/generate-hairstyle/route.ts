import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { Jimp } from "jimp";
import { buildHairGenPrompt, buildFourAngleGridPrompt, buildRecolorGridPrompt, buildCombinedPrompt } from "@/lib/generationPrompts";
import { getStyleTargetCm } from "@/lib/compatibilityEngine";
import { findReference } from "@/lib/referenceLibrary";
import { findColor } from "@/lib/colorPalette";
import { getVisitPhotos } from "@/lib/visitPhotos";

// Vercel serverless: image generation (nano-banana) takes ~40–60s. Default is 10s,
// which would abort every generation — raise to the Hobby-tier max of 60s.
export const maxDuration = 60;

// Cuts the 2×2 collage into four standalone angle images, each a quarter of the
// generated frame — so quadrant size is GRID_RESOLUTION halved on both axes.
async function splitGrid(buffer: Buffer): Promise<string[]> {
  const img = await Jimp.read(buffer);
  const w = Math.floor(img.bitmap.width / 2);
  const h = Math.floor(img.bitmap.height / 2);
  const quads: string[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const tile = img.clone().crop({ x: col * w, y: row * h, w, h });
      // Quality 88 — visually lossless here, and keeps four full-size quadrants
      // in one JSON response from ballooning past a few MB.
      quads.push((await tile.getBuffer("image/jpeg", { quality: 88 })).toString("base64"));
    }
  }
  return quads; // [front, left, right, back]
}

const REPLICATE_MODEL = "google/nano-banana-2";
// llama-3.3-70b-versatile was retired by Groq (404). openai/gpt-oss-120b is the
// current text model; it reasons, so keep max_tokens generous + reasoning_effort low.
const GROQ_MODEL = "openai/gpt-oss-120b";

// Kept at 1K per the owner's call — faster generation. (nano-banana-2 charges the
// same at every resolution, so bump this to "2K"/"4K" if quality matters more.)
const OUTPUT_RESOLUTION = "1K";

// Grid resolution. The grid packs four views into ONE frame, so each angle gets a
// quarter of this. 4K renders take ~40–60s, which overruns Vercel's 60s serverless
// cap (maxDuration) and kills the request mid-generation — so the flow never advances.
// 2K finishes comfortably under the cap; each quadrant is still ~1K, plenty for a
// preview. Bump back to "4K" only on a plan with a longer function timeout (Vercel Pro
// = up to 300s). nano-banana-2 is flat-priced, so resolution only changes render time.
const GRID_RESOLUTION = "2K";

// Colour previews render at 2K — colour is easy to judge at a lower resolution, and
// it makes the "Try this colour" previews faster/cheaper than the 4K haircut grids.
const COLOR_RESOLUTION = "2K";

function lengthAnchor(hairLength?: string): string {
  switch ((hairLength ?? "").toLowerCase()) {
    case "very_short": return "no longer than 1 cm, buzzed close to the scalp";
    case "short":      return "not past the top of the ears";
    case "medium":     return "not past the bottom of the ears or jawline";
    case "long":       return "not past the shoulders";
    default:           return "";
  }
}

// Expands a bare style name ("Textured Crop") into a vivid visual description
// an image-edit model can act on ("choppy textured top, low fade on sides...").
// Also used for free-text custom descriptions to clean/condense them.
async function expandStyleDescription(
  name: string,
  target: "hair" | "beard"
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return name;

  const subject = target === "beard" ? "beard style" : "hairstyle";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{
        role: "user",
        content: `Describe the ${subject} "${name}" in 15 words max using only visual characteristics: fade level, top texture, layer style, finish, movement. Comma-separated, no sentences, no filler. Start directly.`,
      }],
      temperature: 0.3,
      max_tokens: 500,
      reasoning_effort: "low",
    }),
  });
  if (!res.ok) return name;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? name;
}

async function buildStyleNotes(
  target: "hair" | "beard",
  description: string,
  color?: string,
  texture?: string,
  lengthLimit?: string,
  faceShape?: string
): Promise<{ whySuits: string; summary: string; barberInstructions: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  const subject = target === "beard" ? "beard style" : "hairstyle";
  const verb = target === "beard" ? "trimming/shaping" : "cutting";
  const faceBit = faceShape ? ` a ${faceShape} face` : " their face";
  const fallback = {
    whySuits: `- Flatters${faceBit}\n- Works great with your ${texture ? `${texture} ` : ""}hair\n- Easy, natural finish that's simple to keep up`,
    summary: `${description}. A clean, low-maintenance ${subject}.`,
    barberInstructions: `${target === "beard" ? "Shape" : "Cut"}: ${description}.${color ? ` Colour: ${color}.` : ""}${texture ? ` Texture: ${texture}.` : ""}${lengthLimit ? ` Length: ${lengthLimit}.` : ""}`,
  };
  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{
          role: "user",
          content: `A customer with${faceBit}${texture ? `, ${texture} hair` : ""} is getting this ${subject}: "${description}"${color ? `, colour: ${color}` : ""}.${lengthLimit ? ` Length limit: ${lengthLimit}.` : ""}

Return ONLY valid JSON, no markdown:
{
  "whySuits": "3 or 4 SHORT casual bullet points, each on its OWN line starting with '- ', friendly and relaxed like a stylist chatting to a friend — why this look suits them (face shape, hair type, everyday vibe). Specific, no jargon, no full paragraphs.",
  "summary": "2-3 sentence customer-facing description of the look itself",
  "barberInstructions": "Concise step-by-step ${verb} instructions a barber would follow"
}`,
        }],
        temperature: 0.4,
        max_tokens: 1100,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    return {
      whySuits: parsed.whySuits ?? fallback.whySuits,
      summary: parsed.summary ?? fallback.summary,
      barberInstructions: parsed.barberInstructions ?? fallback.barberInstructions,
    };
  } catch {
    return fallback;
  }
}

type AnglePhoto = {
  base64?: string;
  mediaType?: string;
  url?: string;
  preview?: string;
};
type Angle = "front" | "left" | "right" | "back";

async function resolveAnglePhoto(p?: AnglePhoto): Promise<{ base64: string; mediaType: string } | null> {
  if (!p) return null;
  let base64 = p.base64?.trim() || "";
  let mediaType = p.mediaType || "image/jpeg";
  const urlCandidate = p.url || p.preview;

  if (!base64 && urlCandidate) {
    if (urlCandidate.startsWith("data:")) {
      const match = urlCandidate.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mediaType = match[1];
        base64 = match[2];
      }
    } else if (urlCandidate.startsWith("http://") || urlCandidate.startsWith("https://")) {
      try {
        const res = await fetch(urlCandidate);
        if (res.ok) {
          const contentType = res.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
          const buf = Buffer.from(await res.arrayBuffer());
          base64 = buf.toString("base64");
          mediaType = contentType;
        }
      } catch (err) {
        console.warn("[generate-hairstyle] failed to fetch photo from url:", urlCandidate, err);
      }
    }
  }

  if (!base64) return null;
  return { base64, mediaType };
}

export async function POST(req: NextRequest) {
  try {
    const {
      styleName, hairColor, hairTexture, includeBeard, customDescription,
      photoBase64, photoMediaType, photoUrl, photos, hairLength, editTarget,
      skinTone, hairDensity, faceShape, faceLength, hairMeasurements, angle, gridMode,
      genPromptVersion, gender, hairlineShape, hairlineNotes, useReference, recolorTo, combo,
      visitId,
    } = await req.json() as {
      styleName?: string; hairColor?: string; hairTexture?: string; includeBeard?: boolean;
      customDescription?: string; photoBase64?: string; photoMediaType?: string; photoUrl?: string;
      photos?: Partial<Record<Angle, AnglePhoto>>;
      visitId?: string;
      hairLength?: string; editTarget?: "hair" | "beard";
      skinTone?: string; hairDensity?: string; faceShape?: string; faceLength?: string;
      hairMeasurements?: { topLength: string; sideLength: string; napeLength: string; topCm: string; sideCm: string; napeCm: string };
      angle?: Angle;
      gridMode?: boolean; // experimental: ask model to output 2x2 grid using all angle photos
      genPromptVersion?: string; // "p1" (default) | "p2" length-adaptive — see lib/generationPrompts.ts
      gender?: string;           // used to pick a men-only reference
      hairlineShape?: string;    // from analysis — kept honest in generation
      hairlineNotes?: string;
      useReference?: boolean;    // default true: use a dataset reference image when one matches
      recolorTo?: string;        // set → recolour the CURRENT cut to this shade (no restyle)
      // Combined multi-service selection → ONE composed prompt. hair uses styleName
      // for the cut; colorName recolours; beardStyle changes the beard.
      combo?: { hair?: boolean; colorName?: string; beardStyle?: string };
    };

    if (!styleName && !customDescription && !recolorTo && !combo) {
      return NextResponse.json({ error: "Missing style name" }, { status: 400 });
    }

    const rawAnglePhotos: Partial<Record<Angle, AnglePhoto>> = photos ?? {};
    if ((photoBase64 || photoUrl) && !rawAnglePhotos.front) {
      rawAnglePhotos.front = {
        base64: photoBase64,
        mediaType: photoMediaType,
        url: photoUrl,
      };
    }

    // Resolve any data URIs or HTTP storage URLs to base64
    const resolvedAnglePhotos: Partial<Record<Angle, { base64: string; mediaType: string }>> = {};
    await Promise.all(
      (["front", "left", "right", "back"] as Angle[]).map(async (ang) => {
        const raw = rawAnglePhotos[ang];
        if (raw) {
          const res = await resolveAnglePhoto(raw);
          if (res) resolvedAnglePhotos[ang] = res;
        }
      })
    );

    // If photos are still empty and visitId is provided, retrieve original photos from Supabase Storage
    if (Object.keys(resolvedAnglePhotos).length === 0 && visitId) {
      try {
        const dbPhotos = await getVisitPhotos(visitId);
        const originals = dbPhotos.filter((p) => p.kind === "original" && p.url);
        await Promise.all(
          originals.map(async (op) => {
            const ang = (op.angle as Angle) || "front";
            if (!resolvedAnglePhotos[ang] && op.url) {
              const res = await resolveAnglePhoto({ url: op.url });
              if (res) resolvedAnglePhotos[ang] = res;
            }
          })
        );
      } catch (err) {
        console.warn("[generate-hairstyle] failed to load photos from visitId:", visitId, err);
      }
    }

    // Use requested angle, falling back to front or first available angle
    const srcAngle: Angle = (angle && resolvedAnglePhotos[angle])
      ? angle
      : resolvedAnglePhotos.front
        ? "front"
        : ((Object.keys(resolvedAnglePhotos)[0] as Angle) || "front");
    const src = resolvedAnglePhotos[srcAngle];
    if (!src?.base64) {
      return NextResponse.json({ error: "A reference photo is required." }, { status: 400 });
    }

    const target = editTarget === "beard" ? "beard" : "hair";

    // Use the style name directly — Groq expansion rewrites descriptions in ways
    // that confuse the image model and cause face drift. Raw name is precise enough.
    const rawName = customDescription ?? styleName ?? (recolorTo ? `${recolorTo} hair colour` : "hair colour");
    const [, notes] = await Promise.all([
      Promise.resolve(rawName), // no-op slot to keep destructuring
      buildStyleNotes(
        target,
        rawName,
        hairColor,
        hairTexture,
        hairMeasurements
          ? `top ${hairMeasurements.topCm}, sides ${hairMeasurements.sideCm}, nape ${hairMeasurements.napeCm}`
          : lengthAnchor(hairLength),
        faceShape
      ),
    ]);
    const hairDescription = rawName;

    // Length constraint line — zone measurements preferred over generic scale.
    const lengthConstraint = hairMeasurements
      ? `Current hair: top ${hairMeasurements.topCm}, sides ${hairMeasurements.sideCm}, nape ${hairMeasurements.napeCm}. Do not increase the current hair length. Only shorten or reshape the existing hair.`
      : hairLength
        ? `Do not increase the current hair length. Only shorten or reshape the existing hair.`
        : "Do not increase the current hair length. Only shorten or reshape the existing hair.";

    let prompt: string;
    let genVersion = "-";
    let referenceUsed: ReturnType<typeof findReference> = null;

    // Ordered real angle photos for the four-angle grid pipeline (front→TL, left→TR,
    // right→BL, back→BR). When all four exist we edit each REAL photo (identity-safe);
    // the style comes from WORDS, never a reference image.
    const ANGLE_ORDER: Angle[] = ["front", "left", "right", "back"];
    const orderedAngles = ANGLE_ORDER
      .map((a) => resolvedAnglePhotos[a])
      .filter((p): p is { base64: string; mediaType: string } => !!p?.base64);
    const haveFourAngles = orderedAngles.length === 4;
    let useFourAngle = false;

    if (target === "beard") {
      const styleDetails = [
        hairColor   ? `Keep ${hairColor} hair color` : "",
        hairTexture ? `${hairTexture} texture`        : "",
        hairDensity ? `${hairDensity} density`        : "",
      ].filter(Boolean).join(", ");
      const keepLine = [
        faceShape ? `${faceShape} face shape` : "",
        skinTone  ? `${skinTone} skin tone`   : "",
      ].filter(Boolean).join(", ");

      prompt = [
        "Edit only the beard.",
        "Keep the same person. Do not change the hair on top, face, skin, ears, neck, clothing, background or lighting.",
        `Apply a ${hairDescription}.${styleDetails ? ` ${styleDetails}.` : ""}`,
        keepLine ? `Person has ${keepLine}.` : "",
        "Keep hair on top completely unchanged.",
        "Photorealistic.",
      ].filter(Boolean).join("\n\n");
    } else {
      const beardInstruction =
        includeBeard === true  ? "Add a neat, well-groomed beard." :
        includeBeard === false ? "Keep the face completely clean shaven." :
        "Do not change the beard or facial hair.";

      const contextLine = [
        faceShape ? `${faceShape} face shape` : "",
        skinTone  ? `${skinTone} skin tone`   : "",
      ].filter(Boolean).join(", ");

      // Reference-guided generation is OPT-IN (useReference === true), because the
      // aura cards are a MIX of neutral mannequins and REAL PEOPLE. A real-person
      // card bleeds its face, beard and age onto the customer — no prompt reliably
      // stops nano-banana copying a second person's face. The default text path
      // edits only the customer's own photo, so identity is always preserved.
      const wantReference = useReference === true && !customDescription;
      const reference = wantReference ? findReference(styleName ?? "", gender, hairLength) : null;
      if (reference) referenceUsed = reference; // for the "matched to X" echo

      // The style is described in WORDS: a pre-computed card description when one
      // matched, otherwise the style name / custom text. No reference IMAGE is passed —
      // that competing second head was the main cause of face drift.
      const styleText = reference?.description || hairDescription;

      const genParams = {
        hairDescription: styleText,
        hairColor,
        hairTexture,
        hairDensity,
        styleName,
        hairLength,
        contextLine: contextLine ? `Person has ${contextLine}` : "",
        lengthConstraint,
        beardInstruction,
        gridMode: !!gridMode,
        targetCm: styleName ? getStyleTargetCm(styleName) : null,
        hairlineShape,
        hairlineNotes,
      };

      if (combo && gridMode && haveFourAngles) {
        // Combined multi-service selection → ONE composed prompt (cut + colour + beard).
        useFourAngle = true;
        let hairDescription: string | undefined;
        if (combo.hair) {
          const ref = useReference !== false ? findReference(styleName ?? "", gender, hairLength) : null;
          if (ref) referenceUsed = ref;
          hairDescription = ref?.description || styleName || undefined;
        }
        const colorHex = combo.colorName ? findColor(combo.colorName)?.hex : undefined;
        prompt = buildCombinedPrompt({
          gender,
          hairDescription,
          colorName: combo.colorName,
          colorHex,
          hairColor,
          hairTexture,
          beardInstruction: combo.beardStyle,
        });
        genVersion = `combo:${[combo.hair ? "hair" : "", combo.colorName ? "colour" : "", combo.beardStyle ? "beard" : ""].filter(Boolean).join("+")}`;
      } else if (recolorTo && gridMode && haveFourAngles) {
        // Colour preview: keep the current cut, only recolour the hair. Attach the
        // palette hex when the shade is recognised, so the AI renders the exact tone.
        useFourAngle = true;
        const hex = findColor(recolorTo)?.hex;
        prompt = buildRecolorGridPrompt({ recolorTo, gender, hex });
        genVersion = `recolor:${recolorTo}${hex ? `(${hex})` : ""}`;
      } else if (gridMode && haveFourAngles) {
        // Validated pipeline: four real photos + word description → one grid, one call.
        useFourAngle = true;
        prompt = buildFourAngleGridPrompt({ hairDescription: styleText, hairColor, hairTexture, beardInstruction, gender });
        genVersion = reference?.description ? `4angle:${reference.id}` : "4angle";
      } else {
        // Single image, or grid requested without all four angles → versioned text
        // edit (no reference image; front-only grid still synthesises if gridMode).
        const built = buildHairGenPrompt(genPromptVersion, genParams);
        prompt = built.text;
        genVersion = built.version;
      }
    }

    console.log(`[generate-hairstyle] Prompt (gen=${genVersion}):\n${prompt}`);

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 503 });
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Four-angle pipeline sends the FOUR real photos (front, left, right, back) in
    // order, so every panel is an edit of a real photo of that angle — the face is
    // never invented. Otherwise: the front photo for a single-photo grid, or the
    // requested angle for a single edit.
    const imageInputs = useFourAngle
      ? orderedAngles.map((a) => `data:${a.mediaType};base64,${a.base64}`)
      : gridMode
        ? [`data:${(resolvedAnglePhotos.front ?? src).mediaType};base64,${(resolvedAnglePhotos.front ?? src).base64}`]
        : [`data:${src.mediaType};base64,${src.base64}`];

    if (referenceUsed) {
      console.log(`[generate-hairstyle] style from reference ${referenceUsed.id} (${referenceUsed.slug}, score ${referenceUsed.score.toFixed(2)})${referenceUsed.description ? " [described]" : ""}`);
    }

    const output = await replicate.run(REPLICATE_MODEL, {
      input: {
        prompt,
        image_input: imageInputs,
        resolution: recolorTo ? COLOR_RESOLUTION : gridMode ? GRID_RESOLUTION : OUTPUT_RESOLUTION,
      },
    }) as { url: () => string };

    const imageUrl = output?.url?.();
    if (!imageUrl) {
      console.error("[generate-hairstyle] No image URL in response:", output);
      return NextResponse.json({ error: "Image generation failed — no URL returned." }, { status: 502 });
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to fetch generated image." }, { status: 502 });
    }
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    // Reference metadata echoed back so the UI can show "matched to <style>".
    const referenceInfo = referenceUsed
      ? { id: referenceUsed.id, name: referenceUsed.name, image: referenceUsed.image, score: Number(referenceUsed.score.toFixed(2)) }
      : null;

    // Grid mode: split the native-4K 2×2 output into 4 separate angle images.
    if (gridMode) {
      const [front, left, right, back] = await splitGrid(imgBuffer);
      return NextResponse.json({
        imageUrl: `data:image/jpeg;base64,${front}`,
        angles: { front: `data:image/jpeg;base64,${front}`, left: `data:image/jpeg;base64,${left}`, right: `data:image/jpeg;base64,${right}`, back: `data:image/jpeg;base64,${back}` },
        whySuits: notes.whySuits,
        summary: notes.summary,
        barberInstructions: notes.barberInstructions,
        reference: referenceInfo,
      });
    }

    const base64 = imgBuffer.toString("base64");
    const mimeType = imgRes.headers.get("content-type") ?? "image/png";
    return NextResponse.json({
      imageUrl: `data:${mimeType};base64,${base64}`,
      whySuits: notes.whySuits,
      summary: notes.summary,
      barberInstructions: notes.barberInstructions,
      reference: referenceInfo,
    });
  } catch (err) {
    console.error("[generate-hairstyle] Error:", err);
    return NextResponse.json(
      { error: "Image generation failed. Please try again." },
      { status: 500 }
    );
  }
}
