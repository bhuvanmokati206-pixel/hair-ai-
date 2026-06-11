import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { photos }: { photos: { base64: string; mediaType: string; label: string }[] } =
      await req.json();

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    const angleList = photos.map((p, i) => `Image ${i + 1}: ${p.label} view`).join(", ");

    // Build parts: one image per angle + text prompt
    const parts: object[] = photos.map((p) => ({
      inlineData: { mimeType: p.mediaType, data: p.base64 },
    }));

    parts.push({
      text: `You are a professional hairstylist AI. You have ${photos.length} photo(s) of the same person: ${angleList}.

Analyse ALL images together. Use:
- FRONT view → face shape + overall style
- SIDE views → hair length (ear-to-shoulder distance)
- BACK view → density (can you see the scalp?)

Hair length scale: very_short (buzz/above ears) | short (ear to jaw) | medium (jaw to shoulder) | long (shoulder to mid-back) | very_long (below mid-back)
Hair density scale: thin (scalp visible) | medium (slightly visible) | thick (no scalp visible)

Return ONLY valid JSON — no markdown, no explanation, just the JSON object:
{
  "hairLength": "short",
  "hairDensity": "thick",
  "hairTexture": "wavy",
  "hairColor": "jet black",
  "faceShape": "oval",
  "currentStyle": "short textured cut",
  "feasibleStyles": ["textured crop", "fade with quiff", "side part", "slick back", "french crop", "caesar cut"],
  "bestMatch": "textured crop",
  "bestMatchReason": "Oval face suits almost any style. Thick wavy hair holds a textured crop perfectly with minimal product.",
  "stylingTips": "Apply a small amount of matte clay to damp hair. Scrunch upward for natural texture."
}

Only suggest feasibleStyles that work with their ACTUAL current hair length — no extensions, no imagined growth.`,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const text = response.text?.trim() ?? "";

    // Strip markdown fences if Gemini wraps in ```json
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const analysis = JSON.parse(cleaned);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Hair analysis error:", err);
    return NextResponse.json(
      { error: "Analysis failed. Check your GEMINI_API_KEY in .env.local" },
      { status: 500 }
    );
  }
}
