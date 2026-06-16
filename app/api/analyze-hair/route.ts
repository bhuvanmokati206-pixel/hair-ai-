import { NextRequest, NextResponse } from "next/server";

// Groq vision model (free tier, very fast). Llama 4 Scout supports image input.
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Realistic demo analysis used when USE_MOCK_ANALYSIS=true (or as a last-resort
// fallback when the API is unavailable). Lets the full app flow be tested
// without any working AI API.
function mockAnalysis() {
  return {
    gender: "male",
    skinTone: "medium",
    undertone: "warm",
    hairLength: "short",
    hairDensity: "thick",
    hairTexture: "wavy",
    hairColor: "jet black",
    faceShape: "oval",
    currentStyle: "short textured cut",
    feasibleStyles: [
      "textured crop",
      "fade with quiff",
      "side part",
      "slick back",
      "french crop",
      "caesar cut",
    ],
    bestMatch: "textured crop",
    bestMatchReason:
      "An oval face suits almost any style. Thick wavy hair holds a textured crop perfectly with minimal product.",
    suggestedColors: [
      { color: "Dark chocolate brown", reason: "Softens jet black while keeping warmth for a medium warm skin tone." },
      { color: "Caramel highlights", reason: "Adds golden dimension that flatters warm undertones; needs light bleaching." },
      { color: "Warm espresso", reason: "Rich, low-maintenance shade that complements medium skin without bleaching." },
    ],
    stylingTips:
      "Apply a small amount of matte clay to damp hair and scrunch upward for natural texture.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { photos }: { photos: { base64: string; mediaType: string; label: string }[] } =
      await req.json();

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    // ── Demo mode: instant realistic analysis, no API needed ──
    if (process.env.USE_MOCK_ANALYSIS === "true") {
      console.log("[analyze-hair] USE_MOCK_ANALYSIS=true → returning demo data");
      await sleep(1200); // small delay so the analyzing animation shows
      return NextResponse.json({ analysis: mockAnalysis(), source: "demo-flag" });
    }

    const angleList = photos.map((p, i) => `Image ${i + 1}: ${p.label} view`).join(", ");

    const prompt = `You are a professional hairstylist AND colour specialist examining ${photos.length} real photo(s) of the SAME person: ${angleList}.

Look carefully at the ACTUAL photos and describe what YOU SEE. Base every field on the real image — never invent. If a detail is unclear, choose the closest matching allowed value (never leave a field blank or say "unknown").

STEP 1 — APPEARANCE
Determine the person's apparent gender (male or female), skin tone, and undertone:
- gender: male | female  (pick the single most likely option, even if subtle)
- skinTone: fair | light | medium | olive | tan | brown | deep
- undertone: warm | cool | neutral  (warm = golden/yellow/peach; cool = pink/red/blue; neutral = mix)

STEP 2 — HAIR (read from the angles)
- FRONT → face shape + current style
- SIDE → hair length (ear-to-shoulder distance)
- BACK → density (visible scalp = thin)
Allowed values:
- hairLength: very_short | short | medium | long | very_long
- hairDensity: thin | medium | thick
- hairTexture: straight | wavy | curly | coily
- faceShape: oval | round | square | oblong | heart | diamond

STEP 3 — STYLES (must match the gender from Step 1)
- If male → men's cuts (fade, undercut, textured crop, pompadour, quiff, side part, buzz cut, French crop, slick back, caesar cut, etc.)
- If female → women's cuts (layers, long layers, blunt bob, lob, pixie cut, shoulder-length cut, curtain bangs, side-swept bangs, beach waves, feathered cut, etc.)
RULES: Provide EXACTLY 6 distinct styles. Every style must be achievable with their CURRENT hair length (no extensions, no imagined growth). "bestMatch" MUST be copied verbatim from one of the 6 feasibleStyles.

STEP 4 — COLOUR RECOMMENDATIONS (based on skin tone + undertone)
Suggest EXACTLY 3 hair colours that flatter THIS person's skin tone and undertone:
- Warm undertone → warm shades (honey blonde, caramel, golden brown, copper, chocolate, auburn).
- Cool undertone → cool shades (ash blonde, ash brown, jet black, burgundy, espresso, cool platinum).
- Neutral undertone → most shades work; pick balanced options.
- Deep/brown skin → rich darks, deep burgundy, jet black, dark chocolate, caramel highlights (avoid washed-out platinum).
- Fair/light skin → wider range; match warmth to undertone.
FEASIBILITY: Note in the reason if a colour requires bleaching (e.g. going light/blonde from dark hair). Avoid recommending the colour they already have.

Return ONLY valid JSON (no markdown, no commentary) with EXACTLY these keys:
{
  "gender": "<male or female>",
  "skinTone": "<value from scale>",
  "undertone": "<warm, cool or neutral>",
  "hairLength": "<value from scale>",
  "hairDensity": "<value from scale>",
  "hairTexture": "<value from scale>",
  "hairColor": "<the actual current hair colour you observe>",
  "faceShape": "<value from scale>",
  "currentStyle": "<short description of their current haircut>",
  "feasibleStyles": ["style1", "style2", "style3", "style4", "style5", "style6"],
  "bestMatch": "<exactly one of the 6 feasibleStyles>",
  "bestMatchReason": "<1-2 sentences specific to this person's face + hair>",
  "suggestedColors": [
    { "color": "<colour name>", "reason": "<why it suits their skin tone/undertone; note if bleaching is needed>" },
    { "color": "<colour name>", "reason": "<...>" },
    { "color": "<colour name>", "reason": "<...>" }
  ],
  "stylingTips": "<practical tip for the bestMatch style>"
}

CRITICAL: The angle brackets and example strings above are placeholders — replace ALL of them with your real observations. Do NOT copy placeholder text. Match style category (men's vs women's) to the observed gender, and match colours to the observed skin tone.`;

    // Build content array: images first, then text prompt (OpenAI-compatible format)
    const content: object[] = photos.map((p) => ({
      type: "image_url",
      image_url: { url: `data:${p.mediaType};base64,${p.base64}` },
    }));
    content.push({ type: "text", text: prompt });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[analyze-hair] GROQ_API_KEY missing — falling back to demo analysis");
      return NextResponse.json({ analysis: mockAnalysis(), source: "demo-no-key" });
    }
    console.log(`[analyze-hair] Calling Groq (${GROQ_MODEL}) with ${photos.length} photos…`);

    let rawText = "";
    let lastStatus = 0;
    let lastErr: unknown = null;

    // Retry up to 3 times on rate-limit (429) with backoff.
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content }],
          temperature: 0.3,
          response_format: { type: "json_object" },
          max_tokens: 1024,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        rawText = data.choices?.[0]?.message?.content ?? "";
        console.log("[analyze-hair] Groq raw response:", JSON.stringify(rawText).slice(0, 400));
        if (rawText) break;
        lastErr = data;
        break;
      }

      lastStatus = response.status;
      lastErr = await response.json().catch(() => ({}));
      console.error(`Groq ${GROQ_MODEL} → ${response.status}`, JSON.stringify(lastErr));

      if (response.status === 429) {
        await sleep(2000);
        continue;
      }
      break; // non-429 error — stop retrying
    }

    if (!rawText) {
      // API failed — fall back to demo analysis so testing is never fully blocked.
      console.error(
        `[analyze-hair] Groq failed (last status ${lastStatus}) → demo fallback:`,
        JSON.stringify(lastErr)
      );
      return NextResponse.json({ analysis: mockAnalysis(), source: "demo-groq-failed", lastStatus });
    }

    // Strip markdown fences if the model wraps in ```json
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    // Extract JSON object if there's extra text around it
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[analyze-hair] No JSON in Groq response → demo fallback:", cleaned);
      return NextResponse.json({ analysis: mockAnalysis(), source: "demo-parse-failed" });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log("[analyze-hair] ✓ Real Groq analysis returned");
    return NextResponse.json({ analysis, source: "groq" });
  } catch (err) {
    console.error("[analyze-hair] Exception → demo fallback:", err);
    return NextResponse.json({ analysis: mockAnalysis(), source: "demo-exception" });
  }
}
