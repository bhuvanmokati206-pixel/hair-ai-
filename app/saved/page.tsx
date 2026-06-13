"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Session = {
  id: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  analysis_json: {
    hairLength?: string;
    hairColor?: string;
    faceShape?: string;
    bestMatch?: string;
    stylingTips?: string;
  } | null;
};

export default function SavedPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase
        .from("customer_sessions")
        .select("*")
        .eq("salon_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setSessions(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-5">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Saved</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Customer history</p>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-4xl mb-3">🔖</p>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No sessions yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Completed scans will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  className="card w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                    style={{ background: "var(--accent-light)", color: "var(--accent-dark)" }}>
                    {s.customer_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{s.customer_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {s.analysis_json?.bestMatch ?? "Analysis saved"} · {formatDate(s.created_at)}
                    </p>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded === s.id ? 90 : 0 }}
                    style={{ color: "var(--text-muted)", fontSize: 18, flexShrink: 0 }}
                  >›</motion.span>
                </button>

                <AnimatePresence>
                  {expanded === s.id && s.analysis_json && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="card mx-1 mt-1 p-4 flex flex-col gap-3">
                        {s.customer_phone && (
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>📞 {s.customer_phone}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ["Hair length", s.analysis_json.hairLength],
                            ["Hair color", s.analysis_json.hairColor],
                            ["Face shape", s.analysis_json.faceShape],
                            ["Best match", s.analysis_json.bestMatch],
                          ].map(([label, val]) => val && (
                            <div key={label} className="rounded-xl p-3" style={{ background: "var(--bg-subtle)" }}>
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
                              <p className="text-sm font-semibold mt-0.5 capitalize" style={{ color: "var(--text-primary)" }}>{val}</p>
                            </div>
                          ))}
                        </div>
                        {s.analysis_json.stylingTips && (
                          <div className="rounded-xl p-3" style={{ background: "var(--accent-light)", border: "1px solid var(--accent)" }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent-dark)" }}>💡 Styling tip</p>
                            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.analysis_json.stylingTips}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
