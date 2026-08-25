import { NextRequest, NextResponse } from "next/server";

// Groq keeps retiring models: llama-4-scout, then llama-3.3-70b-versatile, both
// now 404 model_not_found on this key. openai/gpt-oss-120b is the current pick —
// text-only but supports json_object mode. Verify with:
//   curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
// The questionnaire photo is not sent (text-only model) — see POST below.
const GROQ_MODEL = "openai/gpt-oss-120b";

export type HairHealthAnswers = {
  concern: string[];
  washFrequency: string;
  washFrequencyCount?: number;
  waterType: string;
  diet: string;
  stressLevel: string;
  currentProducts: string;
  scalpCondition: string[];
};

export type ProductRecommendation = {
  name: string;
  brand: string;
  type: "shampoo" | "conditioner" | "oil" | "serum" | "mask" | "supplement" | "other";
  whyItHelps: string;
  priceRange: string;
  searchTerm: string;
};

export type HairHealthResult = {
  diagnosis: string;
  remedies: string[];
  products: ProductRecommendation[];
};

export async function POST(req: NextRequest) {
  const { answers, photoBase64, photoMediaType } = await req.json() as {
    answers: HairHealthAnswers;
    photoBase64?: string;
    photoMediaType?: string;
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
  }

  const prompt = `You are an expert trichologist (hair and scalp specialist). A salon customer has answered the following questionnaire. Analyse their answers and provide personalised recommendations.

CUSTOMER QUESTIONNAIRE:
- Main hair concern(s): ${answers.concern.join(", ")}
- Hair wash frequency: ${answers.washFrequency}${answers.washFrequencyCount ? ` (${answers.washFrequencyCount}x per week)` : ""}
- Water type at home: ${answers.waterType}
- Diet type: ${answers.diet}
- Stress level: ${answers.stressLevel}
- Products currently using: ${answers.currentProducts || "None / unknown"}
- Scalp condition(s): ${answers.scalpCondition.join(", ")}

INSTRUCTIONS:
1. Write a concise 2–3 sentence professional diagnosis addressing their specific concerns.
2. Give EXACTLY 3 practical home/lifestyle remedies (diet tip, routine change, or natural treatment).
3. Recommend EXACTLY 4 hair/scalp products available in India. For each product:
   - Use real, well-known brands available on Amazon India or Nykaa (e.g. Mamaearth, WOW, Biotique, Indulekha, Kérastase, L'Oréal, Pantene, Head & Shoulders, Himalaya, Tresemmé, Dove, Khadi Natural, Satthwa).
   - Include the specific product name (e.g. "Biotique Bio Kelp Fresh Growth Therapeutic Shampoo").
   - Choose different product types (e.g. shampoo + oil + mask + serum — don't repeat types).
   - Give realistic Indian market price range (₹150–₹800 range for most products).
   - The searchTerm should be the exact product name + brand for Amazon/Nykaa search.

Return ONLY valid JSON with this exact structure:
{
  "diagnosis": "<2-3 sentence professional assessment>",
  "remedies": ["<remedy 1>", "<remedy 2>", "<remedy 3>"],
  "products": [
    {
      "name": "<product name>",
      "brand": "<brand name>",
      "type": "<shampoo|conditioner|oil|serum|mask|supplement|other>",
      "whyItHelps": "<1 sentence specific to customer's concern>",
      "priceRange": "₹<min>–₹<max>",
      "searchTerm": "<brand + product name for search>"
    }
  ]
}

CRITICAL: Replace ALL placeholder text with real content. Use real product names. Be specific to this customer's concerns.`;

  // This model takes a plain string only — a content array (the shape needed to
  // attach the photo) is rejected with "content must be a string". The quiz
  // answers alone drive the diagnosis; the photo is accepted but unused.
  if (photoBase64) {
    console.warn("[hair-health] photo ignored — no vision model available on Groq");
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        response_format: { type: "json_object" },
        // gpt-oss-120b is a reasoning model: reasoning tokens count toward this
        // budget (~700 observed), so keep generous headroom or the JSON truncates.
        max_tokens: 2500,
        reasoning_effort: "low",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[hair-health] Groq error:", response.status, err);
      return NextResponse.json({ error: "AI analysis failed. Please try again." }, { status: 502 });
    }

    const data = await response.json();
    const rawText: string = data.choices?.[0]?.message?.content ?? "";

    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response." }, { status: 500 });
    }

    const result: HairHealthResult = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[hair-health] Exception:", err);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
