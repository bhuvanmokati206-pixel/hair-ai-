import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { Jimp } from "jimp";
// @ts-expect-error gif-encoder-2 has no types
import GIFEncoder from "gif-encoder-2";

// schnell is the fast/cheap FLUX variant — appropriate for 4 quick low-detail frames.
const REPLICATE_MODEL = "black-forest-labs/flux-schnell";

const DIRECTIONS = [
  { suffix: "front facing, looking straight at camera" },
  { suffix: "left side profile view, facing left" },
  { suffix: "back of head view, rear view" },
  { suffix: "right side profile view, facing right" },
];

async function generateFrame(
  basePrompt: string,
  direction: typeof DIRECTIONS[number],
): Promise<Buffer | null> {
  try {
    if (!process.env.REPLICATE_API_TOKEN) return null;

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const output = await replicate.run(REPLICATE_MODEL, {
      input: {
        prompt: `${basePrompt}, ${direction.suffix}`,
        aspect_ratio: "1:1",
        num_inference_steps: 4,
      },
    }) as Array<{ url: () => string }>;

    const imageUrl = output?.[0]?.url?.();
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    return Buffer.from(await imgRes.arrayBuffer());
  } catch (err) {
    console.error("[generate-gif] Frame generation error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { styleName, gender, hairColor, hairTexture } = await req.json() as {
    styleName: string; gender?: string; hairColor?: string; hairTexture?: string;
  };

  if (!styleName) return NextResponse.json({ error: "Missing styleName" }, { status: 400 });

  const subject = gender === "female" ? "female model" : "male model";
  const basePrompt = [
    `professional studio portrait of a ${subject}`,
    `${styleName} hairstyle`,
    hairColor ? `${hairColor} hair` : "",
    hairTexture ? `${hairTexture} texture` : "",
    "photorealistic, high detail, sharp focus, soft studio lighting, plain neutral background",
  ].filter(Boolean).join(", ");

  // Generate frames sequentially to avoid exhausting ZeroGPU quota
  const frameBuffers: (Buffer | null)[] = [];
  for (const d of DIRECTIONS) {
    frameBuffers.push(await generateFrame(basePrompt, d));
  }

  if (frameBuffers.some((f) => f === null)) {
    return NextResponse.json({ error: "One or more frames failed. Please retry." }, { status: 502 });
  }

  const WIDTH = 512;
  const HEIGHT = 512;
  const encoder = new GIFEncoder(WIDTH, HEIGHT, "neuquant", true);
  encoder.setDelay(700);
  encoder.setQuality(10);
  encoder.start();

  for (const buf of frameBuffers) {
    const img = await Jimp.read(buf!);
    img.resize({ w: WIDTH, h: HEIGHT });
    // Jimp stores pixels as RGBA in a flat Buffer — extract raw RGBA bytes
    const rgba = img.bitmap.data as Buffer;
    encoder.addFrame(rgba);
  }

  encoder.finish();
  const gifBuffer: Buffer = encoder.out.getData();
  return NextResponse.json({ gifUrl: `data:image/gif;base64,${gifBuffer.toString("base64")}` });
}
