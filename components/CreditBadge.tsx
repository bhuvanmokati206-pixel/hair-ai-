"use client";

import { useEffect, useState } from "react";
import { getCredits } from "@/lib/credits";

type Props = { onBuyClick: () => void };

export default function CreditBadge({ onBuyClick }: Props) {
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    setCredits(getCredits());
    const handler = (e: Event) => setCredits((e as CustomEvent<number>).detail);
    window.addEventListener("credits-changed", handler);
    return () => window.removeEventListener("credits-changed", handler);
  }, []);

  const low = credits < 5;

  return (
    <button
      onClick={onBuyClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
      style={
        low
          ? {
              background: "rgba(224,106,92,0.15)",
              border: "1px solid rgba(224,106,92,0.4)",
              color: "#E06A5C",
            }
          : {
              background: "rgba(143,167,154,0.1)",
              border: "1px solid rgba(143,167,154,0.25)",
              color: "var(--accent)",
            }
      }
    >
      <span>⚡</span>
      <span>{credits}</span>
      {low && <span style={{ opacity: 0.7 }}>· buy</span>}
    </button>
  );
}
