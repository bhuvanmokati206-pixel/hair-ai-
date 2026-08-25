// Business analytics for the salon owner — the numbers that answer "how is the
// shop doing?" rather than "who is in the chair right now?" (that's salonStats).
//
// Everything is derived live from the salon's own rows. The browser client is
// used deliberately: RLS scopes every table to auth_salon_id(), so a salon can
// only ever read its own data, and there is no server round trip to add.
//
// Money is in PAISE throughout, matching bills/transactions. Format with
// rupees() from lib/billing at the edge, never store a divided-by-100 float.

import type { SupabaseClient } from "@supabase/supabase-js";

export type BarberPerformance = {
  id: string;
  name: string;
  visits: number;
  revenuePaise: number;
  averageRating: number | null;
};

export type SalonAnalytics = {
  // ── Clients ───────────────────────────────────────────────
  totalCustomers: number;
  newCustomersWeek: number;
  newCustomersMonth: number;
  /** Customers with more than one visit, as a share (0–100) of all customers. */
  repeatRatePercent: number;
  repeatCustomers: number;

  // ── Revenue (paise) ───────────────────────────────────────
  revenueTodayPaise: number;
  revenueWeekPaise: number;
  revenueMonthPaise: number;
  revenueAllTimePaise: number;
  billCount: number;
  /** Mean bill value all-time, paise. */
  averageBillPaise: number;

  // ── Mix & performance ─────────────────────────────────────
  serviceBreakdown: { haircut: number; beard: number; both: number };
  paymentMix: [string, number][];      // [method, count] desc
  barbers: BarberPerformance[];        // desc by revenue

  // ── Timing ────────────────────────────────────────────────
  busyHours: number[];                 // length 24, visit counts by hour
  busyDays: number[];                  // length 7, Sun..Sat
  /** Last 14 days, oldest→newest: { label, visits, revenuePaise }. */
  dailyTrend: { label: string; iso: string; visits: number; revenuePaise: number }[];
};

export const EMPTY_ANALYTICS: SalonAnalytics = {
  totalCustomers: 0, newCustomersWeek: 0, newCustomersMonth: 0,
  repeatRatePercent: 0, repeatCustomers: 0,
  revenueTodayPaise: 0, revenueWeekPaise: 0, revenueMonthPaise: 0,
  revenueAllTimePaise: 0, billCount: 0, averageBillPaise: 0,
  serviceBreakdown: { haircut: 0, beard: 0, both: 0 },
  paymentMix: [], barbers: [],
  busyHours: Array(24).fill(0), busyDays: Array(7).fill(0),
  dailyTrend: [],
};

type VisitRow = {
  created_at: string;
  service_type: string;
  barber_id: string | null;
  customer_id: string | null;
  customer_rating: number | null;
};
type BillRow = {
  created_at: string;
  total_paise: number | null;
  payment_method: string | null;
  barber_id: string | null;
};
type BarberRow = { id: string; name: string };

