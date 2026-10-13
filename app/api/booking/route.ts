import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { enqueueBookingConfirmation } from "@/lib/messageQueue";
import { formatTriggerDemoText } from "@/lib/whatsappDemo";

export async function POST(req: NextRequest) {
  try {
    const { customerName, customerPhone, barberId, serviceType, slotAt, notes } = await req.json() as {
      customerName?: string;
      customerPhone?: string;
      barberId?: string;
      serviceType?: "haircut" | "beard" | "both";
      slotAt?: string;
      notes?: string;
    };

    if (!customerPhone || !slotAt) {
      return NextResponse.json({ error: "customerPhone and slotAt are required" }, { status: 400 });
    }

    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon session found" }, { status: 403 });

    const db = getServiceClient();

    // 1. Fetch salon details
    const { data: salon } = await db.from("salons").select("name").eq("id", salonId).maybeSingle();
    const salonName = salon?.name ?? "Hair AI Salon";

    // 2. Lookup or create customer
    const cleanPhone = customerPhone.trim();
    const name = customerName?.trim() || "Valued Customer";

    const { data: customer, error: custErr } = await db
      .from("customers")
      .upsert(
        { salon_id: salonId, phone: cleanPhone, name, wa_opt_in: true, wa_opt_in_at: new Date().toISOString() },
        { onConflict: "salon_id,phone" }
      )
      .select("id, name, phone")
      .single();

    if (custErr || !customer) {
      throw custErr ?? new Error("Could not create/find customer");
    }

    // 3. Fetch barber if specified
    let barberName: string | undefined = undefined;
    if (barberId) {
      const { data: barber } = await db.from("barbers").select("name").eq("id", barberId).maybeSingle();
      if (barber) barberName = barber.name;
    }

    // 4. Create booking row
    const { data: booking, error: bookErr } = await db
      .from("bookings")
      .insert({
        salon_id: salonId,
        customer_id: customer.id,
        barber_id: barberId ?? null,
        slot_at: slotAt,
        service_type: serviceType ?? "haircut",
        status: "confirmed",
        source: "app",
        notes: notes ?? null,
      })
      .select("id, slot_at, service_type, status")
      .single();

    if (bookErr) throw bookErr;

    // 5. Format date/time
    const formattedDateTime = new Date(slotAt).toLocaleString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const serviceName = serviceType === "both" ? "Haircut & Beard Trim" : serviceType === "beard" ? "Beard Grooming" : "Haircut & Styling";

    // 6. Enqueue WhatsApp confirmation message
    const messageResult = await enqueueBookingConfirmation({
      salonId,
      customerId: customer.id,
      to: customer.phone,
      customerName: customer.name ?? name,
      salonName,
      barberName,
      serviceName,
      bookingDateTime: formattedDateTime,
      salonAddress: "Main Salon Studio",
    });

    const previewText = formatTriggerDemoText("booking_confirm", {
      customerName: customer.name ?? name,
      salonName,
      barberName,
      serviceName,
      bookingDateTime: formattedDateTime,
      salonAddress: "Main Salon Studio",
    });

    return NextResponse.json({
      ok: true,
      booking,
      messageResult,
      previewText,
      customerPhone: customer.phone,
      customerName: customer.name ?? name,
    });
  } catch (err) {
    console.error("[booking] POST error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Booking failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon session found" }, { status: 403 });

    const db = getServiceClient();
    const { data: bookings, error } = await db
      .from("bookings")
      .select("id, slot_at, service_type, status, source, notes, customers(name, phone), barbers(name)")
      .eq("salon_id", salonId)
      .order("slot_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ ok: true, bookings: bookings ?? [] });
  } catch (err) {
    console.error("[booking] GET error:", err);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}
