import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { Jimp } from "jimp";
import { fetchSafeRemoteImage } from "@/lib/remoteImage";
import { getVisitPhotos } from "@/lib/visitPhotos";

export const maxDuration = 60;

const REPLICATE_MODEL = "google/nano-banana-2";

async function urlToDataUri(url: string): Promise<string> {
  const { buffer, contentType } = await fetchSafeRemoteImage(url);
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

// Cuts the 2×2 collage into four standalone angle images: [front, left, right, back]
async function splitGrid(buffer: Buffer): Promise<string[]> {
  const img = await Jimp.read(buffer);
  const w = Math.floor(img.bitmap.width / 2);
  const h = Math.floor(img.bitmap.height / 2);
  const quads: string[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const tile = img.clone().crop({ x: col * w, y: row * h, w, h });
      quads.push((await tile.getBuffer("image/jpeg", { quality: 88 })).toString("base64"));
    }
  }
  return quads; // [front, left, right, back]
}

function buildTransferPrompt(options: {
  styleName?: string;
  customerEstimatedLength?: string;
  referenceRequiredLength?: string;
  isLengthSufficient?: boolean;
  lengthDifferenceNotes?: string;
  hairLength?: string;
  hairMeasurements?: { topCm?: string; sideCm?: string; napeCm?: string };
}): string {
  const currentLengthStr =
    options.customerEstimatedLength ||
    (options.hairMeasurements?.topCm
      ? `top: ${options.hairMeasurements.topCm}, sides: ${options.hairMeasurements.sideCm || "short"}, nape: ${options.hairMeasurements.napeCm || "short"}`
      : options.hairLength) ||
    "exact current length shown in Image 1";

  const isShortOrNeedsGrowth =
    options.isLengthSufficient === false ||
    Boolean(options.lengthDifferenceNotes) ||
    Boolean(options.customerEstimatedLength);

  return [
    "Image 1 is a photograph of a real customer. Image 2 is a reference hairstyle.",
    `TASK: Adapt the haircut technique, texture, layer separation, parting, and side fade/taper from the reference hairstyle ("${options.styleName || "Reference Hairstyle"}") onto the person in Image 1.`,
    "",
    "CRITICAL HAIR LENGTH INSTRUCTION — STRICT PHYSICAL REALISM & HARD CEILING:",
    `- CUSTOMER CURRENT HAIR LENGTH CAP: ${currentLengthStr}.`,
    "- STRICT MAXIMUM LENGTH: Do NOT grow hair, do NOT add hair extensions, and do NOT simulate longer hair than the customer currently has in Image 1.",
    "- If the reference photo (Image 2) features longer hair (such as longer flow, shoulder length, or longer bulk), you MUST execute an ADAPTED, SHORTER / CROPPED variation of this hairstyle that stays strictly WITHIN the customer's current hair perimeter.",
    "- Hair length cannot extend past the customer's existing neck/ear boundary from Image 1. You may only CUT, TEXTURIZE, TAPER, FADE, and STYLE DOWN from their current length; NEVER lengthen.",
    isShortOrNeedsGrowth
      ? `- SPECIFIC LENGTH RESTRICTION: The customer's hair is shorter than the reference model's hair (${options.lengthDifferenceNotes || "maintain customer hair boundary"}). Do NOT copy the long silhouette of Image 2. Instead, scale the texture and cutting pattern into the customer's current short-to-medium length.`
      : "",
    "",
    "FACE & IDENTITY PRESERVATION:",
    "Preserve their exact identity: keep the same face, eyes, nose, mouth, eyebrows, jawline, cheeks, skin tone, facial hair, clothing, and lighting unchanged.",
    "",
    "OUTPUT FORMAT:",
    "Output a 2×2 grid showing this SAME person with the adapted hairstyle from four views in this exact order:",
    "TOP-LEFT = front view (face to camera, exact original face)",
    "TOP-RIGHT = LEFT-side profile (head turned 90° so left ear faces camera)",
    "BOTTOM-LEFT = RIGHT-side profile (head turned 90° so right ear faces camera)",
    "BOTTOM-RIGHT = back of the head (180° back view)",
    "All four panels show the exact same haircut on that one head. Real photographic hair with visible strands, natural matte finish, no plastic CGI sheen.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const {
      targetBase64,
      targetMediaType = "image/jpeg",
      targetUrl,
      visitId,
      referenceUrl,
      referenceBase64,
      referenceMediaType = "image/jpeg",
      styleName = "Reference Hairstyle",
      customerEstimatedLength,
      referenceRequiredLength,
      isLengthSufficient,
      lengthDifferenceNotes,
      customerHairMeasurements,
      hairLength,
    } = (await req.json()) as {
      targetBase64?: string;
      targetMediaType?: string;
      targetUrl?: string;
      visitId?: string;
      referenceUrl?: string;
      referenceBase64?: string;
      referenceMediaType?: string;
      styleName?: string;
      customerEstimatedLength?: string;
      referenceRequiredLength?: string;
      isLengthSufficient?: boolean;
      lengthDifferenceNotes?: string;
      customerHairMeasurements?: { topCm?: string; sideCm?: string; napeCm?: string };
      hairLength?: string;
    };

    let targetUri: string | null = null;
    if (targetBase64) {
      const cleanTargetBase64 = targetBase64.includes(";base64,")
        ? targetBase64.split(";base64,")[1]
        : targetBase64;
      targetUri = `data:${targetMediaType};base64,${cleanTargetBase64}`;
    } else if (targetUrl) {
      try {
        targetUri = await urlToDataUri(targetUrl);
      } catch (err) {
        console.warn("[hair-transfer] failed to load targetUrl:", targetUrl, err);
      }
    }

    if (!targetUri && visitId) {
      try {
        const dbPhotos = await getVisitPhotos(visitId);
        const front = dbPhotos.find((p) => p.kind === "original" && (p.angle === "front" || !p.angle) && p.url);
        if (front?.url) {
          targetUri = await urlToDataUri(front.url);
        }
      } catch (err) {
        console.warn("[hair-transfer] failed to load target photo from visitId:", visitId, err);
      }
    }

    if (!targetUri) {
      return NextResponse.json({ error: "A customer photo is required." }, { status: 400 });
    }
    if (!referenceUrl && !referenceBase64) {
      return NextResponse.json({ error: "A reference hairstyle is required." }, { status: 400 });
    }

    if (process.env.USE_MOCK_ANALYSIS === "true" || !process.env.REPLICATE_API_TOKEN) {
      // Return target image for demo simulation if token not configured
      return NextResponse.json({
        imageUrl: targetUri,
        angles: {
          front: targetUri,
          left: targetUri,
          right: targetUri,
          back: targetUri,
        },
        styleName,
      });
    }

    let referenceUri: string;
    if (referenceBase64) {
      const cleanRefBase64 = referenceBase64.includes(";base64,")
        ? referenceBase64.split(";base64,")[1]
        : referenceBase64;
      referenceUri = `data:${referenceMediaType};base64,${cleanRefBase64}`;
    } else {
      referenceUri = await urlToDataUri(referenceUrl!);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const prompt = buildTransferPrompt({
      styleName,
      customerEstimatedLength,
      referenceRequiredLength,
      isLengthSufficient,
      lengthDifferenceNotes,
      hairMeasurements: customerHairMeasurements,
      hairLength,
    });

    let output: { url: () => string };
    try {
      output = (await replicate.run(REPLICATE_MODEL, {
        input: {
          prompt,
          image_input: [targetUri, referenceUri], // [person, reference]
          resolution: "2K",
        },
      })) as { url: () => string };
    } catch (err) {
      console.error("[hair-transfer] model call failed:", err);
      return NextResponse.json({ error: "Transfer failed. Please try again." }, { status: 502 });
    }

    const imageUrl = output?.url?.();
    if (!imageUrl) {
      return NextResponse.json({ error: "No image returned." }, { status: 502 });
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to fetch result." }, { status: 502 });
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    let quads: string[];
    try {
      quads = await splitGrid(buffer);
    } catch (splitErr) {
      console.warn("[hair-transfer] grid split fallback:", splitErr);
      const fallbackBase64 = buffer.toString("base64");
      const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
      const fallbackUrl = `data:${mimeType};base64,${fallbackBase64}`;
      return NextResponse.json({
        imageUrl: fallbackUrl,
        angles: {
          front: fallbackUrl,
          left: fallbackUrl,
          right: fallbackUrl,
          back: fallbackUrl,
        },
        styleName,
      });
    }

    const frontUri = `data:image/jpeg;base64,${quads[0]}`;
    const leftUri = `data:image/jpeg;base64,${quads[1]}`;
    const rightUri = `data:image/jpeg;base64,${quads[2]}`;
    const backUri = `data:image/jpeg;base64,${quads[3]}`;

    return NextResponse.json({
      imageUrl: frontUri,
      angles: {
        front: frontUri,
        left: leftUri,
        right: rightUri,
        back: backUri,
      },
      styleName,
    });
  } catch (err) {
    console.error("[hair-transfer] error:", err);
    return NextResponse.json({ error: "Transfer failed. Please try again." }, { status: 500 });
  }
}