// PostgREST caps a single response at 1000 rows. Page through so a busy salon's
// totals stay correct instead of silently topping out at a thousand.
async function fetchAll<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  salonId: string,
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq("salon_id", salonId)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function getSalonAnalytics(
  supabase: SupabaseClient,
  salonId: string,
): Promise<SalonAnalytics> {
  const now = new Date();
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  const weekAgo = new Date(midnight); weekAgo.setDate(weekAgo.getDate() - 6);   // today + prior 6 days
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // bills is missing until add-bills.sql runs; treat that as "no revenue yet"
  // rather than failing the whole page.
  let bills: BillRow[] = [];
  const [visits, barbers, totalCustomers, newWeek, newMonth] = await Promise.all([
    fetchAll<VisitRow>(supabase, "visits",
      "created_at, service_type, barber_id, customer_id, customer_rating", salonId),
    supabase.from("barbers").select("id, name").eq("salon_id", salonId),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("salon_id", salonId),
    supabase.from("customers").select("*", { count: "exact", head: true })
      .eq("salon_id", salonId).gte("created_at", weekAgo.toISOString()),
    supabase.from("customers").select("*", { count: "exact", head: true })
      .eq("salon_id", salonId).gte("created_at", monthStart.toISOString()),
  ]);
  try {
    bills = await fetchAll<BillRow>(supabase, "bills",
      "created_at, total_paise, payment_method, barber_id", salonId);
  } catch {
    bills = [];
  }

  const barberRows = (barbers.data ?? []) as BarberRow[];
  const barberName = new Map(barberRows.map((b) => [b.id, b.name]));

  // ── Revenue ───────────────────────────────────────────────
  let revenueTodayPaise = 0, revenueWeekPaise = 0, revenueMonthPaise = 0, revenueAllTimePaise = 0;
  const paymentCounts: Record<string, number> = {};
  const revByBarber: Record<string, number> = {};
  for (const b of bills) {
    const paise = b.total_paise ?? 0;
    const t = new Date(b.created_at);
    revenueAllTimePaise += paise;
    if (t >= midnight) revenueTodayPaise += paise;
    if (t >= weekAgo) revenueWeekPaise += paise;
    if (t >= monthStart) revenueMonthPaise += paise;
    const method = b.payment_method || "Unrecorded";
    paymentCounts[method] = (paymentCounts[method] ?? 0) + 1;
    if (b.barber_id) revByBarber[b.barber_id] = (revByBarber[b.barber_id] ?? 0) + paise;
  }

  // ── Service mix, timing, per-barber visits/ratings ────────
  const serviceBreakdown = { haircut: 0, beard: 0, both: 0 };
  const busyHours = Array(24).fill(0);
  const busyDays = Array(7).fill(0);
  const visitsByBarber: Record<string, number> = {};
  const ratingSum: Record<string, number> = {};
  const ratingCount: Record<string, number> = {};
  const visitsByCustomer: Record<string, number> = {};

  // 14-day trend buckets, keyed by YYYY-MM-DD.
  const trendDays: { label: string; iso: string; key: string }[] = [];
  const trendVisits: Record<string, number> = {};
  const trendRevenue: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(midnight); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendDays.push({ key, iso: d.toISOString(), label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) });
    trendVisits[key] = 0;
    trendRevenue[key] = 0;
  }

  for (const v of visits) {
    if (v.service_type in serviceBreakdown) {
      serviceBreakdown[v.service_type as keyof typeof serviceBreakdown]++;
    }
    const t = new Date(v.created_at);
    busyHours[t.getHours()]++;
    busyDays[t.getDay()]++;
    if (v.barber_id) {
      visitsByBarber[v.barber_id] = (visitsByBarber[v.barber_id] ?? 0) + 1;
      if (v.customer_rating != null) {
        ratingSum[v.barber_id] = (ratingSum[v.barber_id] ?? 0) + v.customer_rating;
        ratingCount[v.barber_id] = (ratingCount[v.barber_id] ?? 0) + 1;
      }
    }
    if (v.customer_id) visitsByCustomer[v.customer_id] = (visitsByCustomer[v.customer_id] ?? 0) + 1;
    const key = v.created_at.slice(0, 10);
    if (key in trendVisits) trendVisits[key]++;
  }
  for (const b of bills) {
    const key = b.created_at.slice(0, 10);
    if (key in trendRevenue) trendRevenue[key] += b.total_paise ?? 0;
  }

  // ── Repeat rate ───────────────────────────────────────────
  const repeatCustomers = Object.values(visitsByCustomer).filter((n) => n > 1).length;
  const custTotal = totalCustomers.count ?? 0;
  const repeatRatePercent = custTotal > 0 ? Math.round((repeatCustomers / custTotal) * 100) : 0;

  // ── Barber leaderboard ────────────────────────────────────
  const barberIds = new Set<string>([
    ...Object.keys(visitsByBarber), ...Object.keys(revByBarber),
  ]);
  const barberPerf: BarberPerformance[] = [...barberIds].map((id) => ({
    id,
    name: barberName.get(id) ?? "Unassigned",
    visits: visitsByBarber[id] ?? 0,
    revenuePaise: revByBarber[id] ?? 0,
    averageRating: ratingCount[id]
      ? Math.round((ratingSum[id] / ratingCount[id]) * 10) / 10
      : null,
  })).sort((a, b) => b.revenuePaise - a.revenuePaise || b.visits - a.visits);

  return {
    totalCustomers: custTotal,
    newCustomersWeek: newWeek.count ?? 0,
    newCustomersMonth: newMonth.count ?? 0,
    repeatRatePercent,
    repeatCustomers,
    revenueTodayPaise, revenueWeekPaise, revenueMonthPaise, revenueAllTimePaise,
    billCount: bills.length,
    averageBillPaise: bills.length ? Math.round(revenueAllTimePaise / bills.length) : 0,
    serviceBreakdown,
    paymentMix: Object.entries(paymentCounts).sort((a, b) => b[1] - a[1]),
    barbers: barberPerf,
    busyHours,
    busyDays,
    dailyTrend: trendDays.map((d) => ({
      label: d.label, iso: d.iso,
      visits: trendVisits[d.key], revenuePaise: trendRevenue[d.key],
    })),
  };
}
