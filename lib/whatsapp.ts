// WhatsApp Cloud API client, scoped per salon.
//
// Every send looks up the salon's own phone number ID and access token, so one
// codebase serves every salon — adding salon #50 is a row in `salons`, not a
// code change.
//
// Server-side only: reads credentials via the service client.

import { getServiceClient } from "./supabase";

// Graph API version. Meta supports each for ~2 years; override via env when
// bumping so a redeploy is all it takes.
const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

export type SalonCredentials = {
  salonId: string;
  name: string;
  phoneNumberId: string;
  accessToken: string;
};

/** A template variable, in the order the approved template expects. */
export type TemplateParam = { type: "text"; text: string };

export type SendResult =
  | { ok: true; waMessageId: string }
  | { ok: false; error: string; retryable: boolean; code?: number };

// ── Credentials ────────────────────────────────────────────────────────────────

export async function getSalonCredentials(salonId: string): Promise<SalonCredentials> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("salons")
    .select("id, name, whatsapp_phone_id, whatsapp_token")
    .eq("id", salonId)
    .single();

  if (error) throw error;
  if (!data?.whatsapp_phone_id || !data?.whatsapp_token) {
    throw new Error(`Salon ${salonId} has no WhatsApp credentials configured`);
  }

  return {
    salonId:       data.id,
    name:          data.name,
    phoneNumberId: data.whatsapp_phone_id,
    accessToken:   data.whatsapp_token,
  };
}

// ── Error classification ───────────────────────────────────────────────────────

// Retrying a permanent failure burns quota and money without ever succeeding, so
// the dispatcher needs to know which is which. These are Meta's error codes.
const PERMANENT_CODES = new Set([
  131026, // message undeliverable — recipient cannot receive
  131047, // re-engagement required — outside the 24h window, needs a template
  131051, // unsupported message type
  132000, // template param count mismatch
  132001, // template does not exist / not approved in this language
  132005, // translated text too long
  132007, // template format policy violation
  132012, // template param format mismatch
  132015, // template is paused
  132016, // template is disabled
  133010, // phone number not registered
  190,    // access token expired or invalid
]);

const RETRYABLE_CODES = new Set([
  4,      // application request limit reached
  80007,  // rate limit hit
  130429, // Cloud API message throughput limit
  131048, // spam rate limit — back off, may recover
  131056, // pair rate limit
  133016, // temporarily unavailable
  500, 502, 503, 504,
]);

function classify(code: number | undefined, httpStatus: number): boolean {
  if (code !== undefined) {
    if (PERMANENT_CODES.has(code)) return false;
    if (RETRYABLE_CODES.has(code)) return true;
  }
  // Unknown 4xx is almost always our bug — retrying will not fix it.
  // 5xx and network-level failures are worth another attempt.
  return httpStatus >= 500 || httpStatus === 429;
}

// ── Sending ────────────────────────────────────────────────────────────────────

async function post(
  creds: SalonCredentials,
  body: Record<string, unknown>
): Promise<SendResult> {
  let res: Response;
  try {
    res = await fetch(`${GRAPH}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });
  } catch (err) {
    // Network failure — never reached Meta, always worth retrying.
    return { ok: false, error: String(err), retryable: true };
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const metaError = json?.error ?? {};
    const code: number | undefined = metaError.code;
    const message: string =
      metaError.error_data?.details ?? metaError.message ?? `HTTP ${res.status}`;

    // Never log the token — Meta echoes request context in some error shapes.
    console.error(`[whatsapp] send failed (salon ${creds.salonId}) code=${code}: ${message}`);

    return { ok: false, error: message, retryable: classify(code, res.status), code };
  }

  const waMessageId: string | undefined = json?.messages?.[0]?.id;
  if (!waMessageId) {
    return { ok: false, error: "No message id in response", retryable: false };
  }

  return { ok: true, waMessageId };
}

/**
 * Sends an approved template. Required for any business-initiated message —
 * i.e. both the review and rebook flows, since neither happens inside the free
 * 24-hour window.
 *
 * `bodyParams` must match the order of {{1}}, {{2}}… in the approved template.
 * `headerImageUrl` fills an IMAGE header — the rebook message uses this to show
 * the customer their previous haircut. Meta fetches the URL itself, so it has to
 * be publicly reachable (which is why visit photos go to a public bucket).
 */
export async function sendTemplate(params: {
  salonId: string;
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
  headerImageUrl?: string;
}): Promise<SendResult> {
  const creds = await getSalonCredentials(params.salonId);
  return sendTemplateWithCreds(creds, params);
}

/** Same as sendTemplate but reuses credentials — the dispatcher batches by salon. */
export async function sendTemplateWithCreds(
  creds: SalonCredentials,
  params: {
    to: string;
    templateName: string;
    languageCode?: string;
    bodyParams?: string[];
    headerImageUrl?: string;
  }
): Promise<SendResult> {
  const components: Record<string, unknown>[] = [];

  if (params.headerImageUrl) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: params.headerImageUrl } }],
    });
  }

  if (params.bodyParams?.length) {
    components.push({
      type: "body",
      parameters: params.bodyParams.map((text): TemplateParam => ({ type: "text", text })),
    });
  }

  return post(creds, {
    to: normalizePhone(params.to),
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode ?? "en" },
      ...(components.length > 0 && { components }),
    },
  });
}

/**
 * Free-form text. Only valid inside the 24-hour window opened by a customer
 * reply — outside it Meta returns 131047 and it is billed as nothing because it
 * never sends. This is what makes the booking conversation cost ₹0.
 */
export async function sendText(params: {
  salonId: string;
  to: string;
  text: string;
  previewUrl?: boolean;
}): Promise<SendResult> {
  const creds = await getSalonCredentials(params.salonId);
  return post(creds, {
    to: normalizePhone(params.to),
    type: "text",
    text: { body: params.text, preview_url: params.previewUrl ?? false },
  });
}

/** Interactive reply buttons — also free inside the 24-hour window. Max 3. */
export async function sendButtons(params: {
  salonId: string;
  to: string;
  body: string;
  buttons: { id: string; title: string }[];
}): Promise<SendResult> {
  const creds = await getSalonCredentials(params.salonId);
  return post(creds, {
    to: normalizePhone(params.to),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: params.body },
      action: {
        buttons: params.buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

/** Marks an inbound message read — the blue ticks customers expect. Best effort. */
export async function markRead(salonId: string, waMessageId: string): Promise<void> {
  try {
    const creds = await getSalonCredentials(salonId);
    await post(creds, { status: "read", message_id: waMessageId });
  } catch (err) {
    console.warn("[whatsapp] markRead failed (non-fatal):", err);
  }
}

// ── Phone numbers ──────────────────────────────────────────────────────────────

/**
 * Meta wants digits only, including country code, with no leading + or zeros.
 * Indian numbers are commonly stored as 10 digits, so 91 is assumed when the
 * length says it is a bare local number.
 */
export function normalizePhone(phone: string, defaultCountryCode = "91"): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = defaultCountryCode + digits;
  // 0XXXXXXXXXX -> strip the trunk prefix before prepending the country code
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = defaultCountryCode + digits.slice(1);
  }
  return digits;
}
