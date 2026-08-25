import { NextRequest, NextResponse } from "next/server";
import { Jimp } from "jimp";
import { buildPhotoGrid } from "@/lib/imageGrid";
import { buildCustomerContext } from "@/lib/rag";
import { KNOWN_HAIR_STYLES } from "@/lib/compatibilityEngine";
import { styleNamesForGender } from "@/lib/referenceLibrary";
import { getPrompt, buildSpecialisedPrompt, toCategory, CLASSIFIER_PROMPT, type Category } from "@/lib/analysisPrompts";
import { preferencesToPromptBlock, type PreferenceAnswers } from "@/lib/preferences";

// Vercel serverless: two Gemini vision calls + retries can run ~10–20s. Give it
// headroom past the 10s default so a slow analysis isn't aborted mid-call.
export const maxDuration = 60;

// Gemini Flash Lite, called directly on Google's own key.
//
// Replaced anthropic/claude-sonnet-5 on Replicate, which cost ~₹0.98 a scan
// ($2/$10 per MTok — Replicate charges Anthropic's exact list price, so there was
// no markup to escape; the saving had to come from the model). Measured on the
// real prompt: 2,079 input + 473 output tokens ⇒ ~₹0.16 a scan, about 6x cheaper,
// and it answers in ~4s instead of ~10s.
//
// Second benefit: analysis no longer draws down the same Replicate balance that
// image generation needs, so an empty Replicate wallet can't take scanning down
// with it.
// Pass 1 (classify) stays on the cheap model — it's a trivial gender/length call.
// Pass 2 (the real read) uses flash: stronger reasoning → more honest, varied,
// accurate style picks. ~₹0.79/scan vs ~₹0.22 on lite; analysis is the cheap part.
const CLASSIFY_MODEL = "gemini-3.5-flash-lite";
const ANALYSIS_MODEL = "gemini-3.5-flash";
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

type GridImage = { base64: string; mediaType: string };

