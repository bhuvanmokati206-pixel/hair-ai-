// POST /api/customer        — find or create a customer by phone
// GET  /api/customer?phone= — get customer + recent visits
//
// The salon comes from the signed-in session, never from the request body:
// a client-supplied salonId would let anyone read or write another salon's
// customer list.

import { NextRequest, NextResponse } from "next/server";
import { findOrCreateCustomer, getCustomer, getRecentVisits } from "@/lib/rag";
import { getSessionSalonId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone, name, gender, acceptedTerms }: {
      phone: string; name?: string; gender?: "male" | "female" | "other"; acceptedTerms?: boolean;
    } = await req.json();
    if (!phone || phone.replace(/\D/g, "").length < 7) {
      return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
    }

    const salonId = await getSessionSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon for this account" }, { status: 403 });
    }

    const customer = await findOrCreateCustomer(phone, name, salonId, { gender, acceptedTerms });
    const visits   = await getRecentVisits(customer.id, 3);
    return NextResponse.json({ customer, visits });
  } catch (err) {
    console.error("[customer] POST error:", err);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone") ?? "";
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

    const salonId = await getSessionSalonId();
    if (!salonId) {
      return NextResponse.json({ error: "No salon for this account" }, { status: 403 });
    }

    const customer = await getCustomer(phone, salonId);
    if (!customer) return NextResponse.json({ customer: null, visits: [] });

    const visits = await getRecentVisits(customer.id, 5);
    return NextResponse.json({ customer, visits });
  } catch (err) {
    console.error("[customer] GET error:", err);
    return NextResponse.json({ error: "Failed to get customer" }, { status: 500 });
  }
}
