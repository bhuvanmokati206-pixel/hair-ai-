"use client";

// Explore — a browse/discovery page for hairstyles. Distinct from the Customize
// studio (which stays on the Home "Customise" action). Search the web for any
// look, or browse the built-in catalog; tapping a style takes you to the studio
// to try it on the customer.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import HairstyleSearch from "@/components/HairstyleSearch";
import { TOP_STYLES, FADE_STYLES, BACK_STYLES, Option } from "@/lib/customizeOptions";

const CATEGORIES: { title: string; icon: string; options: Option[] }[] = [
  { title: "Popular front styles", icon: "💇", options: TOP_STYLES },
  { title: "Fades & side profiles", icon: "✂️", options: FADE_STYLES },
  { title: "Back styles", icon: "🔄", options: BACK_STYLES },
];

export default function ExplorePage() {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);

  // Tapping any style hands off to the studio to try it.
  const openStudio = () => router.push("/customize");

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-4">
        <p className="section-label">Explore</p>
        <h1 className="text-2xl font-black gradient-text-animated">Discover hairstyles</h1>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Search any look or browse the catalog, then try it in the studio.
        </p>
      </div>

      {/* Search */}
      <section className="px-5 mb-6">
        <HairstyleSearch onAdd={() => { setSaved("Opening studio…"); openStudio(); }} />
        {saved && <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>{saved}</p>}
      </section>

      {/* Browse the catalog */}
      {CATEGORIES.map((cat) => (
        <section key={cat.title} className="px-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="section-label">{cat.title}</p>
            <button onClick={openStudio} className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>Try in studio ›</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {cat.options.map((o) => (
              <button key={o.id} onClick={openStudio}
                className="shrink-0 w-[78px] flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                <div className="w-[70px] h-[70px] rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                  {cat.icon}
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: "var(--text-secondary)" }}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* CTA to the studio */}
      <div className="px-5 mt-2">
        <motion.button whileTap={{ scale: 0.98 }} onClick={openStudio} className="w-full btn-primary">
          ✦ Open the customize studio
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}
