import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { getHairMask } from "@/lib/hairMask";

// Step 1 of the segmentation pipeline, isolated for visual verification.
// Not wired into the real generation flow yet — just lets us confirm mask
// quality on real test photos before building face-lock + inpainting on top.
export async function POST(req: NextRequest) {
  try {
    const { photoBase64, photoMediaType, adjustmentFactor } = await req.json() as {
      photoBase64?: string;
      photoMediaType?: string;
      adjustmentFactor?: number;
    };

    if (!photoBase64 || !photoMediaType) {
      return NextResponse.json({ error: "A photo is required." }, { status: 400 });
    }
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 503 });
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const { maskBase64, maskMediaType } = await getHairMask(
      replicate,
      photoBase64,
      photoMediaType,
      adjustmentFactor ?? 0
    );

    return NextResponse.json({
      maskUrl: `data:${maskMediaType};base64,${maskBase64}`,
    });
  } catch (err) {
    console.error("[debug-hair-mask] Error:", err);
    return NextResponse.json({ error: "Mask generation failed." }, { status: 500 });
  }
}
