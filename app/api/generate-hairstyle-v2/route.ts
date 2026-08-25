import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// Instruction-following image editor. Replaces the old
// segment → inpaint → face-lock chain, which produced hard mask edges
// ("helmet hair") and failed outright whenever segmentation returned an
// empty mask.
const REPLICATE_MODEL = "google/nano-banana-2";
// llama-3.3-70b-versatile was retired by Groq (404). openai/gpt-oss-120b is the
// current text model; it reasons, so keep max_tokens generous + reasoning_effort low.
const GROQ_MODEL = "openai/gpt-oss-120b";

// Expands a short style name into a detailed structural description for inpainting.
// FLUX Fill Pro follows visual/structural language much better than bare names.
function expandStyleDescription(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes("undercut"))
    return "undercut haircut — sides and back clipped very short with a hard disconnected line, top hair left at its natural length and texture, no gel or product, unstyled natural look on top";
  if (n.includes("fade") && n.includes("pompadour"))
    return "pompadour fade — top hair voluminous with natural texture, sides tapered with a skin fade from zero at the temples";
  if (n.includes("pompadour"))
    return "pompadour — top hair with natural volume and texture, sides shorter, no product or gel appearance";
  if (n.includes("fade"))
    return "fade cut — top hair at natural length and texture, sides and back gradually tapered to skin at the temples and neck";
  if (n.includes("quiff"))
    return "quiff — front hair with natural lift and volume, sides shorter, no gel or product";
  if (n.includes("buzz"))
    return "buzz cut — uniformly short hair all over the head, 3-5mm, even and clean";
  if (n.includes("textured crop") || n.includes("crop"))
    return "textured crop — short choppy natural texture on top, slight fringe, sides short";
  if (n.includes("mullet"))
    return "mullet — top and sides short, back significantly longer, natural texture throughout";
  if (n.includes("slick back") || n.includes("slickback"))
    return "slicked back — hair combed back, smooth finish, sides back too";
  return name; // fall back to raw name if no match
}

function lengthAnchor(hairLength?: string): string {
  switch ((hairLength ?? "").toLowerCase()) {
    case "very_short": return "no longer than 1cm, buzzed close to the scalp";
    case "short":      return "not past the top of the ears";
    case "medium":     return "not past the bottom of the ears or jawline";
    case "long":       return "not past the shoulders";
    default:           return "";
  }
}

async function buildStyleNotes(
  target: "hair" | "beard",
  description: string,
  color?: string,
  texture?: string,
  lengthLimit?: string
): Promise<{ summary: string; barberInstructions: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  const subject = target === "beard" ? "beard style" : "hairstyle";
  const verb = target === "beard" ? "trimming/shaping" : "cutting";
  const fallback = {
    summary: `${description}. A clean, low-maintenance ${subject}.`,
    barberInstructions: `${target === "beard" ? "Shape" : "Cut"}: ${description}.${color ? ` Colour: ${color}.` : ""}${texture ? ` Texture: ${texture}.` : ""}${lengthLimit ? ` Length limit: ${lengthLimit}.` : ""}`,
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
          content: `A customer is getting this ${subject}: "${description}"${color ? `, colour: ${color}` : ""}${texture ? `, texture: ${texture}` : ""}.${lengthLimit ? ` Length limit: ${lengthLimit}.` : ""}
Return ONLY valid JSON, no markdown:
{
  "summary": "2-3 sentence customer-facing description of the look and why it suits them",
  "barberInstructions": "Concise step-by-step ${verb} instructions a barber would follow"
}`,
        }],
        temperature: 0.4,
        max_tokens: 900,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    return {
      summary: parsed.summary ?? fallback.summary,
      barberInstructions: parsed.barberInstructions ?? fallback.barberInstructions,
    };
  } catch {
    return fallback;
  }
}

// "natural", "same", "original", or empty = keep existing color; anything else = explicit change
function isColorChangeRequested(color?: string): boolean {
  if (!color) return false;
  const normalized = color.trim().toLowerCase();
  return normalized !== "" && normalized !== "natural" && normalized !== "same" && normalized !== "original";
}

