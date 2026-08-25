// Admin salon detail — one salon's customers, visits, and a visit-trend graph.
//
// Server Component; requireAdmin() gates it. Reads with the service client since
// an admin deliberately looks across salons.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { getSalonStats } from "@/lib/salonStats";
import StatCounter from "@/components/StatCounter";
import MiniBarChart from "@/components/MiniBarChart";

export const dynamic = "force-dynamic";

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default async function SalonDetailPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited.
  params: Promise<{ salonId: string }>;
}) {
  await requireAdmin();
  const { salonId } = await params;
  const db = getServiceClient();

  const { data: salon } = await db
    .from("salons")
    .select("id, code, name, city, state, status, email, phone, created_at")
    .eq("id", salonId)
    .maybeSingle();

  if (!salon) notFound();

  const [stats, { data: customers }, { data: visits }] = await Promise.all([
    getSalonStats(db, salonId),
    // gender is intentionally not selected: the add-customer-gender.sql migration
    // may not have run, and selecting a missing column errors the whole query,
    // silently blanking the customer list. Keep this resilient.
    db.from("customers").select("id, name, phone, created_at").eq("salon_id", salonId).order("created_at", { ascending: false }),
    db.from("visits").select("id, created_at, chosen_style, service_type, customer_rating, customers(name), barbers(name)").eq("salon_id", salonId).order("created_at", { ascending: false }).limit(200),
  ]);

  const custRows  = (customers ?? []) as { id: string; name: string | null; phone: string; created_at: string }[];
  const visitRows = (visits ?? []) as unknown as {
    id: string; created_at: string; chosen_style: string | null; service_type: string;
    customer_rating: number | null; customers: { name: string | null } | null; barbers: { name: string | null } | null;
  }[];

  // Visit trend: last 14 days, bucketed by day.
  const trend = buildDailyTrend(visitRows.map((v) => v.created_at), 14);

  // Style popularity.
  const styleCounts: Record<string, number> = {};
  visitRows.forEach((v) => { if (v.chosen_style) styleCounts[v.chosen_style] = (styleCounts[v.chosen_style] ?? 0) + 1; });
  const topStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxStyle = topStyles[0]?.[1] ?? 1;

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-5">
        <Link href="/admin" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>‹ All salons</Link>
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{salon.name}</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(143,167,154,0.12)", color: "var(--accent)" }}>{salon.status}</span>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          <span className="font-mono">{salon.code}</span>
          {salon.city ? ` · ${salon.city}` : ""}{salon.email ? ` · ${salon.email}` : ""}
        </p>
      </div>

      {/* Counters */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-6">
        <StatCounter label="Customers" value={custRows.length} accent="#8FA79A" />
        <StatCounter label="Total scans" value={visitRows.length} accent="#A9A2B8" />
        <StatCounter label="Completed" value={stats.completed} accent="#16A34A" />
        <StatCounter label="Avg rating" value={stats.averageRating ?? "—"}
          sub={stats.ratingCount > 0 ? `${stats.ratingCount} reviews` : "No reviews"} accent="#C9A15C" />
      </div>

      {/* Visit trend graph */}
      <section className="px-5 mb-7">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Scans · last 14 days</h2>
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <MiniBarChart data={trend} />
        </div>
      </section>

      {/* Style popularity */}
      <section className="px-5 mb-7">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Most requested styles</h2>
        {topStyles.length === 0 ? (
          <Empty>No styles chosen yet.</Empty>
        ) : (
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {topStyles.map(([name, count]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold capitalize" style={{ color: "var(--text-primary)" }}>{name}</span>
                  <span className="text-[11px] font-black" style={{ color: "var(--accent)" }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(count / maxStyle) * 100}%`, background: "linear-gradient(90deg,#8FA79A,#A9A2B8)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Customers */}
      <section className="px-5 mb-7">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Customers ({custRows.length})</h2>
        {custRows.length === 0 ? (
          <Empty>No customers yet.</Empty>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {custRows.slice(0, 50).map((c, i) => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{c.name ?? "Walk-in"}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {c.phone} · joined {dateFmt(c.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {custRows.length > 50 && (
              <div className="px-4 py-2 text-center text-[11px]" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
                +{custRows.length - 50} more
              </div>
            )}
          </div>
        )}
      </section>

      {/* Recent visits */}
      <section className="px-5">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Recent visits</h2>
        {visitRows.length === 0 ? (
          <Empty>No visits yet.</Empty>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {visitRows.slice(0, 30).map((v, i) => (
              <div key={v.id} className="px-4 py-3 flex items-center justify-between gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{v.customers?.name ?? "Walk-in"}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                    {v.chosen_style ?? v.service_type}{v.barbers?.name ? ` · ${v.barbers.name}` : ""} · {dateFmt(v.created_at)}
                  </p>
                </div>
                {v.customer_rating != null && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: "rgba(201,161,92,0.12)", color: "#C9A15C" }}>★ {v.customer_rating}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Buckets ISO timestamps into the last `days` calendar days, oldest first.
function buildDailyTrend(timestamps: string[], days: number): { label: string; value: number }[] {
  const buckets: { label: string; value: number; key: string }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    buckets.push({
      key: d.toISOString().slice(0, 10),
      label: String(d.getDate()),
      value: 0,
    });
  }
  const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
  for (const ts of timestamps) {
    const k = new Date(ts).toISOString().slice(0, 10);
    if (k in index) buckets[index[k]].value++;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 text-center text-xs"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}
