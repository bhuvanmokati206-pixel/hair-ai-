// POST /api/visit/checkout — the "Done" action.
//
// Marks a visit completed (sets ended_at, which the WhatsApp review timer counts
// from) and queues the review + rebook messages. This is the single trigger for
// the whole post-visit automation.
//
// PATCH /api/visit/checkout — lighter status transitions (park as in_progress).

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { updateVisitChoice, type VisitStatus } from "@/lib/rag";
import { getHeroPhotoUrl } from "@/lib/visitPhotos";
import { enqueuePostVisitMessages } from "@/lib/messageQueue";

export async function POST(req: NextRequest) {
  try {
    const { visitId, customerRating, customerReview, barberNotes } = await req.json() as {
      visitId: string; customerRating?: number; customerReview?: string; barberNotes?: string;
    };
    if (!visitId) return NextResponse.json({ error: "visitId required" }, { status: 400 });

    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();

    // Load everything the messages need in one query, and confirm the visit
    // belongs to this salon — never trust a visitId from the client alone.
    const { data: visit } = await db
      .from("visits")
      .select("id, salon_id, customer_id, chosen_style, ended_at, customers(name, phone, wa_opt_in, opted_out_at), barbers(name), salons(name, rebook_after_days)")
      .eq("id", visitId)
      .maybeSingle();

    if (!visit || visit.salon_id !== salonId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const alreadyDone = !!visit.ended_at;

    // Mark completed. Idempotent: a double-tap on Done must not re-time ended_at
    // (which would shift the review message) — only set it the first time.
    await updateVisitChoice(visitId, {
      status: "completed",
      customerRating,
      customerReview,
      barberNotes,
      ...(alreadyDone ? {} : { endedAt: new Date().toISOString() }),
    });

    // The queue's own unique index makes a repeat enqueue a no-op, so re-running
    // checkout is safe. Skip the whole block on an already-done visit anyway.
    let queued: { review: unknown; rebook: unknown } | null = null;
    if (!alreadyDone) {
      const customer = visit.customers as unknown as
        { name: string | null; phone: string; wa_opt_in: boolean; opted_out_at: string | null } | null;
      const barber   = visit.barbers as unknown as { name: string | null } | null;
      const salon    = visit.salons  as unknown as { name: string; rebook_after_days: number | null } | null;

      // No consent, no messages. Meta enforces this and so do we.
      if (customer?.wa_opt_in && !customer.opted_out_at && customer.phone) {
        const heroUrl = await getHeroPhotoUrl(visitId);
        queued = await enqueuePostVisitMessages({
          salonId,
          customerId: visit.customer_id,
          visitId,
          to: customer.phone,
          customerName: customer.name ?? "there",
          salonName: salon?.name ?? "our salon",
          barberName: barber?.name ?? undefined,
          styleName: visit.chosen_style ?? "your new look",
          heroImageUrl: heroUrl ?? undefined,
          rebookAfterDays: salon?.rebook_after_days ?? 45,
        });
      }
    }

    return NextResponse.json({ ok: true, alreadyDone, queued });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { visitId, status, chosenStyle, barberId } = await req.json() as {
      visitId: string; status?: VisitStatus; chosenStyle?: string; barberId?: string;
    };
    if (!visitId) return NextResponse.json({ error: "visitId required" }, { status: 400 });

    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();
    const { data: visit } = await db.from("visits").select("salon_id").eq("id", visitId).maybeSingle();
    if (!visit || visit.salon_id !== salonId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    await updateVisitChoice(visitId, { status, chosenStyle, barberId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[checkout] PATCH error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
