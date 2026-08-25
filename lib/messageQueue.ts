// Outbound WhatsApp queue.
//
// Enqueue at checkout, dispatch on a schedule. The DB is the queue: a row with a
// future send_at costs nothing to hold, so a 45-day delay is no more expensive
// than a 1-hour one, and a restart loses nothing.
//
// Server-side only.

import { getServiceClient } from "./supabase";
import { getSalonCredentials, sendTemplateWithCreds, type SalonCredentials } from "./whatsapp";
import { renderTemplate } from "./whatsappTemplates";

export type MessageType = "review" | "rebook" | "booking_confirm" | "custom";
export type MessageStatus = "pending" | "sending" | "sent" | "failed" | "cancelled";

export type QueuedMessage = {
  id: string;
  salon_id: string;
  customer_id: string;
  visit_id: string | null;
  type: MessageType;
  template_name: string | null;
  payload: {
    to?: string;
    bodyParams?: string[];
    headerImageUrl?: string;
    languageCode?: string;
  };
  send_at: string;
  status: MessageStatus;
  attempts: number;
};

/** Give up after this many tries so a permanently broken row stops costing quota. */
const MAX_ATTEMPTS = 4;

/** Backoff before a failed message becomes due again. */
const RETRY_DELAYS_MIN = [5, 30, 180];

// ── Enqueue ────────────────────────────────────────────────────────────────────

