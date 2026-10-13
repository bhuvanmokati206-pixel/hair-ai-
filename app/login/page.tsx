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

// ── NOIR palette (from the imported design) ────────────────────────────────
const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const FAINT = "#7C766C";

// The TrimView bracket mark — reproduced verbatim from the NOIR design.
function Mark({ size = 42 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke={INK}
      strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <path d="M22 44 V34 A12 12 0 0 1 34 22 H44" />
      <path d="M56 22 H66 A12 12 0 0 1 78 34 V44" />
      <path d="M78 56 V66 A12 12 0 0 1 66 78 H56" />
      <path d="M44 78 H34 A12 12 0 0 1 22 66 V56" />
      <path d="M39 43 H61" strokeWidth={12} />
      <path d="M50 43 V60" strokeWidth={12} />
    </svg>
  );
}

// Mono uppercase micro-label used throughout the NOIR screens.
const microLabel: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", color: FAINT,
};

type View = "operator" | "signup";

function LoginForm() {
  // Operator-only login. (The private-client path was removed — the customer
  // never logs in; the operator hands over the device after the scan.)
  const [view, setView] = useState<View>("operator");

  // Operator sign-in + signup fields
  const [salonName, setSalonName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Phone OTP gate for signup (MSG91 widget).
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const [widgetReady, setWidgetReady] = useState(false);

  const phoneOk = phone.replace(/\D/g, "").length >= 10;

  // OTP master switch. Set NEXT_PUBLIC_OTP_ENABLED=false to skip phone verification.
  const OTP_ON = process.env.NEXT_PUBLIC_OTP_ENABLED !== "false";

  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  // Load the MSG91 widget script once (signup only) and initialise it.
  useEffect(() => {
    if (!OTP_ON) return; // OTP disabled → don't load MSG91 (avoids its 3rd-party RSA script)
    const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
    const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;
    if (!widgetId || !tokenAuth) return;

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
  }, [OTP_ON]);

  const handleSendOtp = () => {
    if (!phoneOk) { setOtpMsg("Enter a valid 10-digit mobile number."); return; }
    if (!widgetReady || !window.sendOtp) { setOtpMsg("Verification isn't ready yet — try again in a moment."); return; }
    setOtpBusy(true); setOtpMsg("");
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
        const token = (d as { message?: string })?.message ?? "";
        setOtpToken(token); setOtpVerified(true); setOtpMsg("");
      },
      (e) => { setOtpBusy(false); setOtpMsg((e as { message?: string })?.message ?? "Incorrect code."); }
    );
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();

    if (!profile) {
      setError("Your account has no profile yet. Contact support.");
      await supabase.auth.signOut(); setLoading(false); return;
    }
    if (!profile.is_active) {
      setError("This account has been deactivated.");
      await supabase.auth.signOut(); setLoading(false); return;
    }

    const next = params.get("next");
    // Role landing: platform admin → cross-salon console; salon owner = "admin"
    // → the salon admin dashboard; managers (and anything else) → the home shell.
    const fallback =
      profile.role === "platform_admin" ? "/admin"
      : profile.role === "salon_owner" ? "/admin-home"
      : "/home";
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
    router.replace(dest);
    router.refresh();
  };

  const handleForgot = async () => {
    if (!email) { setError("Enter your email above, then tap Forgot."); return; }
    setError(""); setNotice("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    if (err) { setError(err.message); return; }
    setNotice(`Password reset link sent to ${email}.`);
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
      setView("operator"); setLoading(false); return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setNotice("Account created — please log in."); setView("operator"); setLoading(false); return; }
    router.replace("/home"); router.refresh();
  };

  const pageBg = (grad: string): React.CSSProperties => ({
    minHeight: "100vh",
    background: `${grad}, #0C0B0A`,
    color: INK,
    fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  });

  const inputBase: React.CSSProperties = {
    background: "transparent", border: 0, borderBottom: "1px solid rgba(242,239,233,.18)",
    color: INK, fontSize: 16, letterSpacing: ".02em", padding: "5px 0 10px", outline: "none",
    fontFamily: "inherit", width: "100%",
  };

  const banner = (
    <>
      {error && (
        <p className="mt-4 text-sm rounded-xl p-3"
          style={{ background: "rgba(224,106,92,0.1)", border: "1px solid rgba(224,106,92,0.28)", color: "#E06A5C" }}>{error}</p>
      )}
      {notice && (
        <p className="mt-4 text-sm rounded-xl p-3"
          style={{ background: "rgba(143,167,154,0.1)", border: "1px solid rgba(143,167,154,0.28)", color: "#BFD2C7" }}>{notice}</p>
      )}
    </>
  );

  // ── OPERATOR SIGN-IN ──────────────────────────────────────────────────────
  if (view === "operator") {
    const canSignIn = !!(email && password);
    return (
      <div style={pageBg("radial-gradient(110% 60% at 24% 4%, rgba(143,167,154,.16), transparent 58%)")}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", padding: "0 26px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 34 }}>
            <div style={{ marginBottom: 16 }}><Mark size={42} /></div>
            <div style={{ fontSize: 26, fontWeight: 200, letterSpacing: ".06em" }}>Sign in</div>
            <div style={{ marginTop: 9, fontSize: 13, color: MUTE }}>Salon operator access</div>
          </div>

          <div style={{
            borderRadius: 26, padding: "28px 24px 24px", background: "rgba(23,22,20,.78)",
            border: "1px solid rgba(242,239,233,.09)", boxShadow: "0 40px 80px -30px rgba(0,0,0,.9)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={microLabel}>Email</span>
                <input type="email" value={email} placeholder="you@salon.com" autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)} style={inputBase} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={microLabel}>Password</span>
                <span style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(242,239,233,.18)", paddingBottom: 10 }}>
                  <input type={showPassword ? "text" : "password"} value={password} placeholder="••••••••"
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                    style={{ flex: 1, background: "transparent", border: 0, color: INK, fontSize: 16, letterSpacing: ".06em", padding: "5px 0 0", outline: "none", fontFamily: "inherit" }} />
                  <button type="button" className="tap" onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: ACC }}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" className="tap" onClick={() => setRemember((v) => !v)} aria-pressed={remember}
                style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, color: MUTE }}>
                <span style={{
                  width: 17, height: 17, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#171614", transition: "all .25s ease",
                  background: remember ? ACC : "transparent",
                  border: `1px solid ${remember ? ACC : "rgba(242,239,233,.28)"}`,
                }}>{remember ? "✓" : ""}</span>
                Remember me
              </button>
              <button type="button" className="tap" onClick={handleForgot} style={{ fontSize: 11, color: ACC }}>Forgot?</button>
            </div>

            <button type="button" className="tap" disabled={!canSignIn || loading}
              onClick={() => { if (canSignIn && !loading) handleLogin(); }}
              style={{
                width: "100%",
                marginTop: 24, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
                cursor: canSignIn ? "pointer" : "default", fontWeight: canSignIn ? 700 : 400,
                background: canSignIn ? "linear-gradient(160deg, #F4F1EB, #E4DFD4 52%, #C7BDAE)" : "rgba(242,239,233,.05)",
                color: canSignIn ? "#14130F" : "#635E56",
                border: canSignIn ? "0" : "1px solid rgba(242,239,233,.1)",
                boxShadow: canSignIn ? "0 16px 32px -16px rgba(242,239,233,.4)" : "none",
                opacity: loading ? 0.6 : 1,
              }}>
              {loading ? "Please wait…" : canSignIn ? "Sign in" : "Enter email & password"}
            </button>

            <div style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: FAINT }}>
              New salon?{" "}
              <button type="button" className="tap" onClick={() => { setView("signup"); setError(""); setNotice(""); }} style={{ color: ACC, fontSize: 11 }}>Create an account</button>
            </div>
          </div>
          {banner}
        </div>
      </div>
    );
  }


  // ── SIGNUP (salon account creation) ───────────────────────────────────────
  const canCreate = !loading && (!OTP_ON || otpVerified);
  return (
    <div style={pageBg("radial-gradient(110% 60% at 24% 4%, rgba(143,167,154,.16), transparent 58%)")}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", padding: "40px 26px" }}>
        <button type="button" onClick={() => setView("operator")}
          style={{ position: "absolute", top: 22, left: 22, background: "transparent", border: 0, color: MUTE, fontSize: 12, letterSpacing: ".08em", cursor: "pointer" }}>
          ← Back
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ marginBottom: 16 }}><Mark size={42} /></div>
          <div style={{ fontSize: 26, fontWeight: 200, letterSpacing: ".06em" }}>Create account</div>
          <div style={{ marginTop: 9, fontSize: 13, color: MUTE }}>Set up your salon in 30 seconds</div>
        </div>

        <div style={{
          borderRadius: 26, padding: "26px 22px", background: "rgba(23,22,20,.78)",
          border: "1px solid rgba(242,239,233,.09)", boxShadow: "0 40px 80px -30px rgba(0,0,0,.9)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={microLabel}>Salon name</span>
              <input type="text" placeholder="e.g. Fish Net Salon" value={salonName}
                onChange={(e) => setSalonName(e.target.value)} autoComplete="organization" style={inputBase} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={microLabel}>Your name</span>
              <input type="text" placeholder="e.g. Arjun Nair" value={fullName}
                onChange={(e) => setFullName(e.target.value)} autoComplete="name" style={inputBase} />
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={microLabel}>Mobile number {otpVerified && <span style={{ color: "#4FD69C" }}>✓ verified</span>}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <input type="tel" inputMode="numeric" placeholder="+91 98765 43210" value={phone}
                  onChange={(e) => { setPhone(e.target.value); setOtpSent(false); setOtpVerified(false); setOtpMsg(""); }}
                  disabled={otpVerified} autoComplete="tel" style={{ ...inputBase, flex: 1 }} />
                {OTP_ON && !otpVerified && (
                  <button type="button" onClick={handleSendOtp} disabled={otpBusy || !phoneOk}
                    style={{ padding: "8px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700, flexShrink: 0,
                      background: "rgba(242,239,233,.05)", border: "1px solid rgba(242,239,233,.14)", color: INK, opacity: (otpBusy || !phoneOk) ? 0.5 : 1 }}>
                    {otpSent ? "Resend" : "Send code"}
                  </button>
                )}
              </div>
              {OTP_ON && otpSent && !otpVerified && (
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input type="tel" inputMode="numeric" placeholder="6-digit code" value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6}
                    style={{ ...inputBase, flex: 1 }} />
                  <button type="button" onClick={handleVerifyOtp} disabled={otpBusy}
                    style={{ padding: "8px 16px", borderRadius: 12, fontSize: 11, fontWeight: 700, flexShrink: 0, background: ACC, color: "#000", opacity: otpBusy ? 0.5 : 1 }}>
                    Verify
                  </button>
                </div>
              )}
              {otpMsg && <p style={{ fontSize: 11, marginTop: 2, color: otpVerified ? "#4FD69C" : FAINT }}>{otpMsg}</p>}
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={microLabel}>Email</span>
              <input type="email" placeholder="you@salon.com" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={inputBase} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={microLabel}>Password</span>
              <span style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(242,239,233,.18)", paddingBottom: 10 }}>
                <input type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
                  style={{ flex: 1, background: "transparent", border: 0, color: INK, fontSize: 16, letterSpacing: ".06em", padding: "5px 0 0", outline: "none", fontFamily: "inherit" }} />
                <button type="button" className="tap" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: ACC }}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>
          </div>

          <button type="button" className="tap" disabled={!canCreate || loading}
            onClick={() => { if (canCreate) handleSignup(); }}
            style={{
              width: "100%",
              marginTop: 24, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
              cursor: canCreate ? "pointer" : "default", fontWeight: canCreate ? 700 : 400,
              background: canCreate ? "linear-gradient(160deg, #F4F1EB, #E4DFD4 52%, #C7BDAE)" : "rgba(242,239,233,.05)",
              color: canCreate ? "#14130F" : "#635E56",
              border: canCreate ? "0" : "1px solid rgba(242,239,233,.1)",
            }}>
            {loading ? "Please wait…" : (otpVerified || !OTP_ON) ? "Create account" : "Verify your phone to continue"}
          </button>

          <div style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: FAINT }}>
            Already have an account?{" "}
            <button type="button" className="tap" onClick={() => { setView("operator"); setError(""); setNotice(""); }} style={{ color: ACC, fontSize: 11 }}>Sign in</button>
          </div>
        </div>
        {banner}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0C0B0A" }} />}>
      <LoginForm />
    </Suspense>
  );
}
