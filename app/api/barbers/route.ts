// GET  /api/barbers — barbers for the signed-in salon, with contact + cuts today
// POST /api/barbers — add a barber (name, phone, email, optional photo)
//
// Salon comes from the session, never the body.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { VISIT_PHOTOS_BUCKET, ensureBucket } from "@/lib/visitPhotos";

export async function GET() {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();

    // Try the full select; fall back if the add-barber-fields migration hasn't
    // run yet (a missing column would 400 the whole query).
    let rows: { id: string; name: string; phone: string | null; email?: string | null; photo_url?: string | null }[];
    const full = await db
      .from("barbers")
      .select("id, name, phone, email, photo_url")
      .eq("salon_id", salonId).eq("active", true).order("name");
    if (full.error) {
      const basic = await db.from("barbers").select("id, name, phone").eq("salon_id", salonId).eq("active", true).order("name");
      if (basic.error) throw basic.error;
      rows = basic.data ?? [];
    } else {
      rows = full.data ?? [];
    }

    // Cuts today: completed visits (ended_at set today) grouped by barber.
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const { data: visits } = await db
      .from("visits")
      .select("barber_id")
      .eq("salon_id", salonId)
      .not("ended_at", "is", null)
      .gte("ended_at", midnight.toISOString());

    const cutsByBarber: Record<string, number> = {};
    (visits ?? []).forEach((v) => { if (v.barber_id) cutsByBarber[v.barber_id] = (cutsByBarber[v.barber_id] ?? 0) + 1; });

    const barbers = rows.map((b) => ({
      id: b.id,
      name: b.name,
      phone: b.phone ?? null,
      email: b.email ?? null,
      photoUrl: b.photo_url ?? null,
      cutsToday: cutsByBarber[b.id] ?? 0,
    }));

    return NextResponse.json({ barbers });
  } catch (err) {
    console.error("[barbers] GET error:", err);
    return NextResponse.json({ error: "Failed to load barbers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, photoBase64, photoMediaType } = await req.json() as {
      name?: string; phone?: string; email?: string; photoBase64?: string; photoMediaType?: string;
    };
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();

    // Insert the row first (name is the only required field), then attach the
    // photo — so a photo-upload hiccup doesn't lose the barber.
    const insert: Record<string, unknown> = { salon_id: salonId, name: name.trim(), active: true };
    if (phone?.trim()) insert.phone = phone.trim();
    if (email?.trim()) insert.email = email.trim();

    const { data: barber, error } = await db.from("barbers").insert(insert).select("id, name").single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "A barber with that name already exists" }, { status: 409 });
      // 42703 = email/photo_url column missing → migration not run
      if (error.code === "42703") return NextResponse.json({ error: "Run add-barber-fields.sql first" }, { status: 500 });
      throw error;
    }

    let photoUrl: string | null = null;
    if (photoBase64) {
      try {
        await ensureBucket();
        const buffer = Buffer.from(photoBase64, "base64");
        const ext = (photoMediaType ?? "image/jpeg").includes("png") ? "png" : "jpg";
        const path = `barbers/${salonId}/${barber.id}.${ext}`;
        const { error: upErr } = await db.storage.from(VISIT_PHOTOS_BUCKET).upload(path, buffer, {
          contentType: photoMediaType ?? "image/jpeg", upsert: true,
        });
        if (!upErr) {
          photoUrl = db.storage.from(VISIT_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
          await db.from("barbers").update({ photo_url: photoUrl }).eq("id", barber.id);
        }
      } catch (e) {
        console.warn("[barbers] photo upload failed (non-fatal):", e);
      }
    }

    return NextResponse.json({ barber: { id: barber.id, name: barber.name, phone: phone ?? null, email: email ?? null, photoUrl, cutsToday: 0 } });
  } catch (err) {
    console.error("[barbers] POST error:", err);
    return NextResponse.json({ error: "Failed to add barber" }, { status: 500 });
  }
}
