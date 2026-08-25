// RAG (Retrieval-Augmented Generation) layer
// Handles customer memory: store visits, retrieve history, semantic style search.
// All DB calls use the service client (server-side only — never call from browser).

import { getServiceClient } from "./supabase";

// ── Embedding ──────────────────────────────────────────────────────────────────
// Uses OpenAI text-embedding-3-small ($0.02 / 1M tokens ≈ free for a salon).
// Swap the URL/model if you use a different provider.
export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[rag] OPENAI_API_KEY not set — embeddings disabled");
    return [];
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    console.error("[rag] Embedding failed:", await res.text());
    return [];
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

// Convert analysis JSON to a plain sentence for embedding
function analysisToText(analysis: Record<string, unknown>): string {
  const parts: string[] = [];
  if (analysis.gender)      parts.push(String(analysis.gender));
  if (analysis.faceShape)   parts.push(`${analysis.faceShape} face`);
  if (analysis.faceLength)  parts.push(`${analysis.faceLength} face length`);
  if (analysis.hairLength)  parts.push(`${analysis.hairLength} hair`);
  if (analysis.hairTexture) parts.push(`${analysis.hairTexture} texture`);
  if (analysis.hairDensity) parts.push(`${analysis.hairDensity} density`);
  if (analysis.hairColor)   parts.push(`${analysis.hairColor} color`);
  if (analysis.skinTone)    parts.push(`${analysis.skinTone} skin`);
  if (analysis.currentStyle) parts.push(`current: ${analysis.currentStyle}`);
  return parts.join(", ");
}

// ── Customer ───────────────────────────────────────────────────────────────────

export type Gender = "male" | "female" | "other";

// Customers are scoped to a salon — the same phone number can belong to a
// different customer at each salon, so every lookup needs salonId.
export async function findOrCreateCustomer(
  phone: string,
  name?: string,
  salonId?: string,
  extra?: { gender?: Gender; acceptedTerms?: boolean },
) {
  const db = getServiceClient();
  const normalized = phone.replace(/\D/g, ""); // strip non-digits

  let query = db.from("customers").select("*").eq("phone", normalized);
  if (salonId) query = query.eq("salon_id", salonId);

  const { data: existing } = await query.maybeSingle();
  if (existing) {
    // Backfill gender/consent on a returning customer if they were captured now
    // but missing before — without overwriting anything already set.
    const patch: Record<string, unknown> = {};
    if (extra?.gender && !existing.gender) patch.gender = extra.gender;
    if (extra?.acceptedTerms && !existing.terms_accepted_at) {
      patch.terms_accepted_at = new Date().toISOString();
      if (!existing.wa_opt_in) { patch.wa_opt_in = true; patch.wa_opt_in_at = new Date().toISOString(); }
    }
    if (Object.keys(patch).length > 0) {
      const { data: updated } = await db.from("customers").update(patch).eq("id", existing.id).select().single();
      // A missing gender/terms column (migration not run) must not break the
      // returning-customer path — fall back to the existing row.
      return updated ?? existing;
    }
    return existing;
  }

  const now = new Date().toISOString();

  // Only the base columns are guaranteed. gender + terms_accepted_at ship in
  // add-customer-gender.sql, which may not have run yet — so we try the full
  // insert, and if a column is missing (PGRST204) we retry with just the base
  // fields. The scan must save even before the migration lands.
  const base: Record<string, unknown> = {
    phone: normalized,
    name: name ?? null,
    salon_id: salonId ?? null,
    // wa_opt_in shipped in schema-v2, so it's always safe.
    wa_opt_in: extra?.acceptedTerms ?? false,
    wa_opt_in_at: extra?.acceptedTerms ? now : null,
  };
  const full = {
    ...base,
    gender: extra?.gender ?? null,
    terms_accepted_at: extra?.acceptedTerms ? now : null,
  };

  let { data: created, error } = await db.from("customers").insert(full).select().single();

  if (error?.code === "PGRST204" || error?.code === "42703") {
    console.warn("[rag] customers is missing gender/terms columns — run add-customer-gender.sql. Saving without them.");
    ({ data: created, error } = await db.from("customers").insert(base).select().single());
  }

  if (error) throw error;
  return created;
}

export async function getCustomer(phone: string, salonId?: string) {
  const db = getServiceClient();
  const normalized = phone.replace(/\D/g, "");

  let query = db.from("customers").select("*").eq("phone", normalized);
  if (salonId) query = query.eq("salon_id", salonId);

  const { data } = await query.maybeSingle();
  return data ?? null;
}

// ── Visits ─────────────────────────────────────────────────────────────────────

export type ServiceType = "haircut" | "beard" | "both";

