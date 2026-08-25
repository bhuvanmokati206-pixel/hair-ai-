"use client";

import { useState } from "react";
import type { SearchImage } from "@/app/api/hairstyle-search/route";

type Props = {
  // Tap or drag a result to add it to the board. Tap is the touch-friendly path;
  // drag works on desktop.
  onAdd: (img: SearchImage) => void;
};

export default function HairstyleSearch({ onAdd }: Props) {
  const [q, setQ] = useState("");
  const [images, setImages] = useState<SearchImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [searched, setSearched] = useState(false);

  const run = async () => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/hairstyle-search?q=${encodeURIComponent(term)}`);
      const body = await res.json();
      setConfigured(body.configured !== false);
      setImages(body.images ?? []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search hairstyles — e.g. textured crop, bob, layers"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          className="flex-1"
        />
        <button
          onClick={run}
          disabled={loading || !q.trim()}
          className="px-4 rounded-xl text-sm font-bold active:scale-95 transition-transform shrink-0"
          style={{ background: "var(--accent)", color: "#000", opacity: loading || !q.trim() ? 0.5 : 1 }}
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      {searched && !configured && (
        <p className="text-[11px] mt-2 rounded-lg px-3 py-2"
          style={{ background: "rgba(201,161,92,0.1)", color: "var(--warning, #C9A15C)" }}>
          Web search isn&apos;t set up yet (needs a SERPAPI_KEY). You can still upload a reference photo below.
        </p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {images.map((img, i) => (
            <button
              key={i}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify(img))}
              onClick={() => onAdd(img)}
              className="aspect-square rounded-xl overflow-hidden active:scale-95 transition-transform relative"
              style={{ border: "1px solid var(--border)" }}
              title="Tap to add to board"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb} alt="hairstyle" className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: "var(--accent)", color: "#000" }}>+</span>
            </button>
          ))}
        </div>
      )}

      {searched && configured && !loading && images.length === 0 && (
        <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>No results — try different words.</p>
      )}
    </div>
  );
}
