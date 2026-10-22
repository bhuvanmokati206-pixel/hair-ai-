import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { getVisitPhotos } from "@/lib/visitPhotos";

export async function GET(req: NextRequest) {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon session found" }, { status: 403 });
    }

    const customerId = req.nextUrl.searchParams.get("customerId");
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 100);

    const db = getServiceClient();

    let query = db
      .from("visits")
      .select(`
        id,
        salon_id,
        customer_id,
        barber_id,
        service_type,
        chosen_style,
        chosen_beard_style,
        barber_notes,
        customer_rating,
        analysis,
        status,
        created_at,
        ended_at,
        customers (id, name, phone),
        barbers (id, name),
        visit_photos (id, kind, angle, service_type, style_name, url, is_hero, created_at)
      `)
      .eq("salon_id", salonId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    const { data: rawVisits, error } = await query;

    if (error) {
      console.error("[visit/history] query error:", error);
      throw error;
    }

    type RawPhoto = {
      id: string;
      kind: "original" | "generated";
      angle: "front" | "left" | "right" | "back" | null;
      service_type: string | null;
      style_name: string | null;
      url: string | null;
      is_hero: boolean;
      created_at: string;
    };

    const visits = await Promise.all((rawVisits ?? []).map(async (v) => {
      const cust = v.customers as unknown as { id: string; name: string | null; phone: string } | null;
      const barb = v.barbers as unknown as { id: string; name: string } | null;
      // Storage is private. Generate short-lived URLs only after this route has
      // confirmed the caller's salon scope above.
      const photos = (await getVisitPhotos(v.id)) as RawPhoto[];

      const beforePhotos = photos.filter((p) => p.kind === "original");
      const afterPhotos = photos.filter((p) => p.kind === "generated");

      const heroPhoto =
        photos.find((p) => p.is_hero)?.url ||
        photos.find((p) => p.kind === "generated" && p.angle === "front")?.url ||
        afterPhotos[0]?.url ||
        null;

      const originalFrontPhoto =
        photos.find((p) => p.kind === "original" && p.angle === "front")?.url ||
        beforePhotos[0]?.url ||
        null;

      return {
        id: v.id,
        createdAt: v.created_at,
        endedAt: v.ended_at,
        status: v.status,
        serviceType: v.service_type,
        chosenStyle: v.chosen_style,
        chosenBeardStyle: v.chosen_beard_style,
        customerRating: v.customer_rating,
        barberNotes: v.barber_notes,
        analysis: v.analysis,
        customer: cust ? { id: cust.id, name: cust.name || "Walk-in Customer", phone: cust.phone } : null,
        barber: barb ? { id: barb.id, name: barb.name } : null,
        photos: {
          all: photos,
          before: beforePhotos,
          after: afterPhotos,
          hero: heroPhoto,
          originalFront: originalFrontPhoto,
        },
      };
    }));

    return NextResponse.json({ ok: true, visits });
  } catch (err) {
    console.error("[visit/history] GET error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load history" }, { status: 500 });
  }
}
