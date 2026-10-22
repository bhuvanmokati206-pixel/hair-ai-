import { NextRequest, NextResponse } from "next/server";
import { fetchSafeRemoteImage } from "@/lib/remoteImage";
import { getVisitPhotos } from "@/lib/visitPhotos";

export const maxDuration = 45;

const MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = `You are a master barber, master stylist, and AI facial aesthetics consultant.
You are given two images:
- Image 1: The CUSTOMER'S actual face scan and current hair.
- Image 2: The REFERENCE hairstyle that the customer wants to try.

Perform a thorough, honest, and precise evaluation comparing the customer's actual hair length, texture, and face shape against the reference hairstyle.

CRITICAL EVALUATION RULES:
1. PRECISE LENGTH COMPARISON:
   - Carefully inspect the customer's actual hair length in Image 1 (top, crown, sides, hairline).
   - Compare it against the hair length shown in the reference photo (Image 2).
   - If the reference hairstyle requires longer hair than the customer currently has (e.g., customer has 3cm on top but reference has 8-10cm voluminous textured layers):
     * Set "isLengthSufficient": false
     * Set "customerEstimatedLength": exact estimate of customer's current top/side length (e.g. "3-4 cm on top, short tapered sides")
     * Set "referenceRequiredLength": exact length needed for the reference style (e.g. "7-9 cm on top with textured bulk")
     * Set "lengthDifferenceNotes": precise explanation of the gap (e.g. "Your hair on top is ~4-5 cm shorter than required for this full swept style. The style has been adapted to your current length in the simulation.")
   - If customer's hair length is equal or longer, set "isLengthSufficient": true.

2. FACE SHAPE & SUITABILITY EVALUATION:
   - Identify the customer's face shape (Oval, Round, Square, Heart, Diamond, Oblong).
   - Determine if the reference hairstyle's silhouette, volume distribution, and parting flatter or conflict with the customer's face shape (e.g., a round face with excessive side bulk, or a high forehead with a pulled-back hairline).
   - If there is a noticeable clash or aesthetic disadvantage:
     * Set "isSuitable": false
     * Provide a clear, polite, and constructive reason in "suitabilityReason" and "advisoryWarning".
   - If the style flatters their facial proportions, set "isSuitable": true and explain why in "suitabilityReason".

3. SUITABILITY SCORE & ADVISORY:
   - "suitabilityScore": Integer 0-100 evaluating the overall match (harmony with face shape, hair density, hairline, and length).
   - "advisoryWarning": If isLengthSufficient is false OR isSuitable is false, provide a clear, user-friendly warning highlighting what they should know before cutting (e.g., "⚠️ Length & Proportion Note: Your hair is currently shorter than the reference image. The AI has adapted the texture to your current length. We recommend 6 weeks of growth to achieve the full volume of the reference look."). If perfectly suited and length is sufficient, set to null.

4. TECHNICAL BARBER CUTTING STEPS:
   - Provide concrete technical instructions for a barber adapting this cut to the customer's CURRENT hair length (clipper guards, sectioning, scissor over comb, texturizing).

Return ONLY valid JSON matching this exact schema:
{
  "styleName": "Precise name of hairstyle (e.g. Textured French Crop with Mid Taper Fade)",
  "description": "2-sentence summary of the cut and silhouette.",
  "customerEstimatedLength": "e.g. 3-4 cm on top, 1-2 cm on sides",
  "referenceRequiredLength": "e.g. 7-8 cm on top, skin fade sides",
  "isLengthSufficient": true,
  "lengthDifferenceNotes": "Detailed comparison of current length vs required length.",
  "isSuitable": true,
  "suitabilityScore": 85,
  "suitabilityReason": "Honest, constructive explanation of whether this hairstyle suits the customer's face shape and features.",
  "advisoryWarning": "Direct warning message for user if length is short or style conflicts, or null if great fit.",
  "topLength": "Length on top required by reference (e.g. 3 inches)",
  "sidesFade": "Fade/taper technique on sides (e.g. Mid Skin Fade)",
  "textureType": "Texture style (e.g. Choppy layers, matte finish)",
  "barberInstructions": "Step-by-step technical cutting instructions for the stylist.",
  "stylingTips": "Recommended styling products and daily routine.",
  "suitableFaceShapes": ["Oval", "Square", "Diamond"]
}

Do not include markdown code backticks. Return raw valid JSON only.`;

