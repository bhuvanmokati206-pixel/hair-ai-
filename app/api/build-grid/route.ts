import { NextRequest, NextResponse } from "next/server";
import { buildPhotoGrid } from "@/lib/imageGrid";

export async function POST(req: NextRequest) {
  try {
    const { photos } = await req.json() as {
      photos: { base64: string; mediaType: string }[];
    };
    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }
    const grid = await buildPhotoGrid(photos, 768);
    return NextResponse.json({ gridBase64: grid.base64, mediaType: grid.mediaType });
  } catch (err) {
    console.error("[build-grid]", err);
    return NextResponse.json({ error: "Failed to build grid" }, { status: 500 });
  }
}
