// GET  /api/salon — the signed-in user's salon details
// PATCH /api/salon — update editable salon fields
//
// salon_id comes from the session, never the body — a user can only read/edit
// their own salon.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";

const EDITABLE = ["name", "phone", "email", "address_line1", "address_line2", "city", "state", "pincode"] as const;

export async function GET() {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();
    const { data, error } = await db
      .from("salons")
      .select("id, code, name, phone, email, address_line1, address_line2, city, state, pincode, status")
      .eq("id", salonId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ salon: data });
  } catch (err) {
    console.error("[salon] GET error:", err);
    return NextResponse.json({ error: "Failed to load salon" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const body = await req.json() as Record<string, unknown>;

    // Whitelist: only known editable fields, and only the ones actually sent, so
    // a partial save can't blank an unmentioned column.
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE) {
      if (body[key] !== undefined) patch[key] = body[key] === "" ? null : body[key];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    if (patch.name === null) {
      return NextResponse.json({ error: "Salon name can't be empty" }, { status: 400 });
    }

    const db = getServiceClient();
    const { data, error } = await db
      .from("salons")
      .update(patch)
      .eq("id", salonId)
      .select("id, code, name, phone, email, address_line1, address_line2, city, state, pincode, status")
      .single();

    if (error) throw error;
    return NextResponse.json({ salon: data });
  } catch (err) {
    console.error("[salon] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update salon" }, { status: 500 });
  }
}
