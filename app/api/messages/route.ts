// GET & POST /api/messages — WhatsApp outbox & demo trigger controls.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { renderTemplate } from "@/lib/whatsappTemplates";
import { sendNow, enqueueMessage } from "@/lib/messageQueue";

export async function GET() {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();
    const { data, error } = await db
      .from("messages")
      .select("id, type, status, send_at, sent_at, attempts, last_error, template_name, payload, customers(name, phone)")
      .eq("salon_id", salonId)
      .order("send_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const messages = (data ?? []).map((m) => {
      const payload = (m.payload ?? {}) as { to?: string; bodyParams?: string[]; headerImageUrl?: string };
      const cust = m.customers as unknown as { name: string | null; phone: string | null } | null;
      return {
        id: m.id,
        type: m.type,
        status: m.status,
        sendAt: m.send_at,
        sentAt: m.sent_at,
        attempts: m.attempts,
        lastError: m.last_error,
        to: payload.to ?? cust?.phone ?? null,
        customerName: cust?.name ?? null,
        hasImage: !!payload.headerImageUrl,
        headerImageUrl: payload.headerImageUrl ?? null,
        preview: renderTemplate(m.template_name ?? "", payload.bodyParams ?? []),
      };
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[messages] GET error:", err);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const { action, messageId } = (await req.json()) as { action: string; messageId?: string };

    if (action === "send_now" && messageId) {
      await sendNow(messageId);
      return NextResponse.json({ ok: true, message: "Message scheduled for immediate send" });
    }

    if (action === "create_demo_rebook") {
      const db = getServiceClient();
      // Find or create customer
      const { data: customer } = await db
        .from("customers")
        .upsert(
          { salon_id: salonId, phone: "919876543210", name: "Alex Rivers (Demo)", wa_opt_in: true },
          { onConflict: "salon_id,phone" }
        )
        .select("id")
        .single();

      if (!customer) throw new Error("Could not setup demo customer");

      const { data: salon } = await db.from("salons").select("name").eq("id", salonId).single();

      const created = await enqueueMessage({
        salonId,
        customerId: customer.id,
        type: "rebook",
        templateName: "rebook_reminder",
        sendAt: new Date(Date.now() + 45 * 86_400_000), // 45 days in future
        to: "919876543210",
        bodyParams: [salon?.name ?? "Hair AI Studio"],
        headerImageUrl: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&auto=format&fit=crop&q=80",
      });

      return NextResponse.json({ ok: true, created });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[messages] POST error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Action failed" }, { status: 500 });
  }
}
