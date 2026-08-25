// GET /api/visit?id=<visitId> — full state for resuming a parked customer.
// Returns the customer, the analysis, and any already-generated images, so the
// scan view can reopen without re-analysing (which would cost another API call).

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { getVisitPhotos } from "@/lib/visitPhotos";

export async function GET(req: NextRequest) {
  try {
    const visitId = req.nextUrl.searchParams.get("id");
    if (!visitId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();
    const { data: visit } = await db
      .from("visits")
      .select("id, salon_id, customer_id, status, service_type, chosen_style, chosen_beard_style, analysis, barber_id, customers(id, name, phone)")
      .eq("id", visitId)
      .maybeSingle();

    if (!visit || visit.salon_id !== salonId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const photos = await getVisitPhotos(visitId);

    // Only generated images matter for resume — the originals were the input.
    // Group by style so each style card can be restored with its angle set.
    const generated = photos
      .filter((p) => p.kind === "generated" && p.url)
      .map((p) => ({
        styleName: p.style_name ?? visit.chosen_style ?? "style",
        angle: (p.angle ?? "front") as "front" | "left" | "right" | "back",
        serviceType: (p.service_type ?? "haircut") as "haircut" | "beard",
        url: p.url as string,
      }));

    const customer = visit.customers as unknown as { id: string; name: string | null; phone: string } | null;

    return NextResponse.json({
      visit: {
        id: visit.id,
        status: visit.status,
        serviceType: visit.service_type,
        chosenStyle: visit.chosen_style,
        chosenBeardStyle: visit.chosen_beard_style,
        analysis: visit.analysis,
        barberId: visit.barber_id,
      },
      customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : null,
      generated,
    });
  } catch (err) {
    console.error("[visit] GET error:", err);
    return NextResponse.json({ error: "Failed to load visit" }, { status: 500 });
  }
}
