"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import BarberManager from "@/components/BarberManager";

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
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      {/* Centered identity header */}
      <div className="px-5 pt-14 pb-6 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black mb-3"
          style={{ background: "linear-gradient(135deg, rgba(143,167,154,0.2), rgba(169,162,184,0.15))", border: "2px solid var(--border-accent)", color: "var(--accent)" }}>
          {(salon?.name || "S")[0].toUpperCase()}
        </div>
        <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{salon?.name ?? "Your Salon"}</h1>
        <div className="flex items-center gap-2 mt-1">
          {salon?.code && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>{salon.code}</span>
          )}
          {salon?.status && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(143,167,154,0.12)", color: "var(--accent)" }}>{salon.status}</span>
          )}
        </div>
      </div>

      {!salon ? (
        <div className="px-5">
          <div className="card p-5 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            This account isn&apos;t linked to a salon. {loginEmail && `Signed in as ${loginEmail}.`}
          </div>
          <div className="mt-4"><LogoutButton /></div>
          <BottomNav />
        </div>
      ) : (
        <>
          {/* Editable details */}
          <div className="px-5 mb-4">
            <p className="section-label mb-2">Salon details</p>
            <div className="card p-5 flex flex-col gap-4">
              <Field label="Salon name" value={salon.name} onChange={(v) => set("name", v)} placeholder="e.g. Fish Net Salon" />
              <Field label="Phone number" value={salon.phone ?? ""} onChange={(v) => set("phone", v)} type="tel" placeholder="+91 98765 43210" />
              <Field label="Contact email" value={salon.email ?? ""} onChange={(v) => set("email", v)} type="email" placeholder="salon@example.com" />
              <Field label="Address" value={salon.address_line1 ?? ""} onChange={(v) => set("address_line1", v)} placeholder="Shop / building, street" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" value={salon.city ?? ""} onChange={(v) => set("city", v)} placeholder="Bengaluru" />
                <Field label="Pincode" value={salon.pincode ?? ""} onChange={(v) => set("pincode", v)} type="tel" placeholder="560001" />
              </div>

              {error && <p className="text-[11px] rounded-lg px-3 py-2" style={{ background: "rgba(224,106,92,0.08)", color: "var(--danger)" }}>{error}</p>}

              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
              </button>
            </div>
            <p className="text-[10px] mt-1.5 px-1" style={{ color: "var(--text-muted)" }}>
              Login email ({loginEmail}) is changed separately for security.
            </p>
          </div>

          {/* Barbers */}
          <div className="px-5 mb-4">
            <BarberManager />
          </div>

          {/* Navigation */}
          <div className="px-5 mb-4">
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {[
                { icon: "📅", label: "Appointments", value: "Bookings and schedule", route: "/profile/appointments" },
                { icon: "📊", label: "Analytics", value: "Revenue, clients & Excel export", route: "/analytics" },
                { icon: "💬", label: "WhatsApp messages", value: "Review & rebook outbox", route: "/messages" },
              ].map((row) => (
                <button key={row.label} onClick={() => router.push(row.route)}
                  className="w-full flex items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform">
                  <span className="text-xl w-8">{row.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{row.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{row.value}</p>
                  </div>
                  <span style={{ color: "var(--text-muted)" }}>›</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <div className="px-5">
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
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
