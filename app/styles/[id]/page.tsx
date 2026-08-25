"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { getHairstyleById } from "@/lib/hairstyleData";

function TrendChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const change = data[data.length - 1] - data[0];
  const trendingUp = change >= 0;

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Popularity — last 8 weeks</p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: trendingUp ? "rgba(79,214,156,0.1)" : "rgba(224,106,92,0.1)",
            color: trendingUp ? "var(--success)" : "var(--danger)",
          }}
        >
          {trendingUp ? "↑" : "↓"} {Math.abs(change)} this period
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {data.map((v, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 100}%` }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 25 }}
            className="flex-1 rounded-t-md"
            style={{
              background: i === data.length - 1
                ? "linear-gradient(180deg, #8FA79A, #6E8778)"
                : "rgba(143,167,154,0.18)",
              minHeight: 4,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>8 wks ago</span>
        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>This week</span>
      </div>
    </div>
  );
}

export default function StyleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const style = getHairstyleById(params.id);
  const [activePhoto, setActivePhoto] = useState(0);

  if (!style) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Style not found</p>
        <button onClick={() => router.push("/styles")} className="mt-3 text-sm" style={{ color: "var(--accent)" }}>
          ← Back to library
        </button>
        <BottomNav />
      </div>
    );
  }

  const avgRating = style.reviews.length
    ? (style.reviews.reduce((sum, r) => sum + r.rating, 0) / style.reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      {/* Photo carousel */}
      <div className="relative aspect-[4/5] overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
        <img src={style.photos[activePhoto]} alt={style.name} className="w-full h-full object-cover" />

        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
        >
          ←
        </button>

        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {style.photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setActivePhoto(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === activePhoto ? 20 : 8,
                background: i === activePhoto ? "#8FA79A" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* Name + category */}
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{style.name}</h1>
          {avgRating && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ background: "rgba(201,161,92,0.1)", border: "1px solid rgba(201,161,92,0.25)" }}>
              <span className="text-xs">★</span>
              <span className="text-xs font-bold" style={{ color: "#C9A15C" }}>{avgRating}</span>
            </div>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{style.category}</p>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>{style.description}</p>

        {/* Specifications */}
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          Specifications
        </p>
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Best for face shape</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {style.specs.faceShapes.join(", ")}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Hair texture</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{style.specs.hairTexture}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Maintenance</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{style.specs.maintenance}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Styling time</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{style.specs.stylingTime}</p>
          </div>
        </div>

        {/* Trend schematic */}
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          Trend
        </p>
        <div className="mb-6">
          <TrendChart data={style.weeklyTrend} />
        </div>

        {/* Reviews */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Customer reviews
          </p>
          {style.reviews.length > 0 && (
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{style.reviews.length} reviews</p>
          )}
        </div>

        {style.reviews.length === 0 ? (
          <div className="rounded-xl p-4 text-center mb-6" style={{ background: "var(--bg-card)", border: "1px dashed var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No customers have tried this style yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 mb-6">
            {style.reviews.map((r, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{r.customerName}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: "#C9A15C" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{r.daysAgo}d ago</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.comment}</p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push("/scan")}
          className="w-full py-3.5 rounded-2xl font-bold text-sm mb-2 active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #8FA79A, #6E8778)",
            color: "#000",
            boxShadow: "0 0 16px rgba(143,167,154,0.25)",
          }}
        >
          Try this style on a customer
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
