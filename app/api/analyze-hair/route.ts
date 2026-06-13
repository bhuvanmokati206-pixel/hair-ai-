import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { photos }: { photos: { base64: string; mediaType: string; label: string }[] } =
      await req.json();

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    const angleList = photos.map((p, i) => `Image ${i + 1}: ${p.label} view`).join(", ");

    const prompt = `You are a professional hairstylist AI. You have ${photos.length} photo(s) of the same person: ${angleList}.

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

Only suggest feasibleStyles that work with their ACTUAL current hair length.`;

    // Build content array: images first, then text prompt
    const content: object[] = photos.map((p) => ({
      type: "image_url",
      image_url: { url: `data:${p.mediaType};base64,${p.base64}` },
    }));
    content.push({ type: "text", text: prompt });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Hair AI",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [{ role: "user", content }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error("OpenRouter HTTP error:", response.status, JSON.stringify(errBody));
      return NextResponse.json(
        { error: `Analysis failed (${response.status}). Check your OPENROUTER_API_KEY in .env.local` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("OpenRouter response:", JSON.stringify(data).slice(0, 300));

    const rawText = data.choices?.[0]?.message?.content ?? "";
    if (!rawText) {
      console.error("Empty response from OpenRouter:", JSON.stringify(data));
      return NextResponse.json({ error: "Empty response from AI model. Try again." }, { status: 500 });
    }

    // Strip markdown fences if model wraps in ```json
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    // Extract JSON object if there's extra text around it
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", cleaned);
      return NextResponse.json({ error: "Could not parse AI response. Try again." }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Hair analysis error:", err);
    return NextResponse.json(
      { error: "Analysis failed. Check your OPENROUTER_API_KEY in .env.local" },
      { status: 500 }
    );
  }
}
