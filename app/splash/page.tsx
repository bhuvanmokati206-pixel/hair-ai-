"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function SplashPage() {
  const router = useRouter();
  const done = useRef(false);

  // Where to go next — signed-in → home, first-run → onboarding, else login.
  const go = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    const { data: { session } } = await supabase.auth.getSession();
    const seen = typeof window !== "undefined" ? localStorage.getItem("onboarding_seen") : "1";
    if (session) router.replace("/home");
    else if (!seen) router.replace("/onboarding");
    else router.replace("/login");
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(go, 2600);
    return () => clearTimeout(timer);
  }, [go]);

  return (
    <div
      onClick={go}
      className="fixed inset-0"
      style={{ background: "#000", cursor: "pointer" }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.52, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.svg
            width="104" height="104" viewBox="0 0 100 100" fill="none" stroke="#F2EFE9"
            strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" aria-label="TrimView" role="img"
            style={{ display: "block" }}
            animate={{ scale: [1, 1.07, 1], opacity: [1, 0.72, 1] }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity, delay: 0.52 }}
          >
            <path d="M22 44 V34 A12 12 0 0 1 34 22 H44" />
            <path d="M56 22 H66 A12 12 0 0 1 78 34 V44" />
            <path d="M78 56 V66 A12 12 0 0 1 66 78 H56" />
            <path d="M44 78 H34 A12 12 0 0 1 22 66 V56" />
            <path d="M39 43 H61" strokeWidth="12" />
            <path d="M50 43 V60" strokeWidth="12" />
          </motion.svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.9, 0.2, 1], delay: 0.76 }}
          style={{ display: "flex", alignItems: "baseline", fontFamily: "'Space Grotesk', Helvetica, sans-serif", fontSize: 26, letterSpacing: "-.02em" }}
        >
          <span style={{ fontWeight: 700, color: "#F2EFE9" }}>trim</span>
          <span style={{ fontWeight: 400, color: "rgba(242,239,233,.6)" }}>view</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 1.4 }}
        style={{
          position: "absolute", bottom: 56, left: 0, right: 0, textAlign: "center",
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 9,
          letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(242,239,233,.32)",
        }}
      >
        AI Salon Studio
      </motion.div>
    </div>
  );
}