export async function POST(req: NextRequest) {
  try {
    const {
      imageBase64,
      mediaType = "image/jpeg",
      imageUrl,
      customerPhotoBase64,
      customerPhotoUrl,
      visitId,
      customerMediaType = "image/jpeg",
      customerContext,
    } = (await req.json()) as {
      imageBase64?: string;
      mediaType?: string;
      imageUrl?: string;
      customerPhotoBase64?: string;
      customerPhotoUrl?: string;
      visitId?: string;
      customerMediaType?: string;
      customerContext?: {
        faceShape?: string;
        hairLength?: string;
        hairMeasurements?: { topCm?: string; sideCm?: string; napeCm?: string };
        gender?: string;
      };
    };

    let base64Data = imageBase64;
    let mimeType = mediaType;

    if (!base64Data && imageUrl) {
      const { buffer, contentType } = await fetchSafeRemoteImage(imageUrl);
      mimeType = contentType;
      base64Data = buffer.toString("base64");
    }

    if (!base64Data) {
      return NextResponse.json({ error: "Reference image is required" }, { status: 400 });
    }

    if (base64Data.includes(";base64,")) {
      const parts = base64Data.split(";base64,");
      mimeType = parts[0].replace("data:", "");
      base64Data = parts[1];
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 503 });
    }

    // Build multimodal prompt parts: Customer photo (if available) + Reference photo
    const parts: Array<Record<string, unknown>> = [{ text: PROMPT }];

    if (customerContext) {
      parts.push({
        text: `Customer Context (from scan): Face shape: ${customerContext.faceShape || "Unknown"}, Current length: ${
          customerContext.hairMeasurements?.topCm || customerContext.hairLength || "Standard"
        }, Gender: ${customerContext.gender || "Not specified"}.`,
      });
    }

    let effectiveCustomerBase64 = customerPhotoBase64;
    let effectiveCustomerMediaType = customerMediaType;

    if (!effectiveCustomerBase64 && customerPhotoUrl) {
      try {
        const { buffer, contentType } = await fetchSafeRemoteImage(customerPhotoUrl);
        effectiveCustomerBase64 = buffer.toString("base64");
        effectiveCustomerMediaType = contentType;
      } catch (err) {
        console.warn("[analyze-reference] failed to load customerPhotoUrl:", customerPhotoUrl, err);
      }
    }

    if (!effectiveCustomerBase64 && visitId) {
      try {
        const dbPhotos = await getVisitPhotos(visitId);
        const front = dbPhotos.find((p) => p.kind === "original" && (p.angle === "front" || !p.angle) && p.url);
        if (front?.url) {
          const { buffer, contentType } = await fetchSafeRemoteImage(front.url);
          effectiveCustomerBase64 = buffer.toString("base64");
          effectiveCustomerMediaType = contentType;
        }
      } catch (err) {
        console.warn("[analyze-reference] failed to load front photo from visitId:", visitId, err);
      }
    }

    if (effectiveCustomerBase64) {
      const cleanCustomerBase64 = effectiveCustomerBase64.includes(";base64,")
        ? effectiveCustomerBase64.split(";base64,")[1]
        : effectiveCustomerBase64;

      parts.push({
        text: "Image 1: Customer's face scan:",
      });
      parts.push({
        inline_data: {
          mime_type: effectiveCustomerMediaType,
          data: cleanCustomerBase64,
        },
      });
    }

    parts.push({
      text: "Image 2: Reference hairstyle photo:",
    });
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Data,
      },
    });

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1400,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[analyze-reference] Gemini error:", response.status, errText);
      throw new Error(`Gemini vision API error: ${response.status}`);
    }

    const resJson = await response.json();
    const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const analysis = JSON.parse(cleaned);

    const isLengthSufficient = analysis.isLengthSufficient ?? true;
    const isSuitable = analysis.isSuitable ?? true;
    let advisoryWarning = analysis.advisoryWarning;

    if (!advisoryWarning && (!isLengthSufficient || !isSuitable)) {
      if (!isLengthSufficient && !isSuitable) {
        advisoryWarning = `Notice: Your current hair length is shorter than this reference look, and the silhouette may not fully balance your face shape. The simulation adapts the style to your existing length.`;
      } else if (!isLengthSufficient) {
        advisoryWarning = `Length Advisory: Your current hair is shorter than the reference photo (${analysis.customerEstimatedLength || "shorter"} vs ${analysis.referenceRequiredLength || "longer"}). The cut has been adapted to your current length.`;
      } else {
        advisoryWarning = `Styling Advisory: This hairstyle may conflict with your natural face structure (${analysis.suitabilityReason || "consider proportions"}).`;
      }
    }

    return NextResponse.json({
      ok: true,
      analysis: {
        styleName: analysis.styleName || "Custom Reference Hairstyle",
        description: analysis.description || "A personalized haircut based on your uploaded reference.",
        customerEstimatedLength: analysis.customerEstimatedLength || "Current length",
        referenceRequiredLength: analysis.referenceRequiredLength || "Reference length",
        isLengthSufficient,
        lengthDifferenceNotes: analysis.lengthDifferenceNotes || "Length comparison evaluated.",
        isSuitable,
        suitabilityScore: analysis.suitabilityScore ?? (isSuitable && isLengthSufficient ? 88 : 72),
        suitabilityReason:
          analysis.suitabilityReason ||
          "This hairstyle has been adapted to your facial features and hair length.",
        advisoryWarning,
        topLength: analysis.topLength || "Medium (2-3 inches)",
        sidesFade: analysis.sidesFade || "Tapered / Faded sides",
        textureType: analysis.textureType || "Textured finish",
        barberInstructions:
          analysis.barberInstructions || "Cut and style to match reference image silhouette respecting current hair length.",
        stylingTips: analysis.stylingTips || "Style with lightweight clay or pomade.",
        suitableFaceShapes: analysis.suitableFaceShapes || ["All face shapes"],
      },
    });
  } catch (err) {
    console.error("[analyze-reference] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Reference analysis failed",
        analysis: {
          styleName: "Custom Reference Look",
          description: "A tailored haircut adapted to your current hair length.",
          customerEstimatedLength: "Current length",
          referenceRequiredLength: "Standard style length",
          isLengthSufficient: true,
          lengthDifferenceNotes: "Adapted to current hair length.",
          isSuitable: true,
          suitabilityScore: 82,
          suitabilityReason: "Adapted to match your face shape and current hair length.",
          advisoryWarning: null,
          topLength: "Medium Length",
          sidesFade: "Tapered / Fade",
          textureType: "Natural textured styling",
          barberInstructions: "Shape and taper sides, texture the top to match reference photo proportions while respecting existing length.",
          stylingTips: "Use matte styling cream for natural hold.",
          suitableFaceShapes: ["Universal"],
        },
      },
      { status: 200 }
    );
  }
}
