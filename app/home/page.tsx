"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import TrendingStrip from "@/components/TrendingStrip";

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

export default function HomePage() {
  const router = useRouter();
  const { profile, setProfile } = useStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [topStyle, setTopStyle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  useEffect(() => {
    (async () => {
      if (skipAuth) {
        setProfile({ id: "demo", salon_name: "Demo Salon", city: "", plan_tier: "free" });
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // Load or create profile
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) {
        setProfile(p);
      } else {
        const salonName = user.user_metadata?.salon_name ?? "Your Salon";
        await supabase.from("profiles").insert({ id: user.id, salon_name: salonName, city: "", plan_tier: "free" });
        setProfile({ id: user.id, salon_name: salonName, city: "", plan_tier: "free" });
      }

      // Load recent sessions
      const today = new Date().toISOString().split("T")[0];
      const { data: allSessions } = await supabase
        .from("customer_sessions")
        .select("id, customer_name, created_at, analysis_json")
        .eq("salon_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const { count } = await supabase
        .from("customer_sessions")
        .select("*", { count: "exact", head: true })
        .eq("salon_id", user.id)
        .gte("created_at", today);

      setSessions(allSessions ?? []);
      setTodayCount(count ?? 0);

      // Find top style today
      const { data: styles } = await supabase
        .from("style_choices")
        .select("style_name")
        .eq("salon_id", user.id)
        .gte("chosen_at", today);

      if (styles && styles.length > 0) {
        const counts: Record<string, number> = {};
        styles.forEach((s) => { counts[s.style_name] = (counts[s.style_name] ?? 0) + 1; });
        setTopStyle(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
      }

      setLoading(false);
    })();
  }, [router, setProfile]);

  const salonName = profile?.salon_name ?? "Salon";

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{getGreeting()}</p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{salonName} 👋</h1>
        </motion.div>
      </div>

      {/* Stats row */}
      <div className="px-5 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="card p-4">
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Today's scans</p>
            <p className="text-3xl font-bold gradient-text">{loading ? "—" : todayCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Top style today</p>
            <p className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              {loading ? "—" : (topStyle ?? "None yet")}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Quick scan CTA */}
      <div className="px-5 mb-8">
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          onClick={() => router.push("/scan")}
          className="w-full p-5 rounded-2xl flex items-center gap-4"
          style={{ background: "var(--accent)", color: "#fff" }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="text-4xl">📷</span>
          <div className="text-left">
            <p className="font-bold text-lg">New customer scan</p>
            <p className="text-sm opacity-80">4-angle analysis in 60 seconds</p>
          </div>
          <span className="ml-auto text-2xl opacity-70">→</span>
        </motion.button>
      </div>

      {/* Trending */}
      <div className="mb-8">
        <div className="px-5 mb-3 flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>🔥 Trending today</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Updated daily</p>
        </div>
        <div className="px-5">
          <TrendingStrip />
        </div>
      </div>

      {/* Recent customers */}
      <div className="px-5 mb-8">
        <h2 className="font-bold text-base mb-3" style={{ color: "var(--text-primary)" }}>Recent customers</h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-3xl mb-2">👤</p>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No scans yet today</p>
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
                className="card p-4 flex items-center gap-3 active:opacity-75 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: "var(--accent-light)", color: "var(--accent-dark)" }}>
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

      {/* Before & after placeholder */}
      <div className="px-5 mb-8">
        <h2 className="font-bold text-base mb-3" style={{ color: "var(--text-primary)" }}>Before & after</h2>
        <div className="card p-5 text-center">
          <p className="text-3xl mb-2">📸</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Coming soon</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Gallery of your customers' transformations will appear here</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
