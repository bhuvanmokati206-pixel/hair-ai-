import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { VISIT_PHOTOS_BUCKET, ensureBucket } from "@/lib/visitPhotos";

export const maxDuration = 30;

function dateStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function POST(req: NextRequest) {
  try {
    const { visitId = "temp", angle = "front", ext = "jpg" } = (await req.json()) as {
      visitId?: string;
      angle?: string;
      ext?: string;
    };

    await ensureBucket();
    const db = getServiceClient();

    // Generate secure path in visit-photos bucket
    const storagePath = `uploads/${visitId}/${angle}-${dateStamp()}.${ext}`;

    const { data, error } = await db.storage
      .from(VISIT_PHOTOS_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error("[upload-url] createSignedUploadUrl error:", error);
      return NextResponse.json({ error: error?.message || "Failed to create upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    });
  } catch (err) {
    console.error("[upload-url] error:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
