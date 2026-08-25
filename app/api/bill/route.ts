// POST /api/bill — finalize a bill for a visit (also stamps the chosen barber)
// GET  /api/bill?visitId=… — fetch an existing bill
//
// Totals are recomputed server-side from the line items — a client-sent total is
// never trusted. salon_id comes from the session.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { computeBill, type BillLine } from "@/lib/billing";

export async function GET(req: NextRequest) {
  try {
    const visitId = req.nextUrl.searchParams.get("visitId");
    if (!visitId) return NextResponse.json({ error: "visitId required" }, { status: 400 });

    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();
    const { data } = await db.from("bills").select("*").eq("visit_id", visitId).eq("salon_id", salonId).maybeSingle();
    return NextResponse.json({ bill: data ?? null });
  } catch (err) {
    console.error("[bill] GET error:", err);
    return NextResponse.json({ error: "Failed to load bill" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { visitId, barberId, items, discountPaise, gstPercent, paymentMethod } = await req.json() as {
      visitId: string; barberId?: string; items: BillLine[];
      discountPaise?: number; gstPercent?: number; paymentMethod?: string;
    };

    if (!visitId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "visitId and at least one item required" }, { status: 400 });
    }

    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();

    // Confirm the visit belongs to this salon.
    const { data: visit } = await db.from("visits").select("id, salon_id, customer_id").eq("id", visitId).maybeSingle();
    if (!visit || visit.salon_id !== salonId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Recompute — never trust client totals.
    const totals = computeBill(items, discountPaise ?? 0, gstPercent ?? 0);

    // Invoice number: <salon code>/<yyyymmdd>/<nth bill that day>.
    const { data: salon } = await db.from("salons").select("code").eq("id", salonId).maybeSingle();
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const { count } = await db.from("bills").select("*", { count: "exact", head: true })
      .eq("salon_id", salonId).gte("created_at", midnight.toISOString());
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const invoiceNo = `${salon?.code ?? "INV"}/${ymd}/${String((count ?? 0) + 1).padStart(3, "0")}`;

    // Stamp the barber on the visit first, so the WhatsApp review message (queued
    // at checkout, after billing) names the right person.
    if (barberId) await db.from("visits").update({ barber_id: barberId }).eq("id", visitId);

    const { data: bill, error } = await db.from("bills").insert({
      salon_id: salonId, visit_id: visitId, customer_id: visit.customer_id, barber_id: barberId ?? null,
      invoice_no: invoiceNo,
      items,
      subtotal_paise: totals.subtotalPaise,
      discount_paise: totals.discountPaise,
      gst_percent: totals.gstPercent,
      gst_paise: totals.gstPaise,
      total_paise: totals.totalPaise,
      payment_method: paymentMethod ?? null,
    }).select("*").single();

    if (error) throw error;

    return NextResponse.json({ bill });
  } catch (err) {
    console.error("[bill] POST error:", err);
    // The bills table is missing until add-bills.sql runs. PostgREST reports this
    // as PGRST205 (or 42P01 from the DB) — surface a clear, actionable message.
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    if (code === "PGRST205" || code === "42P01" || msg.includes("public.bills")) {
      return NextResponse.json({ error: "Billing isn't set up yet — run add-bills.sql in Supabase." }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to save bill" }, { status: 500 });
  }
}
