// Salon menu CRUD. All operations are scoped to the caller's own salon — the
// salon_id comes from the session, never the request body.
//
//   GET    /api/salon/menu            → this salon's services (all, incl. inactive)
//   POST   /api/salon/menu            → create/update one service   { service }
//   DELETE /api/salon/menu?slug=xxx   → soft-delete (active=false); &hard=1 to remove
//
// Bulk import lives in ./import/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { sanitizeService, type MenuServiceRow } from "@/lib/salonMenuDb";

export async function GET() {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();
    const { data, error } = await db
      .from("menu_services")
      .select("id, slug, category, section, name, gender, kind, variants, targets, note, active, sort_order")
      .eq("salon_id", salonId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ services: (data ?? []) as MenuServiceRow[] });
  } catch (err) {
    console.error("[salon/menu] GET error:", err);
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const body = (await req.json()) as { service?: Record<string, unknown> };
    if (!body.service) return NextResponse.json({ error: "Missing service" }, { status: 400 });

    const result = sanitizeService(body.service, salonId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const db = getServiceClient();

    // Reuse the existing row's id when this slug already exists for the salon, so
    // edits update in place instead of colliding on unique(salon_id, slug).
    const { data: existing } = await db
      .from("menu_services")
      .select("id, sort_order")
      .eq("salon_id", salonId)
      .eq("slug", result.row.slug)
      .maybeSingle();

    const id = existing?.id ?? result.row.id;
    let sortOrder = existing?.sort_order;
    if (sortOrder == null) {
      const { data: last } = await db
        .from("menu_services")
        .select("sort_order")
        .eq("salon_id", salonId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      sortOrder = (last?.sort_order ?? -1) + 1;
    }

    const { error } = await db.from("menu_services").upsert(
      { ...result.row, id, salon_id: salonId, active: true, sort_order: sortOrder },
      { onConflict: "id" },
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[salon/menu] POST error:", err);
    return NextResponse.json({ error: "Failed to save service" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    const hard = req.nextUrl.searchParams.get("hard") === "1";

    const db = getServiceClient();
    const { error } = hard
      ? await db.from("menu_services").delete().eq("salon_id", salonId).eq("slug", slug)
      : await db.from("menu_services").update({ active: false }).eq("salon_id", salonId).eq("slug", slug);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[salon/menu] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
