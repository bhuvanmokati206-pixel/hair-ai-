"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { HAIRSTYLES } from "@/lib/hairstyleData";

const FILTERS = ["All", "Men", "Women", "Unisex"] as const;

export default function StylesBrowsePage() {
  const router = useRouter();
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All");

  const visible = filter === "All" ? HAIRSTYLES : HAIRSTYLES.filter((h) => h.category === filter);

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-5">
        <h1 className="text-2xl font-black gradient-text-animated">Style Library</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {HAIRSTYLES.length} hairstyles · tap any to see details
        </p>
      </div>

      {/* Filter chips */}
      <div className="px-5 flex gap-2 mb-5 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
            style={
              filter === f
                ? { background: "linear-gradient(135deg, #8FA79A, #6E8778)", color: "#000" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {visible.map((style, i) => (
          <motion.button
            key={style.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 30 }}
            onClick={() => router.push(`/styles/${style.id}`)}
            className="rounded-2xl overflow-hidden flex flex-col text-left active:scale-95 transition-transform"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="aspect-[4/5] overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <img src={style.photos[0]} alt={style.name} className="w-full h-full object-cover" />
            </div>
            <div className="px-3 py-2.5">
              <p className="text-xs font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                {style.name}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {style.category} · {style.specs.maintenance} maintenance
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
