"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HairAnalysis } from "./HairAIAutomation";
import {
  extractCustomerHairTypeProfile,
  getHairstylesClassifiedByHairType,
  type HairTypeCategory,
  type EnrichedExploreStyle,
} from "@/lib/hairTypeMatching";

interface Props {
  analysis: HairAnalysis | null;
  onTryOnFace: (styleName: string) => void;
}

const HAIR_TYPE_TABS: Array<{ id: HairTypeCategory; label: string; icon: string }> = [
  { id: "my_type", label: "For Your Hair Type", icon: "✨" },
  { id: "all", label: "All Styles", icon: "✂️" },
  { id: "straight", label: "Type 1: Straight", icon: "〰️" },
  { id: "wavy", label: "Type 2: Wavy", icon: "🌊" },
  { id: "curly", label: "Type 3: Curly", icon: "🌀" },
  { id: "coily", label: "Type 4: Coily", icon: "⚡" },
  { id: "thick", label: "Thick / Dense Hair", icon: "🦁" },
  { id: "fine", label: "Fine / Thin Hair", icon: "💆" },
];

export default function CustomerExploreTab({ analysis, onTryOnFace }: Props) {
  const [activeCategory, setActiveCategory] = useState<HairTypeCategory>("my_type");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLength, setSelectedLength] = useState<string>("all");

  const customerProfile = useMemo(() => {
    return extractCustomerHairTypeProfile(analysis);
  }, [analysis]);

  const rawStyles = useMemo(() => {
    return getHairstylesClassifiedByHairType(analysis, activeCategory);
  }, [analysis, activeCategory]);

  const filteredStyles = useMemo(() => {
    return rawStyles.filter((style) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = style.name.toLowerCase().includes(q);
        const matchesDesc = style.description.toLowerCase().includes(q);
        const matchesTex = style.specs.hairTexture.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesTex) return false;
      }

      // Length filter
      if (selectedLength !== "all") {
        const styleLen = style.specs.length.toLowerCase();
        if (selectedLength === "short" && !styleLen.includes("short")) return false;
        if (selectedLength === "medium" && !styleLen.includes("medium")) return false;
        if (selectedLength === "long" && !styleLen.includes("long")) return false;
      }

      return true;
    });
  }, [rawStyles, searchQuery, selectedLength]);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="px-5 pt-12 pb-2">
        <div style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: "#7C766C" }}>
          Discovery & Suitability
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Explore by Hair Type</h1>
        <p className="text-xs text-[#948D82] mt-0.5">
          Hairstyles engineered to work with your natural texture, wave pattern, and density.
        </p>
      </div>

      {/* Customer's Detected Hair Type Card */}
      <div className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#8FA79A]/15 via-white/[0.03] to-black/60 border border-[#8FA79A]/30 shadow-lg space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧬</span>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#8FA79A] uppercase block">
                  Your Hair Analysis
                </span>
                <h3 className="text-sm font-black text-white">
                  {customerProfile.typeNumber} {customerProfile.typeLabel} • {customerProfile.densityLabel}
                </h3>
              </div>
            </div>
            {analysis?.faceShape && (
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 font-semibold">
                {analysis.faceShape} Face
              </span>
            )}
          </div>

          <p className="text-xs text-white/70 leading-relaxed">
            {customerProfile.hairBehaviorNotes}
          </p>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-white/40">Stylist Product Match:</span>
            <span className="font-semibold text-emerald-300 truncate max-w-[220px]">
              {customerProfile.recommendedProductType}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Hair Type Filter Tabs */}
      <div className="px-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {HAIR_TYPE_TABS.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? "bg-[#8FA79A] text-black shadow-md font-black"
                    : "bg-white/[0.04] text-white/60 hover:text-white border border-white/10 hover:bg-white/[0.08]"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Filters: Search and Length */}
      <div className="px-5 space-y-2">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-xs text-white/30">🔍</span>
            <input
              type="text"
              placeholder="Search style name or keyword…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#8FA79A]/50 transition-colors"
            />
          </div>

          {/* Length Pills */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/10 text-[10px]">
            {["all", "short", "medium", "long"].map((len) => (
              <button
                key={len}
                onClick={() => setSelectedLength(len)}
                className={`px-2 py-1 rounded-lg capitalize font-bold transition-colors ${
                  selectedLength === len
                    ? "bg-[#8FA79A]/20 text-[#8FA79A] border border-[#8FA79A]/40"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {len}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
          <span>
            Showing <strong className="text-white/80">{filteredStyles.length}</strong> styles suitable for your criteria
          </span>
          {activeCategory === "my_type" && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span>●</span> Sorted by Hair Type Affinity
            </span>
          )}
        </div>
      </div>

      {/* Hairstyle Cards Grid */}
      <div className="px-5 space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredStyles.map((style: EnrichedExploreStyle, index) => {
            const previewPhoto = style.photos[0] || `https://picsum.photos/seed/${style.id}/480/600`;

            return (
              <motion.div
                key={style.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.25) }}
                className="card p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/50 border border-white/10 hover:border-[#8FA79A]/40 transition-all shadow-xl space-y-3"
              >
                <div className="flex gap-3.5">
                  {/* Photo Thumbnail */}
                  <div className="w-24 h-32 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/60 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewPhoto}
                      alt={style.name}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[8px] font-bold text-white uppercase tracking-wider">
                      {style.specs.length}
                    </div>
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            style.isNativeToCustomerType
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {style.hairTypeMatchScore}% Hair Match
                        </span>

                        <span className="text-[10px] text-white/40">
                          ⏱️ {style.specs.stylingTime}
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-white mt-1 tracking-tight">
                        {style.name}
                      </h3>

                      <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5 leading-snug">
                        {style.description}
                      </p>
                    </div>

                    {/* Hair Spec Pills */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-white/70">
                        Texture: <strong className="text-white/90">{style.specs.hairTexture}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-white/70">
                        Maintenance: <strong className="text-white/90">{style.specs.maintenance}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Why This Suits Your Hair Type - Highlight Box */}
                <div className="p-2.5 rounded-xl bg-[#8FA79A]/10 border border-[#8FA79A]/20 text-[11px] leading-relaxed text-emerald-100/90 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#8FA79A] font-bold text-[10px] uppercase tracking-wider">
                    <span>💡</span>
                    <span>Why it works for your {customerProfile.typeLabel} hair:</span>
                  </div>
                  <p className="text-white/80">
                    {style.hairTypeInsight}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-white/50 border-t border-[#8FA79A]/15">
                    <span>Recommended product:</span>
                    <span className="text-[#8FA79A] font-medium truncate max-w-[200px]">
                      {style.recommendedStylingForCustomer}
                    </span>
                  </div>
                </div>

                {/* Action CTA */}
                <div>
                  <button
                    onClick={() => onTryOnFace(style.name)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8FA79A] to-[#6E8778] text-black text-xs font-black uppercase tracking-wider shadow-md hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>✨</span>
                    <span>Preview on My Face</span>
                    <span className="text-[10px] text-black/60 font-normal">›</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredStyles.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
            <span className="text-3xl block">🔍</span>
            <h4 className="text-sm font-bold text-white">No styles matched your filter</h4>
            <p className="text-xs text-white/50">
              Try switching back to &ldquo;All Styles&rdquo; or clearing the search box.
            </p>
            <button
              onClick={() => {
                setActiveCategory("all");
                setSearchQuery("");
                setSelectedLength("all");
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/20 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
