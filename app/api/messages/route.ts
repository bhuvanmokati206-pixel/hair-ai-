// GET /api/messages — the salon's WhatsApp outbox, with each message rendered to
// its final text. Lets you see exactly what will go out — before any credentials.

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getSessionSalonId } from "@/lib/auth";
import { renderTemplate } from "@/lib/whatsappTemplates";

export async function GET() {
  try {
    const salonId = await getSessionSalonId();
    if (!salonId) return NextResponse.json({ error: "No salon for this account" }, { status: 403 });

    const db = getServiceClient();
    const { data, error } = await db
      .from("messages")
      .select("id, type, status, send_at, sent_at, attempts, last_error, template_name, payload, customers(name)")
      .eq("salon_id", salonId)
      .order("send_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const messages = (data ?? []).map((m) => {
      const payload = (m.payload ?? {}) as { to?: string; bodyParams?: string[]; headerImageUrl?: string };
      const cust = m.customers as unknown as { name: string | null } | null;
      return {
        id: m.id,
        type: m.type,
        status: m.status,
        sendAt: m.send_at,
        sentAt: m.sent_at,
        attempts: m.attempts,
        lastError: m.last_error,
        to: payload.to ?? null,
        customerName: cust?.name ?? null,
        hasImage: !!payload.headerImageUrl,
        preview: renderTemplate(m.template_name ?? "", payload.bodyParams ?? []),
      };
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[messages] GET error:", err);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
