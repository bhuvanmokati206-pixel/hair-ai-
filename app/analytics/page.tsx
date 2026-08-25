"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import StatCounter from "@/components/StatCounter";
import { getSalonStats, EMPTY_STATS, type SalonStats } from "@/lib/salonStats";
import { getSalonAnalytics, EMPTY_ANALYTICS, type SalonAnalytics } from "@/lib/salonAnalytics";
import { toCsv, downloadCsv, exportFilename } from "@/lib/exportCsv";
import { buildCustomersCsv, buildVisitsCsv, buildBillsCsv, type Dataset } from "@/lib/salonExport";
import { rupees } from "@/lib/billing";

type HistoryRow = {
  id: string;
  created_at: string;
  ended_at: string | null;
  service_type: string;
  chosen_style: string | null;
  customer_rating: number | null;
  customerName: string;
  barberName: string | null;
};

const SERVICE_LABEL: Record<string, string> = {
  haircut: "Haircut", beard: "Beard", both: "Hair + Beard",
};
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yest.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Compact "₹1.2k" / "₹3.4L" for stat cards; full rupees() elsewhere.
function shortRupees(paise: number) {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SalonStats>(EMPTY_STATS);
  const [analytics, setAnalytics] = useState<SalonAnalytics>(EMPTY_ANALYTICS);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [styleBreakdown, setStyleBreakdown] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [salonCode, setSalonCode] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: p } = await supabase
        .from("profiles").select("salon_id, salons(code)").eq("id", user.id).maybeSingle();

      if (!p?.salon_id) { setLoading(false); return; }
      setSalonId(p.salon_id);
      setSalonCode((p.salons as unknown as { code: string | null } | null)?.code ?? null);

      const [{ data: visits }, salonStats, salonAnalytics] = await Promise.all([
        supabase
          .from("visits")
          .select("id, created_at, ended_at, service_type, chosen_style, customer_rating, customers(name), barbers(name)")
          .eq("salon_id", p.salon_id)
          .order("created_at", { ascending: false })
          .limit(100),
        getSalonStats(supabase, p.salon_id),
        getSalonAnalytics(supabase, p.salon_id),
      ]);

      const rows: HistoryRow[] = (visits ?? []).map((v) => {
        const c = v.customers as unknown as { name: string | null } | null;
        const b = v.barbers as unknown as { name: string | null } | null;
        return {
          id: v.id,
          created_at: v.created_at,
          ended_at: v.ended_at,
          service_type: v.service_type,
          chosen_style: v.chosen_style,
          customer_rating: v.customer_rating,
          customerName: c?.name ?? "Walk-in",
          barberName: b?.name ?? null,
        };
      });

      const counts: Record<string, number> = {};
      rows.forEach((r) => { if (r.chosen_style) counts[r.chosen_style] = (counts[r.chosen_style] ?? 0) + 1; });

      setHistory(rows);
      setStyleBreakdown(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6));
      setStats(salonStats);
      setAnalytics(salonAnalytics);
      setLoading(false);
    })();
  }, [router]);

  async function handleExport(kind: "Customers" | "Visits" | "Bills") {
    if (!salonId || exporting) return;
    setExporting(kind);
    try {
      const supabase = createClient();
      const builder: Record<string, (s: typeof supabase, id: string) => Promise<Dataset>> = {
        Customers: buildCustomersCsv, Visits: buildVisitsCsv, Bills: buildBillsCsv,
      };
      const { headers, rows } = await builder[kind](supabase, salonId);
      if (rows.length === 0) { alert(`No ${kind.toLowerCase()} to export yet.`); return; }
      downloadCsv(exportFilename(kind, salonCode), toCsv(headers, rows));
    } catch (err) {
      console.error("[analytics] export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  const maxCount = styleBreakdown[0]?.[1] ?? 1;
  const svc = analytics.serviceBreakdown;
  const svcTotal = svc.haircut + svc.beard + svc.both || 1;
  const maxDay = Math.max(1, ...analytics.busyDays);
  const peakHour = analytics.busyHours.indexOf(Math.max(...analytics.busyHours));
  const maxTrend = Math.max(1, ...analytics.dailyTrend.map((d) => d.visits));

  // Group by day so the history reads as a timeline rather than a flat list.
  const grouped = history.reduce<Record<string, HistoryRow[]>>((acc, r) => {
    const k = dayLabel(r.created_at);
    (acc[k] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-5 flex items-start justify-between gap-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="section-label">Analytics</p>
          <h1 className="text-2xl font-black mt-0.5 gradient-text-animated">Salon insights</h1>
        </motion.div>
        <button onClick={() => window.print()}
          className="no-print text-[11px] font-bold px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-transform"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          🖨 Print
        </button>
      </div>

      {/* ── Clients ──────────────────────────────────────────── */}
      <div className="px-5 mb-4 grid grid-cols-2 gap-3">
        <StatCounter label="Total clients" value={stats.totalCustomers} accent="#8FA79A"
          sub={analytics.newCustomersWeek > 0 ? `+${analytics.newCustomersWeek} this week` : "No new this week"} loading={loading} />
        <StatCounter label="Repeat rate" value={loading ? "—" : `${analytics.repeatRatePercent}%`}
          sub={`${analytics.repeatCustomers} returning`} accent="#A9A2B8" loading={loading} />
        <StatCounter label="Completed" value={stats.completed} accent="#4FD69C" loading={loading} />
        <StatCounter label="Average rating" value={stats.averageRating ?? "—"}
          sub={stats.ratingCount > 0 ? `${stats.ratingCount} reviews` : "No reviews yet"} accent="#C9A15C" loading={loading} />
      </div>

      {/* ── Revenue ──────────────────────────────────────────── */}
      <section className="px-5 mb-6">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Revenue</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCounter label="Today" value={loading ? "—" : shortRupees(analytics.revenueTodayPaise)} accent="#4FD69C" loading={loading} />
          <StatCounter label="This week" value={loading ? "—" : shortRupees(analytics.revenueWeekPaise)} accent="#8FA79A" loading={loading} />
          <StatCounter label="This month" value={loading ? "—" : shortRupees(analytics.revenueMonthPaise)} accent="#A9A2B8" loading={loading} />
          <StatCounter label="Avg bill" value={loading ? "—" : shortRupees(analytics.averageBillPaise)}
            sub={`${analytics.billCount} bills · ${shortRupees(analytics.revenueAllTimePaise)} all-time`} accent="#C9A15C" loading={loading} />
        </div>
      </section>

      {/* ── Export ───────────────────────────────────────────── */}
      <section className="px-5 mb-7 no-print">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Export to Excel</h2>
        <div className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
            Download a spreadsheet (.csv) that opens directly in Excel or Google Sheets.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["Customers", "Visits", "Bills"] as const).map((kind) => (
              <button key={kind} onClick={() => handleExport(kind)} disabled={!!exporting || loading}
                className="text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-transform disabled:opacity-40"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                {exporting === kind ? "…" : `⬇ ${kind}`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service mix ──────────────────────────────────────── */}
      <section className="px-5 mb-7">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Service mix</h2>
        <div className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {([
            ["Haircut", svc.haircut, "#8FA79A"],
            ["Beard", svc.beard, "#C9A15C"],
            ["Hair + Beard", svc.both, "#A9A2B8"],
          ] as const).map(([name, count, color]) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{name}</span>
                <span className="text-[11px] font-black tabular-nums" style={{ color }}>
                  {count} · {Math.round((count / svcTotal) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(count / svcTotal) * 100}%` }}
                  transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: color }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Barber performance ───────────────────────────────── */}
      {analytics.barbers.length > 0 && (
        <section className="px-5 mb-7">
          <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Barber performance</h2>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {analytics.barbers.map((b, i) => (
              <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="text-[11px] font-black w-5 text-center" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{b.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {b.visits} visits{b.averageRating != null ? ` · ★ ${b.averageRating}` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black tabular-nums shrink-0" style={{ color: "var(--accent)" }}>
                  {shortRupees(b.revenuePaise)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Busiest days ─────────────────────────────────────── */}
      <section className="px-5 mb-7">
        <h2 className="text-sm font-black mb-1" style={{ color: "var(--text-primary)" }}>Busiest days</h2>
        <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>
          {analytics.busyHours.some((h) => h > 0) ? `Peak hour around ${peakHour}:00` : "No visits recorded yet"}
        </p>
        <div className="rounded-2xl p-4 flex items-end justify-between gap-2 h-32"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {analytics.busyDays.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[9px] font-bold tabular-nums" style={{ color: "var(--text-muted)" }}>{count || ""}</span>
              <motion.div initial={{ height: 0 }} animate={{ height: `${(count / maxDay) * 100}%` }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
                className="w-full rounded-md" style={{ minHeight: 3, background: "linear-gradient(180deg,#8FA79A,#A9A2B8)" }} />
              <span className="text-[9px] font-semibold" style={{ color: "var(--text-secondary)" }}>{DAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 14-day trend ─────────────────────────────────────── */}
      <section className="px-5 mb-7">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Last 14 days</h2>
        <div className="rounded-2xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-end justify-between gap-1 h-24 mb-2">
            {analytics.dailyTrend.map((d, i) => (
              <div key={d.iso} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.label}: ${d.visits} visits · ${rupees(d.revenuePaise)}`}>
                <motion.div initial={{ height: 0 }} animate={{ height: `${(d.visits / maxTrend) * 100}%` }}
                  transition={{ delay: i * 0.03, duration: 0.4 }}
                  className="w-full rounded-sm" style={{ minHeight: 2, background: d.visits ? "var(--accent)" : "var(--bg-subtle)" }} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
            <span>{analytics.dailyTrend[0]?.label}</span>
            <span>{analytics.dailyTrend[analytics.dailyTrend.length - 1]?.label}</span>
          </div>
        </div>
      </section>

      {/* ── Payment mix ──────────────────────────────────────── */}
      {analytics.paymentMix.length > 0 && (
        <section className="px-5 mb-7">
          <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Payment methods</h2>
          <div className="rounded-2xl p-4 flex flex-wrap gap-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {analytics.paymentMix.map(([method, count]) => (
              <span key={method} className="text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}>
                {method} · {count}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Most requested styles ────────────────────────────── */}
      <section className="px-5 mb-7">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Most requested styles</h2>
        {loading ? (
          <div className="h-24 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
        ) : styleBreakdown.length === 0 ? (
          <Empty>No styles chosen yet.</Empty>
        ) : (
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {styleBreakdown.map(([name, count], i) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold capitalize" style={{ color: "var(--text-primary)" }}>{name}</span>
                  <span className="text-[11px] font-black tabular-nums" style={{ color: "var(--accent)" }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxCount) * 100}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#8FA79A,#A9A2B8)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Visit history ────────────────────────────────────── */}
      <section className="px-5">
        <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>Visit history</h2>

        {loading ? (
          <div className="h-40 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
        ) : history.length === 0 ? (
          <Empty>No visits recorded yet. Scans will appear here once saved.</Empty>
        ) : (
          Object.entries(grouped).map(([day, rows]) => (
            <div key={day} className="mb-5">
              <p className="section-label mb-2">{day}</p>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {rows.map((r, i) => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3"
                    style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                        {r.customerName}
                      </p>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {SERVICE_LABEL[r.service_type] ?? r.service_type}
                        {r.chosen_style ? ` · ${r.chosen_style}` : ""}
                        {r.barberName ? ` · ${r.barberName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.customer_rating != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(201,161,92,0.12)", color: "#C9A15C" }}>
                          ★ {r.customer_rating}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: r.ended_at ? "var(--text-muted)" : "#4FD69C" }}>
                        {r.ended_at
                          ? new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                          : "in session"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <BottomNav />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 text-center text-xs"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}
