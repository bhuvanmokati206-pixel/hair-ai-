// GET  /api/whatsapp/webhook — Meta verification handshake
// POST /api/whatsapp/webhook — inbound messages + delivery statuses
//
// The proxy exempts /api/whatsapp from auth (Meta calls it unauthenticated).
// Two jobs that matter for compliance:
//   • STOP → opt the customer out (Meta enforces this; ignoring it = ban).
//   • delivery/read/failed status → update the queued message.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { optOutCustomer } from "@/lib/messageQueue";
import { normalizePhone } from "@/lib/whatsapp";

// Meta calls this once to verify the endpoint. Echo hub.challenge if the token matches.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

const STOP_WORDS = new Set(["stop", "unsubscribe", "opt out", "optout"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getServiceClient();

    // Meta batches everything under entry[].changes[].value.
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const phoneNumberId: string | undefined = value.metadata?.phone_number_id;

        // Which salon owns this number?
        let salonId: string | null = null;
        if (phoneNumberId) {
          const { data: salon } = await db.from("salons").select("id").eq("whatsapp_phone_id", phoneNumberId).maybeSingle();
          salonId = salon?.id ?? null;
        }

        // ── Inbound messages ──
        for (const message of value.messages ?? []) {
          const from = normalizePhone(message.from ?? "");
          const text: string = (message.text?.body ?? "").trim().toLowerCase();

          if (STOP_WORDS.has(text) && salonId) {
            const { data: customer } = await db
              .from("customers").select("id").eq("salon_id", salonId).eq("phone", from).maybeSingle();
            if (customer) {
              await optOutCustomer(customer.id);
              console.log(`[webhook] STOP → opted out customer ${customer.id}`);
            }
          }
          // (Booking replies etc. would be handled here in the free 24h window.)
        }

        // ── Delivery / read / failed statuses ──
        for (const status of value.statuses ?? []) {
          const waId: string | undefined = status.id;
          const state: string | undefined = status.status; // sent|delivered|read|failed
          if (waId && state) {
            await db.from("messages").update({ last_error: `status: ${state}` }).eq("wa_message_id", waId);
          }
        }
      }
    }

    // Always 200 — Meta retries aggressively on any non-200.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ ok: true }); // still 200, don't trigger retries
  }
}
