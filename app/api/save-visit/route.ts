// POST /api/save-visit  — called after analysis completes and/or customer picks a style
// PATCH /api/save-visit — update chosen style / barber notes / rating after the cut

import { NextRequest, NextResponse } from "next/server";
import { saveVisit, updateVisitChoice, type ServiceType } from "@/lib/rag";
import { getSessionSalonId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const {
      customerId,
      analysis,
      barberId,
      serviceType,
      chosenStyle,
      chosenBeardStyle,
      barberNotes,
    }: {
      customerId:        string;
      analysis:          Record<string, unknown>;
      barberId?:         string;
      serviceType?:      ServiceType;
      chosenStyle?:      string;
      chosenBeardStyle?: string;
      barberNotes?:      string;
    } = await req.json();

    if (!customerId || !analysis) {
      return NextResponse.json({ error: "customerId and analysis required" }, { status: 400 });
    }

    // From the session, not the body — see /api/customer for why.
    const salonId = await getSessionSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon for this account" }, { status: 403 });
    }

    const visit = await saveVisit({
      customerId, analysis, salonId, barberId, serviceType,
      chosenStyle, chosenBeardStyle, barberNotes,
    });
    return NextResponse.json({ visit });
  } catch (err) {
    console.error("[save-visit] POST error:", err);
    return NextResponse.json({ error: "Failed to save visit" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const {
      visitId,
      chosenStyle,
      chosenBeardStyle,
      barberNotes,
      customerRating,
      serviceType,
      barberId,
      endedAt,
    }: {
      visitId:           string;
      chosenStyle?:      string;
      chosenBeardStyle?: string;
      barberNotes?:      string;
      customerRating?:   number;
      serviceType?:      ServiceType;
      barberId?:         string;
      endedAt?:          string;
    } = await req.json();

    if (!visitId) {
      return NextResponse.json({ error: "visitId required" }, { status: 400 });
    }

    await updateVisitChoice(visitId, {
      chosenStyle, chosenBeardStyle, barberNotes,
      customerRating, serviceType, barberId, endedAt,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[save-visit] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update visit" }, { status: 500 });
  }
}