// One Gemini vision call. Returns the raw text (never throws for an API error —
// callers treat a null return as "fall back to demo").
async function geminiVision(prompt: string, grid: GridImage, maxTokens: number, temperature = 0.2, model: string = ANALYSIS_MODEL): Promise<{ text: string; inTok?: number; outTok?: number } | null> {
  // Retry transient failures (429 rate-limit, 5xx) instead of falling straight to the
  // mock — the free tier's per-minute cap is easy to trip when scans come in bursts.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${geminiUrl(model)}?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: grid.mediaType, data: grid.base64 } },
            ],
          }],
          generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: "application/json" },
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = 4000 * (attempt + 1);
        console.warn(`[analyze-hair] ${model} ${res.status} — retry ${attempt + 1}/3 in ${wait}ms`);
        await sleep(wait);
        continue;
      }
      const body = await res.json();
      if (!res.ok) {
        console.error(`[analyze-hair] ${model} returned ${res.status}:`, JSON.stringify(body).slice(0, 300));
        return null;
      }
      return {
        text: body.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
        inTok: body.usageMetadata?.promptTokenCount,
        outTok: body.usageMetadata?.candidatesTokenCount,
      };
    } catch (err) {
      console.error(`[analyze-hair] ${model} call failed (attempt ${attempt + 1}):`, err);
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

// Pass 1 of AUTO mode: cheap classify → which specialised prompt to run in pass 2.
// A failure here is non-fatal — we default the category and let pass 2 carry on.
async function classifyCategory(grid: GridImage): Promise<Category> {
  const out = await geminiVision(CLASSIFIER_PROMPT, grid, 40, 0, CLASSIFY_MODEL);
  if (!out?.text) return "male-short";
  try {
    const m = out.text.match(/\{[\s\S]*\}/);
    const j = m ? JSON.parse(m[0]) : {};
    console.log(`[analyze-hair] classify: gender=${j.gender} band=${j.lengthBand} (in=${out.inTok} out=${out.outTok})`);
    return toCategory(j.gender, j.lengthBand);
  } catch {
    return "male-short";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Tolerant JSON extraction: strips markdown fences, grabs the outermost object, and
// applies light repairs (trailing commas, stray bare-quote lines) before parsing.
// Returns null if it still can't parse, so the caller can regenerate.
function parseLooseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { /* try repairs */ }
  try {
    const repaired = m[0]
      .replace(/,(\s*[}\]])/g, "$1")   // trailing commas
      .replace(/^\s*"\s*$/gm, "");      // stray lone-quote lines
    return JSON.parse(repaired);
  } catch { return null; }
}

type BrightnessResult = "good" | "too_dark" | "too_bright";

async function checkBrightness(base64: string): Promise<BrightnessResult> {
  try {
    const buffer = Buffer.from(base64, "base64");
    const img = await Jimp.read(buffer);
    const data = img.bitmap.data; // flat RGBA array
    const pixelCount = img.bitmap.width * img.bitmap.height;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avg = total / pixelCount;
    if (avg < 35) return "too_dark";
    if (avg > 215) return "too_bright";
    return "good";
  } catch {
    return "good"; // never block on a check failure
  }
}

// Realistic demo analysis used when USE_MOCK_ANALYSIS=true (or as a last-resort
// fallback when the API is unavailable). Lets the full app flow be tested
// without any working AI API.
function mockAnalysis() {
  return {
    gender: "male",
    skinTone: "medium",
    undertone: "warm",
    hairLength: "short",
    hairMeasurements: {
      topLength: "short",
      sideLength: "very_short",
      napeLength: "short",
      topCm: "~3cm",
      sideCm: "~1cm",
      napeCm: "~3cm",
    },
    hairDensity: "thick",
    hairTexture: "wavy",
    hairColor: "jet black",
    faceShape: "oval",
    faceLength: "average",
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
    const {
      photos,
      customerId,
      promptVersion,
      preferences,
      gender: genderHint,
    }: {
      photos: { base64: string; mediaType: string; label: string }[];
      customerId?: string;
      promptVersion?: string; // "p1" | "p2" force a version; omit/"auto" for two-pass routing. See lib/analysisPrompts.ts
      preferences?: PreferenceAnswers; // customer questionnaire answers (lib/preferences.ts)
      gender?: string; // human-provided ("male"/"female"); overrides the model's guess
    } = await req.json();

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    // ── Step 1: Local brightness quality check (free, instant, no API) ──
    const brightnessResults = await Promise.all(
      photos.map(async (p) => ({
        label: p.label,
        result: await checkBrightness(p.base64),
      }))
    );

    const qualityIssues = brightnessResults
      .filter((r) => r.result !== "good")
      .map((r) => ({
        label: r.label,
        issue: r.result as "too_dark" | "too_bright",
        message:
          r.result === "too_dark"
            ? `${r.label} photo is too dark — retake in better lighting`
            : `${r.label} photo is overexposed — avoid direct light or glare`,
      }));

    // Front photo failing is a hard block — can't analyse face shape / hairline.
    // Other angles failing are warnings only (analysis still runs).
    const frontIssue = qualityIssues.find((q) => q.label === "front");
    if (frontIssue) {
      return NextResponse.json(
        { error: frontIssue.message, qualityIssues, blocked: true },
        { status: 400 }
      );
    }

    // ── Demo mode: instant realistic analysis, no API needed ──
    if (process.env.USE_MOCK_ANALYSIS === "true") {
      console.log("[analyze-hair] USE_MOCK_ANALYSIS=true → returning demo data");
      await sleep(1200);
      return NextResponse.json({ analysis: mockAnalysis(), source: "demo-flag" });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[analyze-hair] GEMINI_API_KEY missing — demo fallback");
      return NextResponse.json({ analysis: mockAnalysis(), source: "demo-no-key" });
    }

    // Stitch the 4 angle photos into one grid (free, local — keeps it to 1 call).
    // Order STRICTLY by label so the quadrants always match the prompt's mapping
    // (TL=front, TR=left, BL=right, BR=back) — the grid places by array index, so a
    // retake or an out-of-order upload would otherwise read a profile as the back,
    // or swap left/right. Fall back to the given order if labels are unrecognised.
    const GRID_ORDER = ["front", "left", "right", "back"];
    const byLabel = new Map(photos.map((p) => [p.label, p]));
    const orderedForGrid = GRID_ORDER.map((l) => byLabel.get(l)).filter((p): p is typeof photos[number] => !!p);
    const grid = await buildPhotoGrid(orderedForGrid.length ? orderedForGrid : photos);

    // Pick the prompt.
    //  • Explicit "p1"/"p2" → MANUAL: run that exact version, one call. For testing.
    //  • Anything else (incl. "auto"/undefined) → AUTO: classify then run the
    //    specialised prompt tuned for the detected hair type.
    const preferenceBlock = preferencesToPromptBlock(preferences);
    let prompt: string;
    let promptLabel: string; // what we report back + log
    let category: Category | null = null;
    // A bit of temperature so the model actually varies its picks per person instead
    // of returning the same safe answer ("textured crop") every time. Classify stays
    // at 0 (deterministic routing).
    let temperature = 0.2;

    if (promptVersion === "p1" || promptVersion === "p2") {
      prompt = getPrompt(promptVersion, { knownStyles: KNOWN_HAIR_STYLES, preferenceBlock }).text;
      promptLabel = promptVersion;
    } else {
      category = await classifyCategory(grid);
      // GENDER comes from the entry form when the barber set it — that's reliable.
      // The classifier only decides gender when the form left it blank (it defaults
      // to male on failure, which was giving women men's styles). Length always
      // comes from the classifier.
      const [detectedG, band] = category.split("-") as ["male" | "female", "short" | "medium" | "long"];
      const g: "male" | "female" =
        genderHint === "female" ? "female" :
        genderHint === "male" ? "male" :
        detectedG;
      category = `${g}-${band}` as Category; // rebuild so the specialised prompt matches the real gender
      const gender = g === "female" ? "women" : "men";
      // Honest, varied vocabulary: the dataset's real style names for THIS gender, up
      // to the detected length. Far bigger than the 22-style scoring list, so the
      // model recommends what actually fits instead of defaulting to a few.
      const vocab = styleNamesForGender(gender, band);
      const knownStyles = vocab.length >= 6 ? vocab : KNOWN_HAIR_STYLES;
      prompt = buildSpecialisedPrompt(category, { knownStyles, preferenceBlock });
      promptLabel = `auto:${category}`;
      temperature = 0.6;
    }

    console.log(`[analyze-hair] Calling ${ANALYSIS_MODEL}, ${photos.length}-photo grid, prompt=${promptLabel}, temp=${temperature}…`);

    // 4096, not 2048: the full 6-zone JSON (14 measurement fields + 6 styles + 3
    // colours + reasons/tips) can exceed 2048 output tokens, especially for longer
    // hair. When it did, the response truncated → JSON.parse failed → the route fell
    // back to the canned mock (male/short/textured-crop), so a real scan came back as
    // a completely wrong generic result. The extra headroom prevents that truncation.
    // At temperature 0.6 the model OCCASIONALLY emits slightly malformed JSON (a
    // stray quote/newline), which used to throw → mock fallback (the "same fixed
    // replies" bug). We now try to parse, lightly repair, and if that still fails,
    // REGENERATE once at a lower temperature instead of giving up to the mock.
    let analysis: Record<string, unknown> | null = null;
    let apiReached = false;
    for (let attempt = 0; attempt < 2 && !analysis; attempt++) {
      const temp = attempt === 0 ? temperature : 0.2; // 2nd try: deterministic + valid
      const out = await geminiVision(prompt, grid, 4096, temp);
      if (!out) continue;
      apiReached = true;
      if (out.inTok) console.log(`[analyze-hair] tokens in=${out.inTok} out=${out.outTok}`);
      analysis = parseLooseJson(out.text);
      if (!analysis) {
        console.warn(`[analyze-hair] JSON parse failed (attempt ${attempt + 1}/2)${attempt === 0 ? " — regenerating" : ""}. Tail: ${out.text.slice(-160)}`);
      }
    }
    if (!analysis) {
      return NextResponse.json({ analysis: mockAnalysis(), source: apiReached ? "demo-parse-failed" : "demo-api-failed" });
    }
    console.log(`[analyze-hair] ✓ Real ${ANALYSIS_MODEL} analysis returned (${promptLabel})`);

    // Attach customer history context if customerId provided
    let customerContext = "";
    if (customerId) {
      try {
        customerContext = await buildCustomerContext({ customerId, currentAnalysis: analysis });
      } catch (ragErr) {
        console.warn("[analyze-hair] RAG context fetch failed (non-fatal):", ragErr);
      }
    }

    return NextResponse.json({
      analysis,
      customerContext: customerContext || undefined,
      source: ANALYSIS_MODEL,
      promptVersion: promptLabel,
      ...(category && { category }),
      ...(qualityIssues.length > 0 && { qualityWarnings: qualityIssues }),
    });
  } catch (err) {
    console.error("[analyze-hair] Exception → demo fallback:", err);
    return NextResponse.json({ analysis: mockAnalysis(), source: "demo-exception" });
  }
}
