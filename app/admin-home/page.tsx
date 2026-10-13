"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import AdminNav from "@/components/AdminNav";

// ── NOIR palette ─────────────────────────────────────────────────
const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const FAINT = "#7C766C";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", color: FAINT,
};

// Representative content — matches the reference design. Wired to live data at
// the routing step (needs chair / appointment / arrival schema).
type Stage = "in_session" | "waiting" | "completed";
const NOW: { name: string; service: string; stylist: string; meta: string; stage: Stage }[] = [
  { name: "Rohan Iyer", service: "Textured crop + beard", stylist: "Rahul V.", meta: "Chair 2 · Started 10:15 · 20 min in", stage: "in_session" },
  { name: "Aditi Rao", service: "Caramel balayage", stylist: "Ananya K.", meta: "Chair 4 · Started 09:50 · 45 min in", stage: "in_session" },
  { name: "Vikram Shetty", service: "Modern fade", stylist: "Imran S.", meta: "Next up · Walk-in · waiting 8 min", stage: "waiting" },
  { name: "Sneha Pillai", service: "Hair spa + wash", stylist: "Unassigned", meta: "Lounge · Booked 11:00 · arrived", stage: "waiting" },
  { name: "Karthik Reddy", service: "Haircut + massage", stylist: "Rahul V.", meta: "Checked out · Paid ₹350 · 09:40", stage: "completed" },
];

const APPTS: { time: string; name: string; service: string; stylist: string }[] = [
  { time: "11:30", name: "Meera Joshi", service: "Beard shape + wash", stylist: "Rahul V." },
  { time: "12:15", name: "Dev Anand", service: "Skin fade", stylist: "Imran S." },
  { time: "14:00", name: "Priya Nair", service: "Root touch-up", stylist: "Ananya K." },
  { time: "16:30", name: "Sam Kurien", service: "Classic cut", stylist: "Rahul V." },
];

const STAGE_CHIP: Record<Stage, { label: string; bg: string; border: string; color: string; dot: string }> = {
  in_session: { label: "In session", bg: "rgba(143,167,154,.18)", border: "rgba(143,167,154,.42)", color: "#BFD2C7", dot: "#4FD69C" },
  waiting:    { label: "Waiting", bg: "transparent", border: "rgba(242,239,233,.2)", color: "#948D82", dot: "#C9A15C" },
  completed:  { label: "Completed", bg: "transparent", border: "rgba(242,239,233,.12)", color: "#7C766C", dot: "#635E56" },
};

const CARD: React.CSSProperties = { borderRadius: 20, background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" };

export default function AdminHomePage() {
  const router = useRouter();
  const { profile, setProfile } = useStore();
  const [ready, setReady] = useState(false);
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  useEffect(() => {
    (async () => {
      if (skipAuth) { setProfile({ id: "demo", salon_name: "Fish Net Salon", city: "Bengaluru", plan_tier: "free" }); setReady(true); return; }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: p } = await supabase
        .from("profiles").select("id, role, salon_id, full_name, salons(name, city)").eq("id", user.id).maybeSingle();
      if (!p) { router.replace("/login"); return; }
      const salon = p.salons as unknown as { name: string; city: string | null } | null;
      setProfile({ id: p.id, salon_name: salon?.name ?? "Your Salon", city: salon?.city ?? "", plan_tier: "free" });
      setReady(true);
    })();
  }, [router, setProfile, skipAuth]);

  const salonName = profile?.salon_name ?? "Your Salon";
  const city = profile?.city || "Bengaluru";

  const waiting = NOW.filter((n) => n.stage === "waiting").length;
  const inSession = NOW.filter((n) => n.stage === "in_session").length;
  const completed = 7; // representative

  const stats = [
    { label: "Waiting", value: waiting },
    { label: "In session", value: inSession },
    { label: "Completed", value: completed },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: INK, paddingBottom: 104 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>

        {/* Header */}
        <div style={{ padding: "58px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em", color: "#BFD2C7" }}>{salonName}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: MUTE }}>{city} · Indiranagar · Open till 9:00</div>
          </div>
          <button type="button" className="tap" onClick={() => router.push("/profile")} aria-label="Profile"
            style={{ width: 44, height: 44, flex: "none", borderRadius: 14, overflow: "hidden", position: "relative", cursor: "pointer", border: "1px solid rgba(143,167,154,.32)" }}>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(118deg, #1B1A17 0 6px, #131210 6px 12px)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(242,239,233,.7)" }}>
              {salonName[0]?.toUpperCase() ?? "S"}
            </div>
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ padding: "20px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ ...CARD, padding: "16px 14px" }}>
              <div style={{ ...MICRO, fontSize: 8.5 }}>{s.label}</div>
              <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", color: "#C7BDAE" }}>{ready ? s.value : "—"}</div>
            </div>
          ))}
        </div>

        {/* In the salon now */}
        <div style={{ padding: "26px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>In the salon now</div>
            <div style={{ ...MICRO, color: ACC, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4FD69C", boxShadow: "0 0 8px #4FD69C" }} /> Live
            </div>
          </div>

          <div style={{ ...CARD, overflow: "hidden" }}>
            {NOW.map((n, i) => {
              const chip = STAGE_CHIP[n.stage];
              return (
                <div key={n.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px", borderTop: i === 0 ? "0" : "1px solid rgba(242,239,233,.07)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "none", background: chip.dot, boxShadow: n.stage === "in_session" ? `0 0 8px ${chip.dot}` : "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{n.name}</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: MUTE }}>{n.service} · {n.stylist}</div>
                    <div style={{ marginTop: 3, ...MICRO, fontSize: 8.5, letterSpacing: ".08em", textTransform: "none" as const, color: FAINT }}>{n.meta}</div>
                  </div>
                  <span style={{ flex: "none", padding: "5px 11px", borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
                    background: chip.bg, border: `1px solid ${chip.border}`, color: chip.color }}>{chip.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's appointments */}
        <div style={{ padding: "26px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Today&apos;s appointments</div>
            <div style={MICRO}>{APPTS.length} booked</div>
          </div>

          <div style={{ ...CARD, overflow: "hidden" }}>
            {APPTS.map((a, i) => (
              <div key={a.time + a.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderTop: i === 0 ? "0" : "1px solid rgba(242,239,233,.07)" }}>
                <div style={{ flex: "none", fontFamily: "ui-monospace, monospace", fontSize: 13, fontWeight: 600, color: "#BFD2C7", width: 44 }}>{a.time}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ marginTop: 3, fontSize: 12, color: MUTE }}>{a.service} · {a.stylist}</div>
                </div>
                <span style={{ flex: "none", padding: "5px 11px", borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: ".04em",
                  background: "rgba(143,167,154,.12)", border: "1px solid rgba(143,167,154,.3)", color: "#BFD2C7" }}>Confirmed</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AdminNav />
    </div>
  );
}
