"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// MSG91 OTP widget — injected globally after its script loads.
declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success: (d: unknown) => void, failure: (e: unknown) => void) => void;
    verifyOtp?: (otp: string, success: (d: unknown) => void, failure: (e: unknown) => void) => void;
    retryOtp?: (channel: string | null, success: (d: unknown) => void, failure: (e: unknown) => void) => void;
  }
}

function LoginForm() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [salonName, setSalonName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Phone OTP gate for signup (MSG91 widget).
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpToken, setOtpToken] = useState("");   // MSG91 access-token, verified server-side at signup
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const [widgetReady, setWidgetReady] = useState(false);

  const phoneOk = phone.replace(/\D/g, "").length >= 10;

  // OTP master switch. Set NEXT_PUBLIC_OTP_ENABLED=false to skip phone verification.
  const OTP_ON = process.env.NEXT_PUBLIC_OTP_ENABLED !== "false";

  // Load the MSG91 widget script once and initialise it.
  useEffect(() => {
    if (!OTP_ON) return; // OTP disabled → don't load MSG91 (avoids its 3rd-party RSA script)
    const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
    const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;
    if (!widgetId || !tokenAuth) return; // not configured yet

    const init = () => {
      if (typeof window.initSendOTP !== "function") return;
      window.initSendOTP({ widgetId, tokenAuth, exposeMethods: true, success: () => {}, failure: () => {} });
      setWidgetReady(true);
    };

    if (typeof window.initSendOTP === "function") { init(); return; }
    const existing = document.getElementById("msg91-otp");
    if (existing) { existing.addEventListener("load", init); return; }

    const s = document.createElement("script");
    s.id = "msg91-otp";
    s.src = "https://verify.msg91.com/otp-provider.js";
    s.async = true;
    s.onload = init;
    document.body.appendChild(s);
  }, []);

  const handleSendOtp = () => {
    if (!phoneOk) { setOtpMsg("Enter a valid 10-digit mobile number."); return; }
    if (!widgetReady || !window.sendOtp) { setOtpMsg("Verification isn't ready yet — try again in a moment."); return; }
    setOtpBusy(true); setOtpMsg("");
    // MSG91 wants digits with country code, no +.
    const identifier = phone.replace(/\D/g, "").length === 10 ? `91${phone.replace(/\D/g, "")}` : phone.replace(/\D/g, "");
    window.sendOtp(
      identifier,
      () => { setOtpBusy(false); setOtpSent(true); setOtpMsg("Code sent to your phone."); },
      (e) => { setOtpBusy(false); setOtpMsg((e as { message?: string })?.message ?? "Could not send the code."); }
    );
  };

  const handleVerifyOtp = () => {
    if (otpCode.trim().length < 4) { setOtpMsg("Enter the code you received."); return; }
    if (!window.verifyOtp) { setOtpMsg("Verification isn't ready — resend the code."); return; }
    setOtpBusy(true); setOtpMsg("");
    window.verifyOtp(
      otpCode.trim(),
      (d) => {
        setOtpBusy(false);
        // MSG91 returns the access-token in `message`.
        const token = (d as { message?: string })?.message ?? "";
        setOtpToken(token);
        setOtpVerified(true);
        setOtpMsg("");
      },
      (e) => { setOtpBusy(false); setOtpMsg((e as { message?: string })?.message ?? "Incorrect code."); }
    );
  };

  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }

    // Role decides the landing page: the platform admin gets the cross-salon
    // dashboard, salon users get their own salon's home.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      setError("Your account has no profile yet. Contact support.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (!profile.is_active) {
      setError("This account has been deactivated.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const next = params.get("next");
    const fallback = profile.role === "platform_admin" ? "/admin" : "/home";
    // Only allow same-site paths — an attacker-supplied ?next=https://evil.com
    // would otherwise turn this into an open redirect.
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;

    router.replace(dest);
    router.refresh(); // re-run Server Components with the new session cookie
  };

  const handleSignup = async () => {
    if (!salonName || !fullName || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (OTP_ON && !otpVerified) { setError("Please verify your phone number first."); return; }
    setLoading(true); setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, salonName, fullName, phone, otpToken }),
    });
    const body = await res.json();

    if (!res.ok) { setError(body.error ?? "Could not create the account."); setLoading(false); return; }

    if (body.needsConfirmation) {
      setNotice(`Check ${email} for a confirmation link, then log in.`);
      setTab("login");
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setNotice("Account created — please log in."); setTab("login"); setLoading(false); return; }

    router.replace("/home");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-10" style={{ background: "var(--bg)" }}>
      <div className="mb-10">
        {/* TrimView brand mark. Drop the real logo at public/trimview-mark.png and
            swap the ✂️ tile for <img src="/trimview-mark.png" /> to use it. */}
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "var(--accent-light)", border: "1px solid var(--border-accent)" }}>✂️</div>
          <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>TrimView</span>
        </div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {tab === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {tab === "login" ? "Sign in to your salon account" : "Set up your salon in 30 seconds"}
        </p>
      </div>

      <div className="flex rounded-xl p-1 mb-6" style={{ background: "var(--bg-subtle)" }}>
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); setNotice(""); }}
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

      {/* Deliberately not animated. Behind the Suspense boundary that
          useSearchParams requires, framer-motion's entry animation never fired
          and the whole block stayed at its initial opacity: 0 — an invisible
          login form. A fade on tab switch is not worth that failure mode. */}
      <div className="flex flex-col gap-3">
          {tab === "signup" && (
            <>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Salon name</label>
                <input type="text" placeholder="e.g. Fish Net Salon" value={salonName}
                  onChange={(e) => setSalonName(e.target.value)} autoComplete="organization" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Your name</label>
                <input type="text" placeholder="e.g. Arjun Nair" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
              </div>

              {/* Phone + OTP gate — one verified number per account. */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Mobile number {otpVerified && <span style={{ color: "#4FD69C" }}>✓ verified</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel" inputMode="numeric" placeholder="+91 98765 43210" value={phone}
                    onChange={(e) => { setPhone(e.target.value); setOtpSent(false); setOtpVerified(false); setOtpMsg(""); }}
                    disabled={otpVerified}
                    autoComplete="tel"
                    style={{ flex: 1 }}
                  />
                  {OTP_ON && !otpVerified && (
                    <button type="button" onClick={handleSendOtp} disabled={otpBusy || !phoneOk}
                      className="px-3 rounded-xl text-xs font-bold shrink-0"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-bright)", color: "var(--text-primary)", opacity: (otpBusy || !phoneOk) ? 0.5 : 1 }}>
                      {otpSent ? "Resend" : "Send code"}
                    </button>
                  )}
                </div>
                {OTP_ON && otpSent && !otpVerified && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="tel" inputMode="numeric" placeholder="6-digit code" value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6} style={{ flex: 1 }}
                    />
                    <button type="button" onClick={handleVerifyOtp} disabled={otpBusy}
                      className="px-4 rounded-xl text-xs font-bold shrink-0"
                      style={{ background: "var(--accent)", color: "#000", opacity: otpBusy ? 0.5 : 1 }}>
                      Verify
                    </button>
                  </div>
                )}
                {otpMsg && (
                  <p className="text-[11px] mt-1.5" style={{ color: otpVerified ? "#4FD69C" : "var(--text-muted)" }}>{otpMsg}</p>
                )}
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input type="email" placeholder="you@salon.com" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={tab === "signup" ? "At least 8 characters" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                onKeyDown={(e) => { if (e.key === "Enter" && tab === "login") handleLogin(); }}
                style={{ paddingRight: 44, width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer", padding: 6,
                  fontSize: 16, lineHeight: 1, color: "var(--text-muted)",
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
      </div>

      {error && (
        <p className="mt-3 text-sm rounded-xl p-3" style={{ background: "#FEE", color: "var(--danger)" }}>{error}</p>
      )}
      {notice && (
        <p className="mt-3 text-sm rounded-xl p-3" style={{ background: "var(--accent-light)", color: "var(--text-primary)" }}>{notice}</p>
      )}

      {(() => {
        const blocked = loading || (tab === "signup" && OTP_ON && !otpVerified);
        return (
          <button
            className="btn-primary mt-6"
            onClick={tab === "login" ? handleLogin : handleSignup}
            disabled={blocked}
            style={{ opacity: blocked ? 0.6 : 1 }}
          >
            {loading ? "Please wait…" : tab === "login" ? "Log In"
              : (otpVerified || !OTP_ON) ? "Create Account" : "Verify your phone to continue"}
          </button>
        );
      })()}

      <p className="text-center mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
        {tab === "login" ? "No account? " : "Already have an account? "}
        <button className="font-semibold" style={{ color: "var(--accent-dark)" }}
          onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); setNotice(""); }}>
          {tab === "login" ? "Sign up free" : "Log in"}
        </button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole route
  // into client-side rendering.
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--bg)" }} />}>
      <LoginForm />
    </Suspense>
  );
}
