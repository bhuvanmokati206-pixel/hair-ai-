"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
// Cookie-based client. The old singleton in @/lib/supabase keeps its session in
// localStorage, which the login page no longer writes to — getUser() there
// returns null and bounces a signed-in user back to /login.
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import { getSalonStats, EMPTY_STATS, type SalonStats } from "@/lib/salonStats";

// ── NOIR palette (from the imported design) ────────────────────────────────
const ACC = "#8FA79A";
const MUTE = "#948D82";
const FAINT = "#7C766C";

const micro: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", color: FAINT,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── In-progress queue (park & resume) ──────────────────────────────
type InProgress = {
  id: string;
  created_at: string;
  status: string;
  chosen_style: string | null;
  service_type: string;
  customerName: string;
  barberName: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  scanning: "Scanning", choosing: "Choosing", in_progress: "In the chair",
};

// Recent customers — the last few visits for this salon, resumable or checkout-able.
type RecentVisit = {
  id: string;
  customer_name: string;
  created_at: string;
  ended_at: string | null;
  style: string | null;
};

function elapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Main page ─────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { profile, setProfile } = useStore();
  const [stats, setStats] = useState<SalonStats>(EMPTY_STATS);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<InProgress[]>([]);
  const [recent, setRecent] = useState<RecentVisit[]>([]);

  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/visit/in-progress");
      const body = await res.json();
      if (res.ok) setQueue(body.visits ?? []);
    } catch { /* queue stays empty */ }
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      if (skipAuth) {
        setProfile({ id: "demo", salon_name: "Demo Salon", city: "", plan_tier: "free" });
        setLoading(false);
        void loadQueue();
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: p } = await supabase
        .from("profiles")
        .select("id, role, salon_id, full_name, salons(name, city)")
        .eq("id", user.id)
        .maybeSingle();

      if (!p) { router.replace("/login"); return; }

      const salon = p.salons as unknown as { name: string; city: string | null } | null;
      setProfile({
        id: p.id,
        salon_name: salon?.name ?? (p.role === "platform_admin" ? "All salons" : "Your Salon"),
        city: salon?.city ?? "",
        plan_tier: "free",
      });

      if (!p.salon_id) { setLoading(false); return; }
      setSalonId(p.salon_id);

      const [salonStats, { data: recentRows }] = await Promise.all([
        getSalonStats(supabase, p.salon_id),
        supabase
          .from("visits")
          .select("id, created_at, ended_at, chosen_style, analysis, customers(name)")
          .eq("salon_id", p.salon_id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      setStats(salonStats);
      setRecent(
        (recentRows ?? []).map((v) => {
          const cust = v.customers as unknown as { name: string | null } | null;
          const analysis = v.analysis as { bestMatch?: string } | null;
          return {
            id: v.id,
            customer_name: cust?.name ?? "Walk-in",
            created_at: v.created_at,
            ended_at: v.ended_at,
            style: v.chosen_style ?? analysis?.bestMatch ?? null,
          };
        })
      );
      setLoading(false);
      void loadQueue();
    })();
  }, [router, setProfile, skipAuth, loadQueue]);

  const salonName = profile?.salon_name ?? "Salon";
  const activeCount = queue.length;

  // 4 stat cards — the NOIR dashboard grid, mapped onto live salon stats.
  const statCards = [
    {
      label: "Completed customers",
      value: stats.completed,
      note: stats.today > 0 ? `+${stats.today} today` : "None today yet",
      col: "#F2EFE9", live: false, small: false,
    },
    {
      label: "In session",
      value: stats.inSession,
      note: stats.inSession > 0 ? "Active now" : "Nobody in the chair",
      col: "#BFD2C7", live: stats.inSession > 0, small: false,
    },
    {
      label: "Average rating",
      value: stats.averageRating ?? "—",
      note: stats.ratingCount > 0 ? `Based on ${stats.ratingCount} reviews` : "No reviews yet",
      col: "#C7BDAE", live: false, small: false,
    },
    {
      label: "Top style",
      value: stats.topStyle ?? "None yet",
      note: stats.topStyle ? "Most chosen" : "—",
      col: "#A9A2B8", live: false, small: true,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "#F2EFE9" }}>
      <div style={{ paddingBottom: 118 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>

          {/* Header */}
          <div style={{ padding: "60px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
            <div>
              <div style={micro}>{getGreeting()}</div>
              <div style={{ marginTop: 9, fontSize: 24, fontWeight: 600, letterSpacing: "-.01em", color: "#BFD2C7" }}>{salonName}</div>
            </div>
            <button type="button" className="tap" onClick={() => router.push("/profile")} aria-label="Profile"
              style={{ width: 44, height: 44, flex: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(143,167,154,.1)", border: "1px solid rgba(143,167,154,.32)" }}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={ACC} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6.5" r="2.6" /><circle cx="6" cy="17.5" r="2.6" /><path d="M8.3 8.2 19 19" /><path d="M8.3 15.8 19 5" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div style={{ padding: "22px 20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Hero — Total clients */}
            <div style={{ borderRadius: 20, padding: "20px 18px", background: "linear-gradient(160deg, rgba(143,167,154,.09), rgba(23,22,20,.72))", border: "1px solid rgba(143,167,154,.2)" }}>
              <div style={micro}>Total clients</div>
              <div style={{ marginTop: 10, fontSize: 40, fontWeight: 700, letterSpacing: "-.02em", color: "#BFD2C7" }}>
                {loading ? "—" : stats.totalCustomers}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: MUTE }}>{stats.totalCustomers > 0 ? "On your books" : "No clients yet"}</div>
            </div>

            {/* 2×2 grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {statCards.map((c) => (
                <div key={c.label} style={{ borderRadius: 20, padding: "18px 16px", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ ...micro, letterSpacing: ".18em" }}>{c.label}</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.live ? ACC : "transparent", boxShadow: c.live ? `0 0 10px ${ACC}` : "none" }} />
                  </div>
                  <div style={{ marginTop: 10, fontWeight: 700, letterSpacing: "-.02em", color: c.col, fontSize: c.small ? 21 : 34, lineHeight: 1.1 }}>
                    {loading ? "—" : c.value}
                  </div>
                  <div style={{ marginTop: 7, fontSize: 11, color: MUTE }}>{c.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* In progress */}
          <div style={{ padding: "26px 20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>In progress</div>
              <div style={{ padding: "4px 9px", borderRadius: 7, background: "rgba(143,167,154,.14)", border: "1px solid rgba(143,167,154,.34)", fontSize: 10, fontWeight: 600, color: "#BFD2C7" }}>
                {activeCount} active
              </div>
            </div>

            {activeCount === 0 ? (
              <div style={{ borderRadius: 18, padding: "22px 16px", textAlign: "center", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: MUTE }}>No one in progress</div>
                <div style={{ marginTop: 4, fontSize: 11, color: FAINT }}>Tap New Scan below to start a customer</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {queue.map((q) => (
                  <div key={q.id} style={{ borderRadius: 18, padding: "16px 16px 15px", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{q.customerName}</div>
                      <div style={{ padding: "3px 8px", borderRadius: 7, fontSize: 10, fontWeight: 600, background: "rgba(143,167,154,.16)", color: "#BFD2C7" }}>
                        {STATUS_LABEL[q.status] ?? q.status}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: MUTE }}>
                      {q.chosen_style ?? "no style yet"}{q.barberName ? ` · ${q.barberName}` : ""} · {elapsed(q.created_at)}
                    </div>
                    <div style={{ marginTop: 13, display: "flex", gap: 9 }}>
                      <button type="button" className="tap" onClick={() => router.push(`/scan?resume=${q.id}`)}
                        style={{ flex: 1, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(242,239,233,.04)", border: "1px solid rgba(242,239,233,.12)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: MUTE }}>
                        Open
                      </button>
                      <button type="button" className="tap" onClick={() => router.push(`/bill/${q.id}`)}
                        style={{ flex: 1, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(143,167,154,.14)", border: "1px solid rgba(143,167,154,.4)", fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#BFD2C7" }}>
                        Checkout
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent customers — resume an unfinished scan or check one out */}
          <div style={{ padding: "26px 20px 0" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 13 }}>Recent customers</div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ height: 78, borderRadius: 18, background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }} />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div style={{ borderRadius: 18, padding: "22px 16px", textAlign: "center", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: MUTE }}>No customers yet</div>
                <div style={{ marginTop: 4, fontSize: 11, color: FAINT }}>Completed and in-progress scans show up here</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recent.map((r) => {
                  const done = !!r.ended_at;
                  return (
                    <div key={r.id} style={{ borderRadius: 18, padding: "16px 16px 15px", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{r.customer_name}</div>
                        <div style={{ padding: "3px 8px", borderRadius: 7, fontSize: 10, fontWeight: 600, background: done ? "rgba(242,239,233,.08)" : "rgba(143,167,154,.16)", color: done ? MUTE : "#BFD2C7" }}>
                          {done ? "Completed" : "In session"}
                        </div>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: MUTE }}>
                        {r.style ?? "no style yet"} · {new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ marginTop: 13, display: "flex", gap: 9 }}>
                        <button type="button" className="tap" onClick={() => router.push(`/scan?resume=${r.id}`)}
                          style={{ flex: 1, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(242,239,233,.04)", border: "1px solid rgba(242,239,233,.12)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: MUTE }}>
                          Continue
                        </button>
                        <button type="button" className="tap" onClick={() => router.push(`/bill/${r.id}`)}
                          style={{ flex: 1, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(143,167,154,.14)", border: "1px solid rgba(143,167,154,.4)", fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#BFD2C7" }}>
                          Done
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
