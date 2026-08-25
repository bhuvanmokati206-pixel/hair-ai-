"use client";

import type { ProductRecommendation } from "@/app/api/hair-health/route";

const TYPE_META: Record<string, { gradient: string; text: string; label: string }> = {
  shampoo:     { gradient: "rgba(143,167,154,0.08)", text: "#8FA79A",  label: "Shampoo" },
  conditioner: { gradient: "rgba(169,162,184,0.08)", text: "#A78BFA", label: "Conditioner" },
  oil:         { gradient: "rgba(201,161,92,0.08)", text: "#FBBF24", label: "Hair Oil" },
  serum:       { gradient: "rgba(79,214,156,0.08)",  text: "#4ADE80", label: "Serum" },
  mask:        { gradient: "rgba(236,72,153,0.08)", text: "#F472B6", label: "Hair Mask" },
  supplement:  { gradient: "rgba(251,191,36,0.08)", text: "#FDE047", label: "Supplement" },
  other:       { gradient: "rgba(255,255,255,0.03)", text: "#6B7280", label: "Product" },
};

type Props = { product: ProductRecommendation; index: number };

export default function ProductCard({ product, index }: Props) {
  const meta = TYPE_META[product.type] ?? TYPE_META.other;
  const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(product.searchTerm)}`;
  const nykaaUrl  = `https://www.nykaa.com/search/result/?q=${encodeURIComponent(product.searchTerm)}`;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2.5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
            {product.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{product.brand}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: meta.gradient, color: meta.text, border: `1px solid ${meta.text}30` }}
          >
            {meta.label}
          </span>
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {product.priceRange}
          </span>
        </div>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {product.whyItHelps}
      </p>

      <div className="flex gap-2 mt-1">
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
          style={{
            background: "rgba(251,113,0,0.08)",
            border: "1px solid rgba(251,113,0,0.2)",
            color: "#FB923C",
          }}
        >
          Amazon
        </a>
        <a
          href={nykaaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
          style={{
            background: "rgba(236,72,153,0.08)",
            border: "1px solid rgba(236,72,153,0.2)",
            color: "#F472B6",
          }}
        >
          Nykaa
        </a>
      </div>
    </div>
  );
}
