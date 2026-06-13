"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type TrendingStyle = {
  name: string;
  description: string;
  why: string;
};

export default function TrendingStrip() {
  const [styles, setStyles] = useState<TrendingStyle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trending")
      .then((r) => r.json())
      .then((d) => { setStyles(d.styles ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const EMOJI = ["💈", "✂️", "👑", "🔥", "⚡", "💎", "🌟", "🎯"];

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 px-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-36 h-28 skeleton rounded-2xl" />
        ))}
      </div>
    );
  }

  if (styles.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 px-1" style={{ scrollbarWidth: "none" }}>
      {styles.map((s, i) => (
        <motion.div
          key={s.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex-shrink-0 w-36 p-3 card flex flex-col gap-1.5"
        >
          <span className="text-2xl">{EMOJI[i % EMOJI.length]}</span>
          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{s.name}</p>
          <p className="text-xs leading-snug line-clamp-2" style={{ color: "var(--text-muted)" }}>{s.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
