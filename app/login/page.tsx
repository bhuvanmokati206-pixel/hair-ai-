"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [salonName, setSalonName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.replace("/home");
  };

  const handleSignup = async () => {
    if (!salonName || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { salon_name: salonName } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    router.replace("/home");
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-10" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="mb-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5"
          style={{ background: "var(--accent-light)" }}>✂️</div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {tab === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {tab === "login" ? "Sign in to your salon account" : "Set up your salon in 30 seconds"}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl p-1 mb-6" style={{ background: "var(--bg-subtle)" }}>
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === t ? "var(--bg-card)" : "transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.08)" : "none",
            }}
          >
            {t === "login" ? "Log In" : "Sign Up"}
          </button>
        ))}
      </div>

      {/* Form */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
        >
          {tab === "signup" && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Salon name</label>
              <input type="text" placeholder="e.g. Raj's Unisex Salon" value={salonName} onChange={(e) => setSalonName(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input type="email" placeholder="you@salon.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Password</label>
            <input type="password" placeholder={tab === "signup" ? "At least 6 characters" : "••••••••"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </motion.div>
      </AnimatePresence>

      {error && (
        <p className="mt-3 text-sm rounded-xl p-3" style={{ background: "#FEE", color: "var(--danger)" }}>{error}</p>
      )}

      <button
        className="btn-primary mt-6"
        onClick={tab === "login" ? handleLogin : handleSignup}
        disabled={loading}
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? "Please wait…" : tab === "login" ? "Log In" : "Create Account"}
      </button>

      <p className="text-center mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
        {tab === "login" ? "No account? " : "Already have an account? "}
        <button className="font-semibold" style={{ color: "var(--accent-dark)" }}
          onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); }}>
          {tab === "login" ? "Sign up free" : "Log in"}
        </button>
      </p>
    </div>
  );
}
