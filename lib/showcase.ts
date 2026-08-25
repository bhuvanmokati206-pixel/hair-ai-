// Before/after showcase for the home page. Pairs each recent visit's ORIGINAL front
// photo (before) with its GENERATED hero photo (after), plus the customer's rating
// and (optional) short review. Only visits that actually have an "after" image show.
import type { SupabaseClient } from "@supabase/supabase-js";

export type ShowcaseItem = {
  visitId: string;
  customerName: string;
  style: string | null;
  rating: number | null;      // 1–5
  review: string | null;      // short customer quote, if captured
  beforeUrl: string | null;
  afterUrl: string | null;
  createdAt: string;
};

type VisitRow = {
  id: string;
  chosen_style: string | null;
  customer_rating: number | null;
  customer_review?: string | null;
  created_at: string;
  customers: { name: string | null } | null;
};

/**
 * Recent before/after pairs for a salon. `customer_review` is selected when the
 * column exists; if the migration (supabase/add-customer-review.sql) hasn't been
 * run yet, we fall back to the same query without it so the gallery still works.
 */
export async function getShowcase(
  supabase: SupabaseClient,
  salonId: string,
  limit = 12
): Promise<ShowcaseItem[]> {
  const base = "id, chosen_style, customer_rating, created_at, customers(name)";

  let visits: VisitRow[] | null = null;
  const withReview = await supabase
    .from("visits")
    .select(`${base}, customer_review`)
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (withReview.error) {
    // Column probably missing — retry without it.
    const plain = await supabase
      .from("visits")
      .select(base)
      .eq("salon_id", salonId)
      .order("created_at", { ascending: false })
      .limit(40);
    visits = (plain.data as unknown as VisitRow[]) ?? [];
  } else {
    visits = (withReview.data as unknown as VisitRow[]) ?? [];
  }
  if (!visits.length) return [];

  const ids = visits.map((v) => v.id);
  const { data: photos } = await supabase
    .from("visit_photos")
    .select("visit_id, kind, angle, is_hero, url")
    .in("visit_id", ids);

  const byVisit = new Map<string, { before?: string; after?: string }>();
  for (const p of (photos ?? []) as { visit_id: string; kind: string; angle: string | null; is_hero: boolean | null; url: string | null }[]) {
    if (!p.url) continue;
    const g = byVisit.get(p.visit_id) ?? {};
    if (p.kind === "original" && (p.angle === "front" || !g.before)) g.before = p.url;
    if (p.kind === "generated" && (p.is_hero || !g.after)) g.after = p.url;
    byVisit.set(p.visit_id, g);
  }

  return visits
    .map((v): ShowcaseItem => {
      const g = byVisit.get(v.id) ?? {};
      return {
        visitId: v.id,
        customerName: v.customers?.name ?? "Walk-in",
        style: v.chosen_style,
        rating: v.customer_rating,
        review: v.customer_review ?? null,
        beforeUrl: g.before ?? null,
        afterUrl: g.after ?? null,
        createdAt: v.created_at,
      };
    })
    .filter((it) => it.afterUrl) // must have an "after" to be worth showing
    .slice(0, limit);
}
