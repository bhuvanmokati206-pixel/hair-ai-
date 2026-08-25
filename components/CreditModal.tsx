"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addCredits } from "@/lib/credits";

type Props = { open: boolean; onClose: () => void };

const PACKS = [
  { id: "starter" as const, label: "Starter", price: 199, credits: 100, perCredit: "₹1.99", badge: "" },
  { id: "popular" as const, label: "Popular", price: 499, credits: 300, perCredit: "₹1.66", badge: "Best value" },
  { id: "pro"     as const, label: "Pro",     price: 999, credits: 750, perCredit: "₹1.33", badge: "" },
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export default function CreditModal({ open, onClose }: Props) {
  const [buying, setBuying] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ credits: number } | null>(null);

  const handleBuy = async (pack: typeof PACKS[number]) => {
    setBuying(pack.id);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Payment script failed to load. Check your connection.");

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not create order");

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "Hair AI",
          description: `${pack.credits} image credits`,
          theme: { color: "#8FA79A" },
          handler: async (response: Record<string, string>) => {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, packId: pack.id }),
            });
            const result = await verifyRes.json();
            if (!verifyRes.ok) { reject(new Error(result.error ?? "Payment verification failed")); return; }
            addCredits(pack.credits);
            setSuccess({ credits: pack.credits });
            resolve();
          },
          modal: { ondismiss: () => reject(new Error("dismissed")) },
        });
        rzp.open();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg !== "dismissed") alert(msg);
    } finally {
      setBuying(null);
    }
  };

  const handleClose = () => { setSuccess(null); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={handleClose}
          />

          <motion.div
            className="relative w-full max-w-md rounded-t-3xl p-6 pb-10"
            style={{
              background: "rgba(17,17,17,0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(143,167,154,0.04)",
            }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            {/* Drag handle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)" }} />

            {success ? (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="text-5xl mb-3"
                >
                  ✅
                </motion.div>
                <h3 className="text-xl font-black mb-1 gradient-text">
                  {success.credits} credits added!
                </h3>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Ready to generate more styles
                </p>
                <button onClick={handleClose} className="btn-primary">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5 mt-2">
                  <div>
                    <h3 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Buy Credits</h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      1 credit = 1 style image · 4 credits = 360° GIF
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-base"
                    style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {PACKS.map((pack) => (
                    <div
                      key={pack.id}
                      className="relative rounded-2xl p-4 flex items-center gap-4"
                      style={{
                        background: pack.badge
                          ? "linear-gradient(135deg, rgba(143,167,154,0.07), rgba(169,162,184,0.05))"
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${pack.badge ? "rgba(143,167,154,0.2)" : "rgba(255,255,255,0.07)"}`,
                        boxShadow: pack.badge ? "0 0 16px rgba(143,167,154,0.05)" : "none",
                      }}
                    >
                      {pack.badge && (
                        <span
                          className="absolute -top-2.5 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full"
                          style={{
                            background: "linear-gradient(135deg, #8FA79A, #A9A2B8)",
                            color: "#000",
                          }}
                        >
                          {pack.badge}
                        </span>
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{pack.label}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {pack.credits} credits · {pack.perCredit}/credit
                        </p>
                      </div>
                      <div className="text-right mr-2">
                        <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>₹{pack.price}</p>
                      </div>
                      <button
                        onClick={() => handleBuy(pack)}
                        disabled={!!buying}
                        className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
                        style={{
                          background: "linear-gradient(135deg, #8FA79A, #6E8778)",
                          color: "#000",
                          boxShadow: "0 0 12px rgba(143,167,154,0.25)",
                        }}
                      >
                        {buying === pack.id ? "…" : "Buy"}
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
                  Secured by Razorpay · GST included
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
