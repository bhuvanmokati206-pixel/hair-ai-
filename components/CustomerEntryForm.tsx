"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

type Props = { onContinue: () => void };

const digitsOnly = (p: string) => p.replace(/\D/g, "");

// Gender is no longer collected here — the AI analyser reads it reliably from the
// scan (front photo), so the manual field was removed. Styling uses the detected
// gender from /api/analyze-hair.

// At least 10 digits — an Indian mobile number, ignoring +91 / spaces / dashes.
const phoneIsValid = (p: string) => p.replace(/\D/g, "").length >= 10;

// OTP master switch. Set NEXT_PUBLIC_OTP_ENABLED=false to skip phone verification.
const OTP_ON = process.env.NEXT_PUBLIC_OTP_ENABLED !== "false";

// ── NOIR palette (from the imported design) ──────────────────────
const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", color: "#7C766C",
};
const LABEL: React.CSSProperties = { fontSize: 10, letterSpacing: ".26em", textTransform: "uppercase", color: MUTE };
const INPUT: React.CSSProperties = {
  background: "transparent", border: 0, borderBottom: "1px solid rgba(242,239,233,.2)",
  color: INK, fontSize: 16, letterSpacing: ".02em", padding: "5px 0 10px", outline: "none", fontFamily: "inherit", width: "100%",
};

export default function CustomerEntryForm({ onContinue }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [touched, setTouched] = useState(false);

  const setCurrentCustomer = useStore((s) => s.setCurrentCustomer);
  const setCurrentSession  = useStore((s) => s.setCurrentSession);

  // Returning customers (already on file for this salon) were verified before — skip
  // OTP for them. null = not checked yet, true = returning, false = new.
  const [returning, setReturning] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // A NEW customer's number is verified before the scan starts, so the salon
  // never collects a wrong number the WhatsApp follow-ups would fail on. The
  // check happens on a dedicated /otp screen (not inline here) — this just
  // remembers which number was last cleared there for this tab.
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  // Restore a draft left behind when we sent the operator off to /otp, and
  // pick up whatever number that screen just verified.
  useEffect(() => {
    setVerifiedPhone(sessionStorage.getItem("otp_verified_phone"));
    const draft = useStore.getState().currentCustomer;
    if (draft && !draft.id) {
      setName((n) => n || draft.name);
      setPhone((p) => p || draft.phone);
      setAcceptedTerms((a) => a || !!draft.acceptedTerms);
    }
  }, []);

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
  const phoneCleared = !OTP_ON || returning === true || (!!verifiedPhone && verifiedPhone === digitsOnly(phone));
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

  // Name + phone are in, but this is a new number — save the draft and hand
  // off to the dedicated OTP screen. It routes back here once "verified".
  const goVerify = () => {
    if (!nameOk || !phoneOk) { setTouched(true); return; }
    setCurrentCustomer({ name: name.trim(), phone: phone.trim(), acceptedTerms });
    router.push(`/otp?phone=${encodeURIComponent(digitsOnly(phone))}&next=${encodeURIComponent("/scan")}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ minHeight: "100vh", background: "var(--bg)", color: INK,
        display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 26px" }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={MICRO}>New Customer</div>
        <div style={{ marginTop: 8, fontSize: 26, fontWeight: 200, letterSpacing: ".06em" }}>Customer details</div>
        <div style={{ marginTop: 8, fontSize: 13, color: MUTE }}>We&apos;ll save this scan to their profile</div>
      </div>

      {/* Card */}
      <div style={{ borderRadius: 28, padding: "28px 24px 26px", background: "rgba(23,22,20,.78)",
        border: "1px solid rgba(242,239,233,.09)", boxShadow: "0 40px 80px -30px rgba(0,0,0,.9)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Name */}
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={LABEL}>Customer name</span>
            <input type="text" placeholder="e.g. Rahul Sharma" value={name} autoFocus
              autoComplete="name"
              autoCorrect="off"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              style={INPUT} />
            {touched && !nameOk && <span style={{ fontSize: 11, color: "#E06A5C" }}>Name is required.</span>}
          </label>

          {/* Mobile */}
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={LABEL}>
              Mobile number
              {returning === true && <span style={{ color: "#4FD69C" }}> · returning ✓</span>}
              {returning === false && phoneCleared && <span style={{ color: "#4FD69C" }}> · verified ✓</span>}
            </span>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, borderBottom: "1px solid rgba(242,239,233,.2)", paddingBottom: 10 }}>
                <span style={{ fontSize: 16, color: ACC, letterSpacing: ".04em" }}>+91</span>
                <input type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="tel" placeholder="98765 43210" value={phone}
                  onChange={(e) => { setPhone(e.target.value); setReturning(null); }}
                  style={{ flex: 1, background: "transparent", border: 0, color: INK, fontSize: 16, letterSpacing: ".09em", padding: "5px 0 0", outline: "none", fontFamily: "inherit" }} />
              </span>
              {returning === false && !phoneCleared && (
                <button type="button" onClick={goVerify} disabled={!phoneOk}
                  style={{ padding: "9px 12px", borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", flexShrink: 0,
                    background: "rgba(242,239,233,.05)", border: "1px solid rgba(242,239,233,.14)", color: INK, opacity: !phoneOk ? 0.5 : 1 }}>
                  Verify number
                </button>
              )}
            </div>
            {touched && !phoneOk && <span style={{ fontSize: 11, color: "#E06A5C" }}>Enter a valid 10-digit mobile number.</span>}
            {checking && <span style={{ fontSize: 11, color: "#7C766C" }}>Checking…</span>}
            {returning === true && <span style={{ fontSize: 11, color: "#7C766C" }}>Number already on file — no verification needed.</span>}
            {returning === false && phoneOk && !phoneCleared && (
              <span style={{ fontSize: 11, color: "#7C766C" }}>New number — tap &quot;Verify number&quot; to send a code.</span>
            )}
          </label>

          {/* Consent */}
          <button type="button" className="tap" onClick={() => setAcceptedTerms((v) => !v)} aria-pressed={acceptedTerms}
            style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", width: "100%" }}>
            <div style={{ width: 19, height: 19, borderRadius: 5, flex: "none", marginTop: 1, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 11, color: "#171614", transition: "all .3s ease",
              background: acceptedTerms ? ACC : "transparent",
              border: `1px solid ${acceptedTerms ? ACC : "rgba(242,239,233,.3)"}` }}>{acceptedTerms ? "✓" : ""}</div>
            <div style={{ fontSize: 11, lineHeight: 1.65, letterSpacing: ".03em", color: MUTE, textAlign: "left" }}>
              Customer accepts the <span style={{ color: ACC }}>Terms of Service</span> and consents to receive updates on WhatsApp.
            </div>
          </button>
        </div>

        {/* Start */}
        <button type="button" className="tap" onClick={handleContinue}
          style={{ width: "100%", marginTop: 26, height: 58, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: canContinue ? 700 : 400, letterSpacing: ".22em", textTransform: "uppercase",
            cursor: canContinue ? "pointer" : "default",
            background: canContinue ? "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)" : "rgba(242,239,233,.05)",
            color: canContinue ? "#14130F" : "#635E56",
            border: canContinue ? "0" : "1px solid rgba(242,239,233,.1)",
            boxShadow: canContinue ? "0 16px 34px -14px rgba(143,167,154,.6)" : "none" }}>
          {nameOk && phoneOk && !phoneCleared ? "Verify the number to continue" : "Begin Scan"}
        </button>
      </div>

      <div style={{ marginTop: 22, textAlign: "center", fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#4E4941" }}>
        We never share customer data with third parties
      </div>
    </motion.div>
  );
}
