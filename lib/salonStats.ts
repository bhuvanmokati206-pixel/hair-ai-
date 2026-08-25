// Salon counters, read live from `visits` on every load.
//
// Nothing is cached or stored as a running total — a counter column would drift
// the moment a visit is deleted or backfilled. These are derived, so they are
// always right and they move the instant a scan is saved.

import type { SupabaseClient } from "@supabase/supabase-js";

export type SalonStats = {
  /** Visits that have been checked out. */
  completed: number;
  /** Started but not checked out — the "in session" counter. */
  inSession: number;
  /** Visits created since midnight. */
  today: number;
  /** Mean customer_rating, or null when nobody has rated yet. */
  averageRating: number | null;
  ratingCount: number;
  /** Most-chosen style across all time. */
  topStyle: string | null;
  /** Distinct customers on the salon's books — the "no. of clients" counter. */
  totalCustomers: number;
};

export const EMPTY_STATS: SalonStats = {
  completed: 0, inSession: 0, today: 0,
  averageRating: null, ratingCount: 0, topStyle: null,
  totalCustomers: 0,
};

export async function getSalonStats(
  supabase: SupabaseClient,
  salonId: string
): Promise<SalonStats> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const [completed, inSession, today, rated, styles, customers] = await Promise.all([
    supabase.from("visits").select("*", { count: "exact", head: true })
      .eq("salon_id", salonId).not("ended_at", "is", null),
    supabase.from("visits").select("*", { count: "exact", head: true })
      .eq("salon_id", salonId).is("ended_at", null),
    supabase.from("visits").select("*", { count: "exact", head: true })
      .eq("salon_id", salonId).gte("created_at", midnight.toISOString()),
    supabase.from("visits").select("customer_rating")
      .eq("salon_id", salonId).not("customer_rating", "is", null),
    supabase.from("visits").select("chosen_style")
      .eq("salon_id", salonId).not("chosen_style", "is", null),
    supabase.from("customers").select("*", { count: "exact", head: true })
      .eq("salon_id", salonId),
  ]);

  const ratings = (rated.data ?? []).map((r) => r.customer_rating as number);
  const averageRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  const counts: Record<string, number> = {};
  (styles.data ?? []).forEach((s) => {
    const k = s.chosen_style as string;
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  });
  const topStyle = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    completed: completed.count ?? 0,
    inSession: inSession.count ?? 0,
    today: today.count ?? 0,
    averageRating,
    ratingCount: ratings.length,
    topStyle,
    totalCustomers: customers.count ?? 0,
  };
}
