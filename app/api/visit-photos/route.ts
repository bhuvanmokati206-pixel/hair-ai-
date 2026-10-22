// POST  /api/visit-photos  — upload generated/original images for a visit
// PATCH /api/visit-photos  — mark one photo as the visit's hero image
// GET   /api/visit-photos?visitId=… — list a visit's photos

import { NextRequest, NextResponse } from "next/server";
import {
  ensureBucket,
  saveVisitPhotos,
  setHeroPhoto,
  getVisitPhotos,
  type VisitPhotoInput,
} from "@/lib/visitPhotos";
import { getSessionSalonId } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

async function authorizeVisit(visitId: string): Promise<boolean> {
  const salonId = await getSessionSalonId();
  if (!salonId) return false;
  const { data: visit } = await getServiceClient()
    .from("visits")
    .select("id")
    .eq("id", visitId)
    .eq("salon_id", salonId)
    .maybeSingle();
  return !!visit;
}

export async function POST(req: NextRequest) {
  try {
    const { visitId, photos }: { visitId: string; photos: VisitPhotoInput[] } = await req.json();

    if (!visitId || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: "visitId and photos required" }, { status: 400 });
    }
    if (!(await authorizeVisit(visitId))) return NextResponse.json({ error: "Visit not found" }, { status: 404 });

    await ensureBucket();
    const saved = await saveVisitPhotos(visitId, photos);

    if (saved.length === 0) {
      return NextResponse.json({ error: "All uploads failed" }, { status: 502 });
    }

    // Partial success is still success — report what landed so the caller can tell.
    return NextResponse.json({ photos: saved, saved: saved.length, requested: photos.length });
  } catch (err) {
    console.error("[visit-photos] POST error:", err);
    return NextResponse.json({ error: "Failed to save photos" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { visitId, photoId }: { visitId: string; photoId: string } = await req.json();
    if (!visitId || !photoId) {
      return NextResponse.json({ error: "visitId and photoId required" }, { status: 400 });
    }
    if (!(await authorizeVisit(visitId))) return NextResponse.json({ error: "Visit not found" }, { status: 404 });

    await setHeroPhoto(visitId, photoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[visit-photos] PATCH error:", err);
    return NextResponse.json({ error: "Failed to set hero photo" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const visitId = req.nextUrl.searchParams.get("visitId");
    if (!visitId) {
      return NextResponse.json({ error: "visitId required" }, { status: 400 });
    }
    if (!(await authorizeVisit(visitId))) return NextResponse.json({ error: "Visit not found" }, { status: 404 });

    return NextResponse.json({ photos: await getVisitPhotos(visitId) });
  } catch (err) {
    console.error("[visit-photos] GET error:", err);
    return NextResponse.json({ error: "Failed to load photos" }, { status: 500 });
  }
}