// Builds an edit instruction for nano-banana-2. It sees the whole photo, so the
// prompt has to name what must NOT change as explicitly as what must — otherwise
// the model drifts the face along with the hair.
function buildEditPrompt(
  target: "hair" | "beard",
  description: string,
  color?: string,
  texture?: string,
  lengthLimit?: string,
  includeBeard?: boolean
): string {
  if (target === "beard") {
    const colorLine = isColorChangeRequested(color)
      ? `Beard colour: ${color}.`
      : "Keep the exact same beard colour as in the original photo.";
    return [
      "Edit only the beard.",
      "Keep the same person. Do not change the hair on top, face, skin, ears, neck, clothing, background or lighting.",
      `Apply a ${description} beard style.`,
      colorLine,
      "Photorealistic.",
    ].filter(Boolean).join("\n\n");
  }

  const beardLine =
    includeBeard === true  ? "Add a neat, well-groomed beard." :
    includeBeard === false ? "Keep the face completely clean shaven." :
    "Do not change the beard or facial hair.";

  const colorLine = isColorChangeRequested(color)
    ? `Hair colour: ${color}.`
    : "Keep the exact same hair colour as in the original photo — do not change or alter the colour.";

  const textureAnchor = texture
    ? `Hair texture: ${texture}.`
    : "Preserve the exact same hair texture and wave pattern as the original photo — same curl, wave, and thickness.";

  return [
    "Edit only the hair.",
    "Keep the same person. Do not change the face, beard, skin, ears, neck, clothing, background or lighting.",
    `Apply a ${description} hairstyle.`,
    colorLine,
    textureAnchor,
    lengthLimit ? `Hair length: ${lengthLimit}. Do not increase the current hair length.` : "Do not increase the current hair length.",
    beardLine,
    "No gel, no product sheen, no smoothing. Individual strands visible, matte natural finish, seamless blend at the hairline. Photorealistic.",
  ].filter(Boolean).join("\n\n");
}

type AnglePhoto = { base64: string; mediaType: string };
type Angle = "front" | "left" | "right" | "back";

// Edits one angle photo with nano-banana-2 and returns it as a data URI.
async function generateOneAngle(
  replicate: Replicate,
  photo: AnglePhoto,
  prompt: string
): Promise<string | null> {
  try {
    const output = await replicate.run(REPLICATE_MODEL, {
      input: {
        prompt,
        image_input: [`data:${photo.mediaType};base64,${photo.base64}`],
        resolution: "1K",
      },
    }) as { url: () => string };

    const imageUrl = output?.url?.();
    if (!imageUrl) {
      console.error("[generate-hairstyle-v2] no image URL in response:", output);
      return null;
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error("[generate-hairstyle-v2] failed to fetch generated image:", imgRes.status);
      return null;
    }
    const base64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
    const mimeType = imgRes.headers.get("content-type") ?? "image/png";

    return `data:${mimeType};base64,${base64}`;
  } catch (err) {
    console.error("[generate-hairstyle-v2] angle failed:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      styleName, hairColor, hairTexture, includeBeard, customDescription,
      photoBase64, photoMediaType, photos, hairLength, editTarget,
    } = await req.json() as {
      styleName?: string; hairColor?: string; hairTexture?: string; includeBeard?: boolean;
      customDescription?: string; photoBase64?: string; photoMediaType?: string;
      photos?: Partial<Record<Angle, AnglePhoto>>;
      hairLength?: string; editTarget?: "hair" | "beard";
    };

    if (!styleName && !customDescription) {
      return NextResponse.json({ error: "Missing style name" }, { status: 400 });
    }
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 503 });
    }

    const anglePhotos: Partial<Record<Angle, AnglePhoto>> = photos ?? {};
    if (photoBase64 && photoMediaType && !anglePhotos.front) {
      anglePhotos.front = { base64: photoBase64, mediaType: photoMediaType };
    }
    const orderedAngles: Angle[] = ["front", "left", "right", "back"];
    const primaryAngleKey = orderedAngles.find((a) => anglePhotos[a]?.base64);

    if (!primaryAngleKey) {
      return NextResponse.json({ error: "A reference photo is required." }, { status: 400 });
    }

    const target = editTarget === "beard" ? "beard" : "hair";
    const rawDescription = customDescription ?? styleName!;
    const hairDescription = target === "hair" ? expandStyleDescription(rawDescription) : rawDescription;
    const lengthLimit = lengthAnchor(hairLength);

    const prompt = buildEditPrompt(target, hairDescription, hairColor, hairTexture, lengthLimit, includeBeard);

    console.log(`[generate-hairstyle-v2] Prompt:\n${prompt}`);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Single image only — generate for the primary angle (front if available)
    const angleResults: Partial<Record<Angle, string>> = {};
    const result = await generateOneAngle(replicate, anglePhotos[primaryAngleKey]!, prompt);
    if (result) angleResults[primaryAngleKey] = result;

    if (Object.keys(angleResults).length === 0) {
      return NextResponse.json({ error: "All angle generations failed. Please try again." }, { status: 502 });
    }

    const primaryAngle = (["front", "left", "right", "back"] as Angle[]).find((a) => angleResults[a]);
    const notes = await buildStyleNotes(target, hairDescription, hairColor, hairTexture, lengthLimit);

    return NextResponse.json({
      imageUrl: angleResults[primaryAngle!],
      angles: angleResults,
      summary: notes.summary,
      barberInstructions: notes.barberInstructions,
    });
  } catch (err) {
    console.error("[generate-hairstyle-v2] Error:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
