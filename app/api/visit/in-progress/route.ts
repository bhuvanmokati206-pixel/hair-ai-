// GET /api/visit/in-progress — the park-and-resume queue for the dashboard.
// Visits not yet checked out, for the signed-in salon only.

import { NextResponse } from "next/server";
import { getSessionSalonId } from "@/lib/auth";
import { getInProgressVisits } from "@/lib/rag";

export async function GET() {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const visits = await getInProgressVisits(salonId);
    return NextResponse.json({ visits });
  } catch (err) {
    console.error("[in-progress] error:", err);
    return NextResponse.json({ error: "Failed to load queue" }, { status: 500 });
  }
}
