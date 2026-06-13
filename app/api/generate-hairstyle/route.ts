import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { styleName, hairColor, hairTexture, includeBeard } = await req.json();

    if (!styleName) {
      return NextResponse.json({ error: "Missing style name" }, { status: 400 });
    }

    // Build a detailed prompt for Pollinations.ai (completely free, no key needed)
    const beardPart = includeBeard ? "with a well-groomed beard, " : "";
    const prompt = [
      "professional studio portrait photo of a man",
      `${styleName} hairstyle`,
      `${hairColor} hair`,
      `${hairTexture} hair texture`,
      beardPart,
      "photorealistic, high quality, sharp focus, neutral background",
      "front-facing portrait, natural lighting",
    ].filter(Boolean).join(", ");

    const encoded = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const pollinationsUrl =
      `https://image.pollinations.ai/prompt/${encoded}?width=512&height=640&nologo=true&seed=${seed}`;

    // Fetch the image from Pollinations and convert to base64 data URL
    const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(30000) });

    if (!imgRes.ok) {
      return NextResponse.json(
        { error: "Image generation failed. Please try again." },
        { status: 422 }
      );
    }

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ imageUrl: dataUrl });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json(
      { error: "Image generation failed. Please try again." },
      { status: 500 }
    );
  }
}