export async function saveVisit(params: {
  customerId: string;
  analysis: Record<string, unknown>;
  salonId?: string;
  barberId?: string;
  /** Column is NOT NULL in the schema; defaults to a haircut. */
  serviceType?: ServiceType;
  chosenStyle?: string;
  chosenBeardStyle?: string;
  barberNotes?: string;
}) {
  const db = getServiceClient();
  const text = analysisToText(params.analysis);
  const embedding = await embed(text);

  const { data, error } = await db
    .from("visits")
    .insert({
      customer_id:        params.customerId,
      salon_id:           params.salonId ?? null,
      barber_id:          params.barberId ?? null,
      service_type:       params.serviceType ?? "haircut",
      analysis:           params.analysis,
      chosen_style:       params.chosenStyle ?? null,
      chosen_beard_style: params.chosenBeardStyle ?? null,
      barber_notes:       params.barberNotes ?? null,
      embedding:          embedding.length > 0 ? JSON.stringify(embedding) : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export type VisitStatus = "scanning" | "choosing" | "in_progress" | "completed" | "abandoned";

export async function updateVisitChoice(visitId: string, params: {
  chosenStyle?: string;
  chosenBeardStyle?: string;
  barberNotes?: string;
  customerRating?: number;
  customerReview?: string;
  serviceType?: ServiceType;
  barberId?: string;
  status?: VisitStatus;
  /** Set when the barber checks the customer out — the review message timer counts from here. */
  endedAt?: string;
}) {
  const db = getServiceClient();

  // Only send keys that were actually provided, so a partial update never
  // overwrites an existing value with null.
  const patch: Record<string, unknown> = {};
  if (params.chosenStyle      !== undefined) patch.chosen_style       = params.chosenStyle;
  if (params.chosenBeardStyle !== undefined) patch.chosen_beard_style = params.chosenBeardStyle;
  if (params.barberNotes      !== undefined) patch.barber_notes       = params.barberNotes;
  if (params.customerRating   !== undefined) patch.customer_rating    = params.customerRating;
  if (params.customerReview   !== undefined) patch.customer_review    = params.customerReview;
  if (params.serviceType      !== undefined) patch.service_type       = params.serviceType;
  if (params.barberId         !== undefined) patch.barber_id          = params.barberId;
  if (params.status           !== undefined) patch.status             = params.status;
  if (params.endedAt          !== undefined) patch.ended_at           = params.endedAt;

  if (Object.keys(patch).length === 0) return;

  const { error } = await db.from("visits").update(patch).eq("id", visitId);
  if (error) throw error;
}

// One in-progress row for the dashboard queue.
export type InProgressVisit = {
  id: string;
  created_at: string;
  status: VisitStatus;
  chosen_style: string | null;
  service_type: string;
  customerName: string;
  barberName: string | null;
};

/** Visits not yet checked out, newest first — the park-and-resume queue. */
export async function getInProgressVisits(salonId: string): Promise<InProgressVisit[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("visits")
    .select("id, created_at, status, chosen_style, service_type, customers(name), barbers(name)")
    .eq("salon_id", salonId)
    .is("ended_at", null)
    .in("status", ["scanning", "choosing", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((v) => {
    const c = v.customers as unknown as { name: string | null } | null;
    const b = v.barbers as unknown as { name: string | null } | null;
    return {
      id: v.id,
      created_at: v.created_at,
      status: v.status as VisitStatus,
      chosen_style: v.chosen_style,
      service_type: v.service_type,
      customerName: c?.name ?? "Walk-in",
      barberName: b?.name ?? null,
    };
  });
}

// Retrieve last N visits for a customer (most recent first)
export async function getRecentVisits(customerId: string, limit = 3) {
  const db = getServiceClient();
  const { data } = await db
    .from("visits")
    .select("id, created_at, analysis, chosen_style, barber_notes, customer_rating")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// Semantic search: find visits most similar to current analysis
export async function findSimilarVisits(customerId: string, analysis: Record<string, unknown>, limit = 3) {
  const db = getServiceClient();
  const text = analysisToText(analysis);
  const embedding = await embed(text);
  if (embedding.length === 0) return getRecentVisits(customerId, limit);

  const { data } = await db.rpc("match_visits", {
    query_embedding: JSON.stringify(embedding),
    match_customer:  customerId,
    match_count:     limit,
  });
  return data ?? [];
}

// ── Style Library ──────────────────────────────────────────────────────────────

export async function findMatchingStyles(analysis: Record<string, unknown>, limit = 6) {
  const db = getServiceClient();
  const text = analysisToText(analysis);
  const embedding = await embed(text);
  if (embedding.length === 0) return [];

  const { data } = await db.rpc("match_styles", {
    query_embedding: JSON.stringify(embedding),
    match_count: limit,
  });
  return data ?? [];
}

// ── Context Builder ────────────────────────────────────────────────────────────
// Builds a plain-text context block to inject into Claude's prompt.

export async function buildCustomerContext(params: {
  customerId: string;
  currentAnalysis: Record<string, unknown>;
}): Promise<string> {
  const visits = await findSimilarVisits(params.customerId, params.currentAnalysis);
  if (visits.length === 0) return "";

  const lines: string[] = ["CUSTOMER HISTORY (use this to personalize recommendations):"];

  visits.forEach((v: Record<string, unknown>, i: number) => {
    const date = new Date(v.created_at as string).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
    const a = v.analysis as Record<string, unknown>;
    lines.push(`\nVisit ${i + 1} — ${date}:`);
    lines.push(`  Hair: ${a.hairLength} ${a.hairTexture} ${a.hairColor} (top ${(a.hairMeasurements as Record<string, string>)?.topCm ?? "?"}, sides ${(a.hairMeasurements as Record<string, string>)?.sideCm ?? "?"})`);
    if (v.chosen_style) lines.push(`  Chose: ${v.chosen_style}`);
    if (v.customer_rating) lines.push(`  Rating: ${v.customer_rating}/5`);
    if (v.barber_notes) lines.push(`  Barber note: ${v.barber_notes}`);
  });

  return lines.join("\n");
}
