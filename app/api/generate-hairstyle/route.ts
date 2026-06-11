import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, styleName, hairColor, hairTexture } = await req.json();

    if (!imageBase64 || !styleName) {
      return NextResponse.json({ error: "Missing image or style name" }, { status: 400 });
    }

    const prompt = `This is a reference photo of a real person. Generate a photorealistic portrait of the EXACT same person with ONLY the hairstyle changed to: ${styleName}.

Rules:
- Keep the IDENTICAL face shape, skin tone, eyes, nose, lips, and all facial features
- Only change the hair to: ${styleName}
- Hair color: ${hairColor}
- Hair texture: ${hairTexture}
- Keep the same mustache/beard if present
- Professional studio lighting, sharp focus, front-facing portrait
- Do NOT change anything except the hairstyle`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: ["image", "text"],
        temperature: 0.4,
      },
    });

    // Extract the generated image from the response
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      // Gemini may decline image generation for certain prompts
      const textPart = parts.find((p: { text?: string }) => p.text);
      console.error("No image in response:", textPart?.text);
      return NextResponse.json(
        { error: "Image generation was blocked or failed. Try a different style." },
        { status: 422 }
      );
    }

    const base64Image = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType ?? "image/png";
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    return NextResponse.json({ imageUrl: dataUrl });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json(
      { error: "Image generation failed. Please try again." },
      { status: 500 }
    );
  }
}
