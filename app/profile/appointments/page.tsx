"use client";

// Appointments. Intentionally empty for now — the `bookings` table exists in
// schema-v2.sql but nothing writes to it until the WhatsApp booking flow lands,
// so this renders the real (empty) state rather than placeholder rows.

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

const FILTERS = ["Upcoming", "Today", "Past"] as const;

export default function AppointmentsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="btn-icon">←</button>
          <div>
            <p className="section-label">Profile</p>
            <h1 className="text-2xl font-black mt-0.5 gradient-text-animated">Appointments</h1>
          </div>
        </div>
      </div>

      <div className="px-5 mb-5 flex gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            className="px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
            style={
              i === 0
                ? { background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl px-6 py-12 flex flex-col items-center text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(143,167,154,0.08)", border: "1px solid rgba(143,167,154,0.15)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="#8FA79A" strokeWidth="1.8" />
              <path d="M3 10H21M8 3V7M16 3V7" stroke="#8FA79A" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            No appointments yet
          </p>
          <p className="text-xs leading-relaxed max-w-[240px]" style={{ color: "var(--text-secondary)" }}>
            Bookings made through WhatsApp will appear here once the booking flow is live.
          </p>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
