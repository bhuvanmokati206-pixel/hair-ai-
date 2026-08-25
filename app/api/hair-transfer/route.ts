// POST /api/hair-transfer — put a reference hairstyle onto the customer.
//
// nano-banana-2 is multi-image: we pass [customerPhoto, referencePhoto] and ask
// it to copy the hairstyle from image 2 onto the person in image 1. Not a
// dedicated hair-transfer model (HairFastGAN would be better), so it approximates
// the reference — see the queued spike before trusting it in production.

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const REPLICATE_MODEL = "google/nano-banana-2";

// Fetch a reference URL to base64 server-side. Keeps the model off third-party
// hosts and dodges hotlink/CSP issues; caps size so a huge image can't stall.
async function urlToDataUri(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`reference fetch ${res.status}`);
  const type = res.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/")) throw new Error("reference is not an image");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) throw new Error("reference image too large");
  return `data:${type};base64,${buf.toString("base64")}`;
}

const PROMPT = [
  "Image 1 is a photo of a person. Image 2 is a reference hairstyle.",
  "Give the person in image 1 the exact hairstyle, shape, length and colour from image 2.",
  "Keep the person's face, skin tone, identity, ears, neck, clothing, background and lighting unchanged — change only the hair.",
  "No gel or product sheen, no smoothing. Individual strands visible, matte natural finish, seamless blend at the hairline.",
  "Photorealistic.",
].join("\n\n");

export async function POST(req: NextRequest) {
  try {
    const {
      targetBase64, targetMediaType, referenceUrl, referenceBase64, referenceMediaType,
    } = await req.json() as {
      targetBase64?: string; targetMediaType?: string;
      referenceUrl?: string; referenceBase64?: string; referenceMediaType?: string;
    };

    if (!targetBase64 || !targetMediaType) {
      return NextResponse.json({ error: "A customer photo is required." }, { status: 400 });
    }
    if (!referenceUrl && !referenceBase64) {
      return NextResponse.json({ error: "A reference hairstyle is required." }, { status: 400 });
    }
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 503 });
    }

    const targetUri = `data:${targetMediaType};base64,${targetBase64}`;
    const referenceUri = referenceBase64
      ? `data:${referenceMediaType ?? "image/jpeg"};base64,${referenceBase64}`
      : await urlToDataUri(referenceUrl!);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    let output: { url: () => string };
    try {
      output = await replicate.run(REPLICATE_MODEL, {
        input: {
          prompt: PROMPT,
          image_input: [targetUri, referenceUri], // order matters: [person, reference]
          resolution: "1K", // kept at 1K for faster generation
        },
      }) as { url: () => string };
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
    const base64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
    const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";

    return NextResponse.json({ imageUrl: `data:${mimeType};base64,${base64}` });
  } catch (err) {
    console.error("[hair-transfer] error:", err);
    return NextResponse.json({ error: "Transfer failed. Please try again." }, { status: 500 });
  }
}
