"use client";

// Dummy OTP gate (demo only). Reached from the customer-entry form (scan flow)
// after a NEW customer's name + phone are entered. Accepts ANY 6-digit code —
// there is no real verification here yet. Swap in the MSG91 flow when going live.
//
// ?phone=<digits>  the number being "verified" (shown back to the operator)
// ?next=<path>     where to return once verified — defaults to /login

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ACC = "#8FA79A";
const FAINT = "#7C766C";
const MUTE = "#948D82";

const micro: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: FAINT,
};

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const next = params.get("next") || "/login";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [notice, setNotice] = useState("Demo mode — enter any 6 digits to continue.");
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");
  const complete = code.length === 6;

  function setAt(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      // paste of multiple digits
      const next = [...digits];
      for (let k = 0; k < clean.length && i + k < 6; k++) next[i + k] = clean[k];
      setDigits(next);
      const last = Math.min(i + clean.length, 5);
      refs.current[last]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  }

  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function resend() {
    setDigits(["", "", "", "", "", ""]);
    setNotice("A new code was “sent”. (Demo — any 6 digits work.)");
    refs.current[0]?.focus();
  }

  function verify() {
    if (!complete || loading) return;
    setLoading(true);
    // Dummy verify — no backend call. Remember this phone as verified for the
    // rest of the tab (CustomerEntryForm checks this before letting the scan
    // start), then return to wherever we came from.
    if (phone) sessionStorage.setItem("otp_verified_phone", phone.replace(/\D/g, ""));
    setTimeout(() => router.replace(next), 450);
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
        <div style={micro}>Verification</div>
        <h1 style={{ marginTop: 10, fontSize: 26, fontWeight: 200, letterSpacing: ".02em", color: "#F2EFE9" }}>Enter the code</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: MUTE, lineHeight: 1.5 }}>
          {phone
            ? <>We sent a 6-digit verification code to <span style={{ color: ACC }}>+91 {phone}</span>.</>
            : "We sent a 6-digit verification code to your phone."}
        </p>

        {/* OTP boxes */}
        <div role="group" aria-label="One-time passcode" style={{ display: "flex", gap: 10, marginTop: 28 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={6}
              aria-label={`Digit ${i + 1}`}
              style={{
                flex: 1, minWidth: 0, height: 58, textAlign: "center",
                fontSize: 22, fontWeight: 600, color: "#F2EFE9",
                background: "rgba(255,255,255,0.05)",
                border: `1.5px solid ${d ? ACC : "rgba(242,239,233,.14)"}`,
                borderRadius: 14, outline: "none", transition: "border-color .15s",
              }}
            />
          ))}
        </div>

        <p aria-live="polite" style={{ marginTop: 14, fontSize: 11.5, color: FAINT, lineHeight: 1.5 }}>{notice}</p>

        <button type="button" className="tap" disabled={!complete || loading}
          onClick={verify}
          style={{
            width: "100%", marginTop: 22, height: 56, borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
            fontWeight: complete ? 700 : 400,
            background: complete ? "linear-gradient(160deg, #F4F1EB, #E4DFD4 52%, #C7BDAE)" : "rgba(242,239,233,.05)",
            color: complete ? "#14130F" : "#635E56",
            border: complete ? "0" : "1px solid rgba(242,239,233,.1)",
            boxShadow: complete ? "0 16px 32px -16px rgba(242,239,233,.4)" : "none",
            opacity: loading ? 0.6 : 1,
          }}>
          {loading ? "Verifying…" : complete ? "Continue" : "Enter 6-digit code"}
        </button>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: FAINT }}>
          Didn’t get it?{" "}
          <button type="button" className="tap" onClick={resend} style={{ color: ACC, fontSize: 12 }}>Resend code</button>
        </div>

        <div style={{ marginTop: 10, textAlign: "center" }}>
          <button type="button" className="tap" onClick={() => {
            if (phone) sessionStorage.setItem("otp_verified_phone", phone.replace(/\D/g, ""));
            router.replace(next);
          }} style={{ color: FAINT, fontSize: 11 }}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpForm />
    </Suspense>
  );
}
