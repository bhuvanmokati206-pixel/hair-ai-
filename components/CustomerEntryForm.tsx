"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { useMsg91Otp } from "@/lib/useMsg91Otp";

type Props = { onContinue: () => void };

// Gender is no longer collected here — the AI analyser reads it reliably from the
// scan (front photo), so the manual field was removed. Styling uses the detected
// gender from /api/analyze-hair.

// At least 10 digits — an Indian mobile number, ignoring +91 / spaces / dashes.
const phoneIsValid = (p: string) => p.replace(/\D/g, "").length >= 10;

// OTP master switch. Set NEXT_PUBLIC_OTP_ENABLED=false to skip phone verification.
const OTP_ON = process.env.NEXT_PUBLIC_OTP_ENABLED !== "false";

export default function CustomerEntryForm({ onContinue }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [touched, setTouched] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const setCurrentCustomer = useStore((s) => s.setCurrentCustomer);
  const setCurrentSession  = useStore((s) => s.setCurrentSession);

  // OTP: a NEW customer's number is verified before the scan starts, so the salon
  // never collects a wrong number the WhatsApp follow-ups would fail on.
  const otp = useMsg91Otp();

  // Returning customers (already on file for this salon) were verified before — skip
  // OTP for them. null = not checked yet, true = returning, false = new.
  const [returning, setReturning] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const nameOk   = name.trim().length > 0;
  const phoneOk  = phoneIsValid(phone);

  // Look the number up (debounced) once it's valid. Known → returning, prefill.
  useEffect(() => {
    if (!OTP_ON) { setReturning(null); return; } // OTP off → no lookup needed
    if (!phoneOk) { setReturning(null); return; }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customer?phone=${encodeURIComponent(phone)}`);
        const body = await res.json();
        if (cancelled) return;
        if (res.ok && body.customer) {
          setReturning(true);
          if (body.customer.name) setName((n) => n || body.customer.name);
        } else {
          setReturning(false);
        }
      } catch { if (!cancelled) setReturning(false); }
      finally { if (!cancelled) setChecking(false); }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone, phoneOk]);

  // New numbers must pass OTP; returning ones are already trusted.
  const phoneCleared = !OTP_ON || returning === true || otp.verified;
  const canContinue = nameOk && phoneOk && phoneCleared;

  const handleContinue = () => {
    if (!canContinue) { setTouched(true); return; }
    const customer = {
      name: name.trim(),
      phone: phone.trim(),
      acceptedTerms,
    };
    setCurrentCustomer(customer);
    setCurrentSession({ customer, photos: [], analysis: null, savedStyles: [] });
    onContinue();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col min-h-screen px-6 pt-14 pb-10"
      style={{ background: "var(--bg)" }}
    >
      <div className="mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5"
          style={{ background: "var(--accent-light)" }}>📋</div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Customer details</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          We&apos;ll save this scan to their profile
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Customer name *
          </label>
          <input
            type="text"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            autoFocus
          />
          {touched && !nameOk && (
            <p className="text-[11px] mt-1" style={{ color: "var(--danger)" }}>Name is required.</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Mobile number *
            {returning === true && <span style={{ color: "#4FD69C" }}> ✓ returning customer</span>}
            {returning === false && otp.verified && <span style={{ color: "#4FD69C" }}> ✓ verified</span>}
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="+91 98765 43210"
              value={phone}
              disabled={otp.verified}
              onChange={(e) => { setPhone(e.target.value); otp.reset(); setReturning(null); }}
              style={{ flex: 1 }}
            />
            {/* OTP only for NEW numbers. Returning customers were verified already. */}
            {returning === false && !otp.verified && (
              <button type="button"
                onClick={() => otp.sendCode(phone)}
                disabled={otp.busy || !phoneOk}
                className="px-3 rounded-xl text-xs font-bold shrink-0"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)", opacity: (otp.busy || !phoneOk) ? 0.5 : 1 }}>
                {otp.sent ? "Resend" : "Send OTP"}
              </button>
            )}
          </div>
          {returning === false && otp.sent && !otp.verified && (
            <div className="flex gap-2 mt-2">
              <input
                type="tel" inputMode="numeric" placeholder="Enter OTP" value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6} style={{ flex: 1 }}
              />
              <button type="button" onClick={() => otp.verifyCode(otpCode)} disabled={otp.busy}
                className="px-4 rounded-xl text-xs font-bold shrink-0"
                style={{ background: "var(--accent)", color: "#000", opacity: otp.busy ? 0.5 : 1 }}>
                Verify
              </button>
            </div>
          )}
          {touched && !phoneOk && (
            <p className="text-[11px] mt-1" style={{ color: "var(--danger)" }}>Enter a valid 10-digit mobile number.</p>
          )}
          {checking && <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Checking…</p>}
          {returning === true && (
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Number already on file — no verification needed.</p>
          )}
          {otp.error && <p className="text-[11px] mt-1" style={{ color: "var(--danger)" }}>{otp.error}</p>}
          {returning === false && otp.sent && !otp.verified && !otp.error && (
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>OTP sent to the customer&apos;s phone — ask them for the code.</p>
          )}
        </div>

        {/* Gender is detected automatically by the AI from the scan — no manual field. */}

        {/* Barber is chosen later, at billing/checkout — not at scan start. */}

        {/* Terms — collected but not mandatory for now. Ticking it also records
            the messaging consent the review/rebook automation needs. */}
        <button
          type="button"
          onClick={() => setAcceptedTerms((v) => !v)}
          className="flex items-start gap-2.5 text-left mt-1 active:scale-[0.99] transition-transform"
        >
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs"
            style={
              acceptedTerms
                ? { background: "var(--accent)", color: "#000" }
                : { background: "var(--bg-subtle)", border: "1px solid var(--border-bright)" }
            }
          >
            {acceptedTerms ? "✓" : ""}
          </span>
          <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Customer accepts the terms &amp; conditions and consents to receive updates on WhatsApp.
          </span>
        </button>
      </div>

      <div className="mt-8">
        <button
          className="btn-primary"
          onClick={handleContinue}
          disabled={!canContinue}
          style={{ opacity: canContinue ? 1 : 0.5 }}
        >
          {nameOk && phoneOk && !phoneCleared ? "Verify the number to continue" : "Start Scan →"}
        </button>
        <p className="text-center mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          We never share customer data with third parties
        </p>
      </div>
    </motion.div>
  );
}
