"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import BottomNav from "@/components/BottomNav";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, setProfile } = useStore();
  const [salonName, setSalonName] = useState(profile?.salon_name ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") { setEmail("demo@salon.com"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setEmail(user.email ?? "");
      if (!profile) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) { setProfile(data); setSalonName(data.salon_name); setCity(data.city ?? ""); }
      }
    })();
  }, [router, profile, setProfile]);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ salon_name: salonName, city }).eq("id", user.id);
      setProfile({ ...(profile!), salon_name: salonName, city });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.replace("/login");
  };

  const TIER_LABEL: Record<string, string> = {
    free: "Free plan",
    pro: "Pro plan",
    unlimited: "Unlimited",
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-5">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Profile</h1>
      </div>

      {/* Avatar */}
      <div className="px-5 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold"
          style={{ background: "var(--accent-light)", color: "var(--accent-dark)" }}>
          {(salonName || "S")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{salonName || "Your Salon"}</p>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "var(--accent-light)", color: "var(--accent-dark)" }}>
            {TIER_LABEL[profile?.plan_tier ?? "free"]}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <div className="px-5 mb-6">
        <div className="card p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Salon name
            </label>
            <input type="text" value={salonName} onChange={(e) => setSalonName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              City
            </label>
            <input type="text" placeholder="e.g. Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input type="email" value={email} disabled style={{ opacity: 0.6 }} />
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Info rows */}
      <div className="px-5 mb-6">
        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {[
            { icon: "📦", label: "Subscription plan", value: TIER_LABEL[profile?.plan_tier ?? "free"] },
            { icon: "🔒", label: "Data & privacy", value: "Your data is encrypted" },
            { icon: "💬", label: "Support", value: "support@hairai.in" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 p-4">
              <span className="text-xl w-8">{row.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{row.label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-5">
        <button onClick={handleLogout} className="btn-ghost" style={{ color: "var(--danger)", borderColor: "#F5C6C6" }}>
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