export async function enqueueMessage(params: {
  salonId: string;
  customerId: string;
  visitId?: string;
  type: MessageType;
  templateName: string;
  sendAt: Date;
  to: string;
  bodyParams?: string[];
  headerImageUrl?: string;
  languageCode?: string;
}): Promise<{ id: string } | null> {
  const db = getServiceClient();

  const { data, error } = await db
    .from("messages")
    .insert({
      salon_id:      params.salonId,
      customer_id:   params.customerId,
      visit_id:      params.visitId ?? null,
      type:          params.type,
      template_name: params.templateName,
      send_at:       params.sendAt.toISOString(),
      payload: {
        to:             params.to,
        bodyParams:     params.bodyParams ?? [],
        headerImageUrl: params.headerImageUrl,
        languageCode:   params.languageCode ?? "en",
      },
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = the one-per-visit unique index. A repeated checkout is expected,
    // not an error — it just must not enqueue a second copy.
    if (error.code === "23505") {
      console.log(`[queue] ${params.type} already queued for visit ${params.visitId}`);
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Queues both post-visit messages. Called when the barber checks the customer
 * out, which is also when ended_at is set — the review timer counts from the end
 * of the visit, not the start.
 *
 * `heroImageUrl` is the customer's generated look; it is what makes the rebook
 * message persuasive, so that one is skipped entirely without it.
 */
export async function enqueuePostVisitMessages(params: {
  salonId: string;
  customerId: string;
  visitId: string;
  to: string;
  customerName: string;
  salonName: string;
  barberName?: string;
  styleName: string;
  heroImageUrl?: string;
  reviewAfterMinutes?: number;
  rebookAfterDays?: number;
}) {
  const now = Date.now();
  const reviewAt = new Date(now + (params.reviewAfterMinutes ?? 60) * 60_000);
  const rebookAt = new Date(now + (params.rebookAfterDays ?? 45) * 86_400_000);

  // Named for the specific visit — that is what keeps this template classified
  // as Utility (~₹0.145) rather than Marketing (~₹1.09). A generic "rate us!"
  // is 7.5x the price.
  const review = await enqueueMessage({
    salonId: params.salonId,
    customerId: params.customerId,
    visitId: params.visitId,
    type: "review",
    templateName: "visit_feedback",
    sendAt: reviewAt,
    to: params.to,
    bodyParams: [
      params.customerName,
      params.styleName,
      params.barberName ?? "our team",
      params.salonName,
    ],
  });

  let rebook = null;
  if (params.heroImageUrl) {
    rebook = await enqueueMessage({
      salonId: params.salonId,
      customerId: params.customerId,
      visitId: params.visitId,
      type: "rebook",
      templateName: "rebook_reminder",
      sendAt: rebookAt,
      to: params.to,
      bodyParams: [params.customerName, params.styleName, params.salonName],
      headerImageUrl: params.heroImageUrl,
    });
  } else {
    console.warn(`[queue] visit ${params.visitId} has no hero image — skipping rebook`);
  }

  return { review, rebook };
}

// ── Dispatch ───────────────────────────────────────────────────────────────────

/**
 * Sends everything currently due.
 *
 * Claiming happens inside `claim_due_messages`, which uses FOR UPDATE SKIP
 * LOCKED — two overlapping cron runs cannot pick up the same row, so a slow
 * batch never causes a double send.
 *
 * Credentials are fetched once per salon rather than once per message.
 */
export async function dispatchDueMessages(batchSize = 25) {
  const db = getServiceClient();

  const { data: claimed, error } = await db.rpc("claim_due_messages", { batch_size: batchSize });
  if (error) throw error;

  const messages = (claimed ?? []) as QueuedMessage[];
  if (messages.length === 0) return { claimed: 0, sent: 0, failed: 0, retrying: 0 };

  // Simulation: with no WhatsApp credentials yet, set WHATSAPP_SIMULATE=true to
  // run the whole pipeline without calling Meta. Messages render and move to
  // "sent" so the flow is fully testable; nothing leaves the building.
  const simulate = process.env.WHATSAPP_SIMULATE === "true";

  const credsCache = new Map<string, SalonCredentials>();
  let sent = 0, failed = 0, retrying = 0;

  for (const msg of messages) {
    try {
      // Opted-out customers must never be messaged. Checked at send time, not
      // enqueue time, because a rebook is queued 45 days before it goes out.
      if (await isOptedOut(msg.customer_id)) {
        await markCancelled(msg.id, "customer opted out");
        continue;
      }

      if (simulate) {
        const preview = renderTemplate(msg.template_name ?? "", msg.payload.bodyParams ?? []);
        console.log(`[queue:SIM] → ${msg.payload.to}: ${preview}${msg.payload.headerImageUrl ? " [+image]" : ""}`);
        await markSent(msg.id, `sim-${msg.id.slice(0, 8)}`);
        sent++;
        continue;
      }

      let creds = credsCache.get(msg.salon_id);
      if (!creds) {
        creds = await getSalonCredentials(msg.salon_id);
        credsCache.set(msg.salon_id, creds);
      }

      const result = await sendTemplateWithCreds(creds, {
        to:             msg.payload.to ?? "",
        templateName:   msg.template_name ?? "",
        languageCode:   msg.payload.languageCode,
        bodyParams:     msg.payload.bodyParams,
        headerImageUrl: msg.payload.headerImageUrl,
      });

      if (result.ok) {
        await markSent(msg.id, result.waMessageId);
        sent++;
      } else if (result.retryable && msg.attempts < MAX_ATTEMPTS) {
        await scheduleRetry(msg.id, msg.attempts, result.error);
        retrying++;
      } else {
        await markFailed(msg.id, result.error);
        failed++;
      }
    } catch (err) {
      // A thrown error leaves the row stuck in 'sending' unless handled here.
      const reason = err instanceof Error ? err.message : String(err);
      if (msg.attempts < MAX_ATTEMPTS) {
        await scheduleRetry(msg.id, msg.attempts, reason);
        retrying++;
      } else {
        await markFailed(msg.id, reason);
        failed++;
      }
    }
  }

  console.log(`[queue] claimed=${messages.length} sent=${sent} retrying=${retrying} failed=${failed}`);
  return { claimed: messages.length, sent, failed, retrying };
}

// ── Status transitions ─────────────────────────────────────────────────────────

async function markSent(id: string, waMessageId: string) {
  const db = getServiceClient();
  await db
    .from("messages")
    .update({ status: "sent", wa_message_id: waMessageId, sent_at: new Date().toISOString(), last_error: null })
    .eq("id", id);
}

async function markFailed(id: string, error: string) {
  const db = getServiceClient();
  await db.from("messages").update({ status: "failed", last_error: error.slice(0, 500) }).eq("id", id);
}

async function markCancelled(id: string, reason: string) {
  const db = getServiceClient();
  await db.from("messages").update({ status: "cancelled", last_error: reason }).eq("id", id);
}

/** Back to pending with a later send_at, so the next run picks it up. */
async function scheduleRetry(id: string, attempts: number, error: string) {
  const db = getServiceClient();
  const delayMin = RETRY_DELAYS_MIN[Math.min(attempts - 1, RETRY_DELAYS_MIN.length - 1)];
  await db
    .from("messages")
    .update({
      status:     "pending",
      send_at:    new Date(Date.now() + delayMin * 60_000).toISOString(),
      last_error: error.slice(0, 500),
    })
    .eq("id", id);
}

// ── Opt-out ────────────────────────────────────────────────────────────────────

async function isOptedOut(customerId: string): Promise<boolean> {
  const db = getServiceClient();
  const { data } = await db
    .from("customers")
    .select("opted_out_at")
    .eq("id", customerId)
    .maybeSingle();
  return !!data?.opted_out_at;
}

/**
 * Records an opt-out and cancels anything still queued for that customer.
 * Called by the webhook when someone replies STOP. Meta enforces this — ignoring
 * it damages quality rating and eventually gets the number banned.
 */
export async function optOutCustomer(customerId: string) {
  const db = getServiceClient();

  await db.from("customers").update({ opted_out_at: new Date().toISOString() }).eq("id", customerId);

  await db
    .from("messages")
    .update({ status: "cancelled", last_error: "customer opted out" })
    .eq("customer_id", customerId)
    .eq("status", "pending");
}

// ── Inspection ─────────────────────────────────────────────────────────────────

export async function getQueuedMessages(salonId: string, status?: MessageStatus) {
  const db = getServiceClient();
  let q = db
    .from("messages")
    .select("id, type, status, send_at, sent_at, attempts, last_error, template_name")
    .eq("salon_id", salonId)
    .order("send_at", { ascending: true })
    .limit(100);

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Makes a queued message due immediately — used to test the 45-day flow. */
export async function sendNow(messageId: string) {
  const db = getServiceClient();
  const { error } = await db
    .from("messages")
    .update({ send_at: new Date().toISOString(), status: "pending" })
    .eq("id", messageId);
  if (error) throw error;
}
