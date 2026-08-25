// Builds the three spreadsheet datasets the owner can download from Analytics:
// a customer book, a visit log, and a bill register. All salon-scoped by RLS
// through the browser client, same as the analytics reads.
//
// Money columns are emitted as plain rupee numbers (paise / 100) so Excel keeps
// them numeric and sums/averages work — the ₹ symbol would force text.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cell } from "./exportCsv";

export type Dataset = { headers: string[]; rows: Cell[][] };

const rupees = (paise: number | null | undefined) => (paise ?? 0) / 100;
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const SERVICE_LABEL: Record<string, string> = { haircut: "Haircut", beard: "Beard", both: "Hair + Beard" };

async function pageAll(
  supabase: SupabaseClient, table: string, columns: string, salonId: string,
): Promise<Record<string, unknown>[]> {
  const PAGE = 1000;
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table).select(columns).eq("salon_id", salonId)
      .order("created_at", { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** One row per customer, with their visit count, spend and recency rolled in —
 *  the view a salon actually wants when it exports its "customer list". */
export async function buildCustomersCsv(supabase: SupabaseClient, salonId: string): Promise<Dataset> {
  const [customers, visits, bills] = await Promise.all([
    pageAll(supabase, "customers", "id, name, phone, gender, created_at", salonId),
    pageAll(supabase, "visits", "customer_id, created_at, customer_rating", salonId),
    pageAll(supabase, "bills", "customer_id, total_paise", salonId).catch(() => []),
  ]);

  const visitCount: Record<string, number> = {};
  const lastVisit: Record<string, string> = {};
  const ratingSum: Record<string, number> = {};
  const ratingN: Record<string, number> = {};
  for (const v of visits) {
    const id = v.customer_id as string | null;
    if (!id) continue;
    visitCount[id] = (visitCount[id] ?? 0) + 1;
    const ts = v.created_at as string;
    if (!lastVisit[id] || ts > lastVisit[id]) lastVisit[id] = ts;
    if (v.customer_rating != null) {
      ratingSum[id] = (ratingSum[id] ?? 0) + (v.customer_rating as number);
      ratingN[id] = (ratingN[id] ?? 0) + 1;
    }
  }
  const spend: Record<string, number> = {};
  for (const b of bills) {
    const id = b.customer_id as string | null;
    if (id) spend[id] = (spend[id] ?? 0) + ((b.total_paise as number | null) ?? 0);
  }

  const headers = [
    "Name", "Phone", "Gender", "Total visits", "Last visit",
    "Total spent (₹)", "Avg rating", "First seen",
  ];
  const rows: Cell[][] = customers.map((c) => {
    const id = c.id as string;
    return [
      (c.name as string) || "Walk-in",
      (c.phone as string) ?? "",
      (c.gender as string) ?? "",
      visitCount[id] ?? 0,
      lastVisit[id] ? dateTime(lastVisit[id]) : "—",
      rupees(spend[id] ?? 0),
      ratingN[id] ? Math.round((ratingSum[id] / ratingN[id]) * 10) / 10 : "",
      dateTime(c.created_at as string),
    ];
  });
  // Most-visited first — the regulars a salon cares about surface at the top.
  rows.sort((a, b) => Number(b[3]) - Number(a[3]));
  return { headers, rows };
}

/** One row per visit, with customer, barber, service and its bill total. */
export async function buildVisitsCsv(supabase: SupabaseClient, salonId: string): Promise<Dataset> {
  const visits = await supabase
    .from("visits")
    .select("created_at, ended_at, service_type, chosen_style, chosen_beard_style, status, customer_rating, customers(name, phone), barbers(name)")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  if (visits.error) throw visits.error;

  const headers = [
    "Date", "Customer", "Phone", "Service", "Hair style", "Beard style",
    "Barber", "Rating", "Status", "Checked out",
  ];
  const rows: Cell[][] = (visits.data ?? []).map((v) => {
    const c = v.customers as unknown as { name: string | null; phone: string | null } | null;
    const b = v.barbers as unknown as { name: string | null } | null;
    return [
      dateTime(v.created_at),
      c?.name || "Walk-in",
      c?.phone ?? "",
      SERVICE_LABEL[v.service_type] ?? v.service_type,
      v.chosen_style ?? "",
      v.chosen_beard_style ?? "",
      b?.name ?? "",
      v.customer_rating ?? "",
      v.status ?? "",
      v.ended_at ? dateTime(v.ended_at) : "",
    ];
  });
  return { headers, rows };
}

/** One row per finalized bill — the register for GST / bookkeeping. */
export async function buildBillsCsv(supabase: SupabaseClient, salonId: string): Promise<Dataset> {
  const bills = await supabase
    .from("bills")
    .select("invoice_no, created_at, subtotal_paise, discount_paise, gst_percent, gst_paise, total_paise, payment_method, customers(name, phone), barbers(name)")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  if (bills.error) throw bills.error;

  const headers = [
    "Invoice no", "Date", "Customer", "Phone", "Barber",
    "Subtotal (₹)", "Discount (₹)", "GST %", "GST (₹)", "Total (₹)", "Payment",
  ];
  const rows: Cell[][] = (bills.data ?? []).map((b) => {
    const c = b.customers as unknown as { name: string | null; phone: string | null } | null;
    const barber = b.barbers as unknown as { name: string | null } | null;
    return [
      b.invoice_no ?? "",
      dateTime(b.created_at),
      c?.name || "Walk-in",
      c?.phone ?? "",
      barber?.name ?? "",
      rupees(b.subtotal_paise),
      rupees(b.discount_paise),
      b.gst_percent ?? 0,
      rupees(b.gst_paise),
      rupees(b.total_paise),
      b.payment_method ?? "",
    ];
  });
  return { headers, rows };
}
