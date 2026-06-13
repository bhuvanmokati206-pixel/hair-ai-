"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

type Props = { onContinue: () => void };

export default function CustomerEntryForm({ onContinue }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const setCurrentCustomer = useStore((s) => s.setCurrentCustomer);
  const setCurrentSession  = useStore((s) => s.setCurrentSession);

  const handleContinue = () => {
    if (!name.trim()) return;
    const customer = { name: name.trim(), phone: phone.trim() };
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
          We'll save this scan to their profile
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
        </div>

        <div>
          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Phone number (optional)
          </label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          />
        </div>
      </div>

      <div className="mt-8">
        <button
          className="btn-primary"
          onClick={handleContinue}
          disabled={!name.trim()}
          style={{ opacity: name.trim() ? 1 : 0.5 }}
        >
          Start Scan →
        </button>
        <p className="text-center mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          We never share customer data with third parties
        </p>
      </div>
    </motion.div>
  );
}
