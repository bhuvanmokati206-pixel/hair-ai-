"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const seen = localStorage.getItem("onboarding_seen");
      if (session) {
        router.replace("/home");
      } else if (!seen) {
        router.replace("/onboarding");
      } else {
        router.replace("/login");
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: "var(--bg)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4"
      >
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: "var(--accent-light)", border: "2px solid var(--accent)" }}>
          <span style={{ fontSize: 40 }}>✂️</span>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text tracking-tight">Hair AI</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Professional salon assistant</p>
        </div>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-16 flex gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--accent)" }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
}
