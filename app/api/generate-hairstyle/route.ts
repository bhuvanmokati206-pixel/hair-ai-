import { NextRequest, NextResponse } from "next/server";

// Hugging Face free text-to-image. This generates a REFERENCE model showing the
// hairstyle (a generic person), NOT the customer's own face. True face-preserving
// "try-on" needs a paid image-editing model (Gemini / Replicate) — see notes in
// the git history. This is the free reference-preview version.
const HF_MODEL = process.env.HF_MODEL || "black-forest-labs/FLUX.1-schnell";
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const { styleName, gender, hairColor, hairTexture, includeBeard } = await req.json();

    if (!styleName) {
      return NextResponse.json({ error: "Missing style name" }, { status: 400 });
    }

    const subject = gender === "female" ? "female model" : "male model";

    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Image generation not configured. Add HF_API_KEY to .env.local." },
        { status: 503 }
      );
    }

    // Beard only applies to male subjects
    const beardPart =
      gender === "female" ? "" : includeBeard ? "with a well-groomed beard, " : "clean shaven, ";
    const prompt = [
      `professional studio portrait photograph of a ${subject}`,
      `${styleName} hairstyle`,
      hairColor ? `${hairColor} hair` : "",
      hairTexture ? `${hairTexture} hair texture` : "",
      beardPart,
      "photorealistic, high detail, sharp focus, soft studio lighting",
      "plain neutral background, front-facing head and shoulders portrait",
    ]
      .filter(Boolean)
      .join(", ");

    let imgBuffer: ArrayBuffer | null = null;
    let lastStatus = 0;
    let lastErr = "";

    // HF cold-starts models (503 "loading") — retry a few times with backoff.
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(HF_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width: 512, height: 640 },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (res.ok) {
        imgBuffer = await res.arrayBuffer();
        break;
      }

      lastStatus = res.status;
      lastErr = await res.text().catch(() => "");
      console.error(`HF ${HF_MODEL} → ${res.status}`, lastErr.slice(0, 200));

      // 503 = model warming up; 429 = rate limited. Back off and retry.
      if (res.status === 503 || res.status === 429) {
        await sleep(4000);
        continue;
      }
      break; // other errors won't fix themselves
    }

    if (!imgBuffer) {
      const msg =
        lastStatus === 503
          ? "Image model is warming up. Try again in ~20 seconds."
          : lastStatus === 429
          ? "Rate limit hit. Wait a moment and try again."
          : "Image generation failed. Please try again.";
      return NextResponse.json({ error: msg, lastStatus }, { status: 502 });
    }

    const base64 = Buffer.from(imgBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    return NextResponse.json({ imageUrl: dataUrl });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json(
      { error: "Image generation failed. Please try again." },
      { status: 500 }
    );
  }
}
