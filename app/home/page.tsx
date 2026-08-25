"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
// Cookie-based client. The old singleton in @/lib/supabase keeps its session in
// localStorage, which the login page no longer writes to — getUser() there
// returns null and bounces a signed-in user back to /login.
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import TrendingStrip from "@/components/TrendingStrip";
import StatCounter from "@/components/StatCounter";
import InProgressStrip from "@/components/InProgressStrip";
import BeforeAfterGallery from "@/components/BeforeAfterGallery";
import { getSalonStats, EMPTY_STATS, type SalonStats } from "@/lib/salonStats";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type Session = {
  id: string;
  customer_name: string;
  created_at: string;
  analysis_json: { bestMatch?: string; hairColor?: string } | null;
};

// ── Quick action button data ──────────────────────────────────────
const ACTIONS = [
  {
    label: "Upload",
    tip: "Add from gallery",
    route: "/scan",
    color: "#8FA79A",
    bg: "rgba(143,167,154,0.1)",
    border: "rgba(143,167,154,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15V19C21 20.105 20.105 21 19 21H5C3.895 21 3 20.105 3 19V15"
          stroke="#8FA79A" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M17 8L12 3L7 8" stroke="#8FA79A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 3V15" stroke="#8FA79A" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Analysis",
    tip: "Scan & match AI",
    route: "/scan",
    color: "#A9A2B8",
    bg: "rgba(169,162,184,0.1)",
    border: "rgba(169,162,184,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="#A9A2B8" strokeWidth="1.8"/>
        <path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
          stroke="#A9A2B8" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Hair Test",
    tip: "Health & remedies",
    route: "/hair-health",
    color: "#4FD69C",
    bg: "rgba(79,214,156,0.1)",
    border: "rgba(79,214,156,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 3H15" stroke="#4FD69C" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 3L6 8C6 8 3 9.5 3 13C3 17.418 7.029 21 12 21C16.971 21 21 17.418 21 13C21 9.5 18 8 18 8L16 3"
          stroke="#4FD69C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 14C9.5 15.5 10.5 16.5 12 16.5C13.5 16.5 14.5 15.5 15 14"
          stroke="#4FD69C" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Customise",
    tip: "Try new styles",
    route: "/customize",
    color: "#C9A15C",
    bg: "rgba(201,161,92,0.1)",
    border: "rgba(201,161,92,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="6" r="2.5" stroke="#C9A15C" strokeWidth="1.8"/>
        <circle cx="6" cy="18" r="2.5" stroke="#C9A15C" strokeWidth="1.8"/>
        <path d="M8.5 7.5L18.5 17.5M8.5 16.5L12 13M15 10L18.5 6.5" stroke="#C9A15C" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
] as const;

// ── QuickActions component ────────────────────────────────────────
function QuickActions({ router }: { router: AppRouterInstance }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.13 }}
      className="px-5 mb-6"
    >
      {/* Outer frame */}
      <div
        className="rounded-2xl px-4 py-3 flex justify-start items-center gap-4"
        style={{
          background: "rgba(143,167,154,0.04)",
          border: "1.5px solid rgba(143,167,154,0.14)",
          boxShadow: "inset 0 1px 0 rgba(143,167,154,0.06)",
        }}
      >
        {ACTIONS.map((action, i) => (
          <div key={action.label} className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => router.push(action.route)}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="relative flex items-center justify-center active:scale-90 transition-transform overflow-hidden"
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: hoveredIdx === i ? action.bg : "rgba(255,255,255,0.04)",
                border: `1px solid ${hoveredIdx === i ? action.border : "rgba(255,255,255,0.08)"}`,
                transition: "background 0.18s, border-color 0.18s",
                boxShadow: hoveredIdx === i ? `0 0 12px ${action.bg}` : "none",
              }}
            >
              <AnimatePresence mode="wait">
                {hoveredIdx !== i ? (
                  <motion.div
                    key="icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.12 }}
                  >
                    {action.icon}
                  </motion.div>
                ) : (
                  <motion.span
                    key="tip"
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.75 }}
                    transition={{ duration: 0.12 }}
                    className="text-[8px] font-black text-center leading-tight px-1"
                    style={{ color: action.color }}
                  >
                    {action.tip}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            {/* Label below button */}
            <span
              className="text-[9px] font-semibold tracking-wide"
              style={{ color: hoveredIdx === i ? action.color : "var(--text-muted)" }}
            >
              {action.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { profile, setProfile } = useStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SalonStats>(EMPTY_STATS);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  // Re-pull the counters after a checkout, so "in session" drops and "completed"
  // climbs without a full page reload.
  const refreshStats = useCallback(async () => {
    if (!salonId) return;
    setStats(await getSalonStats(createClient(), salonId));
  }, [salonId]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      if (skipAuth) {
        setProfile({ id: "demo", salon_name: "Demo Salon", city: "", plan_tier: "free" });
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // The salon name lives on `salons`, reached through the user's profile.
      // profiles holds role + salon_id, not the salon's own details.
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

      // Platform admins are not scoped to a salon, so per-salon counts do not
      // apply to them — /admin shows the cross-salon view instead.
      if (!p.salon_id) { setLoading(false); return; }
      setSalonId(p.salon_id);

      // Visits, not customer_sessions — that table never existed in this schema.
      const [{ data: recent }, salonStats] = await Promise.all([
        supabase
          .from("visits")
          .select("id, created_at, analysis, chosen_style, customers(name)")
          .eq("salon_id", p.salon_id)
          .order("created_at", { ascending: false })
          .limit(5),
        getSalonStats(supabase, p.salon_id),
      ]);

      setSessions(
        (recent ?? []).map((v) => {
          const cust = v.customers as unknown as { name: string | null } | null;
          return {
            id: v.id,
            customer_name: cust?.name ?? "Walk-in",
            created_at: v.created_at,
            analysis_json: v.analysis,
          };
        }) as Session[]
      );
      setStats(salonStats);
      setLoading(false);
    })();
  }, [router, setProfile]);

  const salonName = profile?.salon_name ?? "Salon";

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
                {getGreeting()}
              </p>
              <h1 className="text-2xl font-black mt-0.5 gradient-text-animated">{salonName}</h1>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "rgba(143,167,154,0.08)", border: "1px solid rgba(143,167,154,0.15)" }}>
              ✂️
            </div>
          </div>
        </motion.div>
      </div>

      {/* Counters — derived live from `visits`, so they move the moment a scan
          is saved rather than tracking a stored running total. */}
      <div className="px-5 mb-4">
        {/* Total clients on the books — the salon's headline number, so it gets
            a full-width card above the 2×2 grid. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-3"
        >
          <StatCounter
            label="Total clients"
            value={stats.totalCustomers}
            sub={stats.totalCustomers > 0 ? "On your books" : "No clients yet"}
            accent="#8FA79A"
            loading={loading}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCounter
            label="Completed customers"
            value={stats.completed}
            sub={stats.today > 0 ? `+${stats.today} today` : "None today yet"}
            accent="#8FA79A"
            loading={loading}
          />
          <StatCounter
            label="In session"
            value={stats.inSession}
            sub={stats.inSession > 0 ? "Active now" : "Nobody in the chair"}
            accent="#4FD69C"
            live={stats.inSession > 0}
            loading={loading}
          />
          <StatCounter
            label="Average rating"
            value={stats.averageRating ?? "—"}
            sub={stats.ratingCount > 0 ? `Based on ${stats.ratingCount} reviews` : "No reviews yet"}
            accent="#C9A15C"
            loading={loading}
          />
          <StatCounter
            label="Top style"
            value={stats.topStyle ?? "None yet"}
            sub={stats.topStyle ? "Most chosen" : undefined}
            accent="#A9A2B8"
            loading={loading}
          />
        </motion.div>
      </div>

      {/* Park-and-resume queue. Hidden when empty. */}
      <InProgressStrip onChange={refreshStats} />

      {/* Quick actions row */}
      <QuickActions router={router} />

      {/* Quick scan CTA */}
      <div className="px-5 mb-6">
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18 }}
          onClick={() => router.push("/scan")}
          className="w-full p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(143,167,154,0.12) 0%, rgba(169,162,184,0.08) 100%)",
            border: "1px solid rgba(143,167,154,0.2)",
            boxShadow: "0 0 24px rgba(143,167,154,0.08)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(to right, transparent 0%, rgba(143,167,154,0.03) 50%, transparent 100%)",
          }} />
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #8FA79A, #6E8778)", boxShadow: "0 0 14px rgba(143,167,154,0.4)" }}>
            <span className="text-xl">📷</span>
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>New customer scan</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>4-angle AI analysis · 60 seconds</p>
          </div>
          <span className="text-xl" style={{ color: "var(--accent)" }}>›</span>
        </motion.button>
      </div>

      {/* Trending */}
      <div className="mb-6">
        <div className="px-5 mb-3 flex items-center justify-between">
          <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>🔥 Trending today</h2>
          <span className="badge-blue">Live</span>
        </div>
        <div className="px-5">
          <TrendingStrip />
        </div>
      </div>

      {/* Recent customers */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Recent customers</h2>
          <p className="section-label">Today</p>
        </div>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-3xl mb-2">👤</p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No scans yet today</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Tap "New customer scan" to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                onClick={() => router.push("/saved")}
                className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:opacity-75"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: "rgba(143,167,154,0.1)", border: "1px solid rgba(143,167,154,0.2)", color: "var(--accent)" }}>
                  {s.customer_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{s.customer_name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {s.analysis_json?.bestMatch ?? "Analysis complete"} · {new Date(s.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: 18 }}>›</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Before & after — real customer transformations with their reviews */}
      <BeforeAfterGallery salonId={salonId} />

      <BottomNav />
    </div>
  );
}
