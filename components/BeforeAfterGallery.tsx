"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getShowcase, type ShowcaseItem } from "@/lib/showcase";

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span style={{ color: "#C9A15C", fontSize: 11, letterSpacing: 1 }}>
      {"★".repeat(rating)}
      <span style={{ color: "var(--border-bright)" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function Panel({ url, label }: { url: string | null; label: string }) {
  return (
    <div className="relative flex-1 aspect-[3/4] overflow-hidden rounded-xl"
      style={{ background: "var(--bg-subtle)" }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-2xl">🚫</div>
      )}
      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide"
        style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
        {label}
      </span>
    </div>
  );
}

export default function BeforeAfterGallery({ salonId }: { salonId: string | null }) {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!salonId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getShowcase(createClient(), salonId);
        if (!cancelled) setItems(rows);
      } catch (e) {
        console.warn("[showcase] failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [salonId]);

  return (
    <div className="px-5 mb-6">
      <h2 className="font-bold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Before &amp; after</h2>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" style={{ minWidth: 260 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-5 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-3xl mb-2">📸</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No transformations yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Completed scans with a generated look will appear here</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
          {items.map((it, i) => (
            <motion.div
              key={it.visitId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-2xl p-3 flex-shrink-0"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", width: 260 }}
            >
              <div className="flex gap-2 mb-2">
                <Panel url={it.beforeUrl} label="Before" />
                <Panel url={it.afterUrl} label="After" />
              </div>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-xs truncate" style={{ color: "var(--text-primary)" }}>{it.customerName}</p>
                <Stars rating={it.rating} />
              </div>
              {it.style && (
                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--accent)" }}>{it.style}</p>
              )}
              {it.review && (
                <p className="text-[11px] mt-1 leading-snug italic" style={{ color: "var(--text-secondary)" }}>
                  &ldquo;{it.review}&rdquo;
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
