"use client";

// Reusable MSG91 OTP-widget hook. Loads the widget script once, initialises it,
// and exposes send/verify. Used by both owner signup and customer entry.
//
// The widget does the sending + verifying; verifiedToken is MSG91's access-token,
// which a server route can re-check with the Auth Key when it matters.

import { useEffect, useState, useCallback } from "react";

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success: (d: unknown) => void, failure: (e: unknown) => void) => void;
    verifyOtp?: (otp: string, success: (d: unknown) => void, failure: (e: unknown) => void) => void;
    retryOtp?: (channel: string | null, success: (d: unknown) => void, failure: (e: unknown) => void) => void;
  }
}

const msg = (e: unknown, fallback: string) => (e as { message?: string })?.message ?? fallback;

/** Digits with country code, no plus — what MSG91 expects. Assumes India (91). */
function toIdentifier(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}

export function useMsg91Otp() {
  const [ready, setReady] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // OTP disabled → do NOT load the MSG91 widget script at all. (It pulls in a
    // third-party encryption script that throws noisy RSA errors on the page.)
    if (process.env.NEXT_PUBLIC_OTP_ENABLED === "false") return;
    const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
    const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;
    if (!widgetId || !tokenAuth) return; // not configured

    const init = () => {
      if (typeof window.initSendOTP !== "function") return;
      window.initSendOTP({ widgetId, tokenAuth, exposeMethods: true, success: () => {}, failure: () => {} });
      setReady(true);
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

  const sendCode = useCallback((phone: string) => {
    if (!ready || !window.sendOtp) { setError("Verification isn't ready — try again in a moment."); return; }
    setBusy(true); setError("");
    window.sendOtp(
      toIdentifier(phone),
      () => { setBusy(false); setSent(true); },
      (e) => { setBusy(false); setError(msg(e, "Could not send the code.")); }
    );
  }, [ready]);

  const verifyCode = useCallback((code: string) => {
    if (!window.verifyOtp) { setError("Verification isn't ready — resend the code."); return; }
    setBusy(true); setError("");
    window.verifyOtp(
      code.trim(),
      (d) => { setBusy(false); setToken((d as { message?: string })?.message ?? ""); setVerified(true); },
      (e) => { setBusy(false); setError(msg(e, "Incorrect code.")); }
    );
  }, []);

  // Call when the phone changes so a new number must be re-verified.
  const reset = useCallback(() => { setSent(false); setVerified(false); setToken(""); setError(""); }, []);

  return { ready, sent, verified, token, busy, error, sendCode, verifyCode, reset };
}
