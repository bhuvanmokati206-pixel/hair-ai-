"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import BarberManager from "@/components/BarberManager";

// ── NOIR palette (from the imported design) ──────────────────────
const INK = "#F2EFE9";
const MUTE = "#948D82";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: "#7C766C",
};
const CARD: React.CSSProperties = { borderRadius: 20, background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" };

type Salon = {
  id: string; code: string | null; name: string;
  phone: string | null; email: string | null;
  address_line1: string | null; address_line2: string | null;
  city: string | null; state: string | null; pincode: string | null;
  status: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setLoginEmail(user.email ?? "");

      // Role decides whether the Analytics shortcut is shown (admins only).
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setRole(prof?.role ?? null);

      const salonRes = await fetch("/api/salon");
      const salonBody = await salonRes.json();
      if (salonRes.ok) setSalon(salonBody.salon);
      setLoading(false);
    })();
  }, [router]);

  const set = <K extends keyof Salon>(k: K, v: Salon[K]) => setSalon((s) => (s ? { ...s, [k]: v } : s));

  const handleSave = async () => {
    if (!salon) return;
    if (!salon.name.trim()) { setError("Salon name can't be empty."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/salon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: salon.name, phone: salon.phone, email: salon.email,
          address_line1: salon.address_line1, address_line2: salon.address_line2,
          city: salon.city, state: salon.state, pincode: salon.pincode,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      setSalon(body.salon);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="spinner-lg" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: INK, paddingBottom: 118 }}>
      {/* Centered identity header */}
      <div style={{ padding: "60px 24px 22px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 34, fontWeight: 300, marginBottom: 14,
          background: "linear-gradient(160deg, rgba(143,167,154,.18), rgba(23,22,20,.72))",
          border: "1px solid rgba(143,167,154,.32)", color: "#BFD2C7" }}>
          {(salon?.name || "S")[0].toUpperCase()}
        </div>
        <div style={{ ...MICRO }}>Salon profile</div>
        <h1 style={{ marginTop: 8, fontSize: 24, fontWeight: 300, letterSpacing: ".01em", color: "#BFD2C7" }}>{salon?.name ?? "Your Salon"}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          {salon?.code && (
            <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", padding: "3px 9px", borderRadius: 999, background: "rgba(242,239,233,.05)", color: MUTE, border: "1px solid rgba(242,239,233,.1)" }}>{salon.code}</span>
          )}
          {salon?.status && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "rgba(143,167,154,.14)", color: "#BFD2C7", border: "1px solid rgba(143,167,154,.34)", textTransform: "uppercase", letterSpacing: ".08em" }}>{salon.status}</span>
          )}
        </div>
      </div>

      {!salon ? (
        <div style={{ padding: "0 20px" }}>
          <div style={{ ...CARD, padding: 20, textAlign: "center", fontSize: 12, color: MUTE }}>
            This account isn&apos;t linked to a salon. {loginEmail && `Signed in as ${loginEmail}.`}
          </div>
          <div className="mt-4"><LogoutButton /></div>
          <BottomNav />
        </div>
      ) : (
        <>
          {/* Editable details */}
          <div style={{ padding: "0 20px", marginBottom: 18 }}>
            <div style={{ ...MICRO, marginBottom: 12, paddingLeft: 2 }}>Salon details</div>
            <div style={{ ...CARD, padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
              <Field label="Salon name" value={salon.name} onChange={(v) => set("name", v)} placeholder="e.g. Fish Net Salon" />
              <Field label="Phone number" value={salon.phone ?? ""} onChange={(v) => set("phone", v)} type="tel" placeholder="+91 98765 43210" />
              <Field label="Contact email" value={salon.email ?? ""} onChange={(v) => set("email", v)} type="email" placeholder="salon@example.com" />
              <Field label="Address" value={salon.address_line1 ?? ""} onChange={(v) => set("address_line1", v)} placeholder="Shop / building, street" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="City" value={salon.city ?? ""} onChange={(v) => set("city", v)} placeholder="Bengaluru" />
                <Field label="Pincode" value={salon.pincode ?? ""} onChange={(v) => set("pincode", v)} type="tel" placeholder="560001" />
              </div>

              {error && <p style={{ fontSize: 11, borderRadius: 10, padding: "8px 12px", background: "rgba(224,106,92,0.1)", border: "1px solid rgba(224,106,92,.28)", color: "#E06A5C" }}>{error}</p>}

              <button type="button" className="tap" onClick={() => { if (!saving) handleSave(); }} disabled={saving}
                style={{ width: "100%", height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase",
                  background: "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)", color: "#14130F", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
              </button>
            </div>
            <p style={{ fontSize: 10, marginTop: 8, paddingLeft: 4, color: MUTE }}>
              Login email ({loginEmail}) is changed separately for security.
            </p>
          </div>

          {/* Barbers */}
          <div style={{ padding: "0 20px", marginBottom: 18 }}>
            <BarberManager />
          </div>

          {/* Navigation */}
          <div style={{ padding: "0 20px", marginBottom: 18 }}>
            <div style={{ ...CARD, overflow: "hidden" }}>
              {[
                { icon: "📅", label: "Appointments", value: "Bookings and schedule", route: "/profile/appointments" },
                { icon: "📊", label: "Analytics", value: "Revenue, clients & Excel export", route: "/analytics", adminOnly: true },
                { icon: "💬", label: "WhatsApp messages", value: "Review & rebook outbox", route: "/messages" },
              ].filter((row) => !row.adminOnly || role === "salon_owner" || role === "platform_admin").map((row, i) => (
                <button key={row.label} onClick={() => router.push(row.route)}
                  className="w-full flex items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform"
                  style={{ borderTop: i === 0 ? "0" : "1px solid rgba(242,239,233,.07)" }}>
                  <span className="text-xl w-8">{row.icon}</span>
                  <div className="flex-1">
                    <p style={{ fontSize: 14, fontWeight: 500, color: INK }}>{row.label}</p>
                    <p style={{ fontSize: 12, color: MUTE }}>{row.value}</p>
                  </div>
                  <span style={{ color: MUTE }}>›</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <div style={{ padding: "0 20px" }}>
            <LogoutButton />
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={MICRO}>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        style={{ background: "transparent", border: 0, borderBottom: "1px solid rgba(242,239,233,.18)", color: INK, fontSize: 16, padding: "5px 0 10px", outline: "none", fontFamily: "inherit", width: "100%" }} />
    </label>
  );
}
