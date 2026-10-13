"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";

interface PhotoItem {
  id: string;
  kind: "original" | "generated";
  angle: "front" | "left" | "right" | "back" | null;
  service_type: string | null;
  style_name: string | null;
  url: string | null;
  is_hero: boolean;
}

interface VisitHistoryItem {
  id: string;
  createdAt: string;
  endedAt: string | null;
  status: string;
  serviceType: string;
  chosenStyle: string | null;
  chosenBeardStyle: string | null;
  customerRating: number | null;
  barberNotes: string | null;
  analysis: {
    faceShape?: string;
    hairType?: string;
    texture?: string;
    density?: string;
    scalpCondition?: string;
    topRecommendations?: string[];
    [key: string]: unknown;
  } | null;
  customer: {
    id: string;
    name: string;
    phone: string;
  } | null;
  barber: {
    id: string;
    name: string;
  } | null;
  photos: {
    all: PhotoItem[];
    before: PhotoItem[];
    after: PhotoItem[];
    hero: string | null;
    originalFront: string | null;
  };
}

export default function SavedHistoryPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/visit/history");
        const data = await res.json();
        if (res.ok && data.visits) {
          setVisits(data.visits);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const filteredVisits = useMemo(() => {
    if (!search.trim()) return visits;
    const q = search.toLowerCase();
    return visits.filter(
      (v) =>
        v.customer?.name.toLowerCase().includes(q) ||
        v.customer?.phone.includes(q) ||
        (v.chosenStyle && v.chosenStyle.toLowerCase().includes(q)) ||
        (v.barber?.name && v.barber.name.toLowerCase().includes(q))
    );
  }, [visits, search]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg)", color: "var(--text-primary)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-label">Database Records</p>
            <h1 className="text-2xl font-black text-white">Client History</h1>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/70">
            {filteredVisits.length} visits
          </span>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or style…"
            className="w-full text-xs py-2.5 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-xs text-white/40 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main List */}
      <div className="px-5">
        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="card p-8 text-center my-6 space-y-2">
            <p className="text-3xl">🗓️</p>
            <p className="font-bold text-sm text-white">No visit history found</p>
            <p className="text-xs text-white/50">
              {search ? "No records matching your search." : "Completed customer scans and visits will appear here."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredVisits.map((v, i) => {
              const isExpanded = expandedId === v.id;
              const hasBefore = !!v.photos.originalFront || v.photos.before.length > 0;
              const hasAfter = !!v.photos.hero || v.photos.after.length > 0;

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="card p-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent hover:border-white/20 transition-all space-y-3"
                >
                  {/* Card Top: Customer info & status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background: "rgba(143,167,154,0.18)", color: "#BFD2C7" }}
                      >
                        {(v.customer?.name || "W")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">
                          {v.customer?.name || "Walk-in Customer"}
                        </h3>
                        <p className="text-[11px] text-white/50">{v.customer?.phone || "No phone"}</p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {v.status}
                      </span>
                      <span className="text-[10px] text-white/40">{formatDate(v.createdAt)}</span>
                    </div>
                  </div>

                  {/* Visit Highlights: Style & Barber */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {v.chosenStyle && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium flex items-center gap-1.5">
                        <span>✂️</span>
                        <span>{v.chosenStyle}</span>
                      </span>
                    )}
                    {v.barber?.name && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 font-medium flex items-center gap-1.5">
                        <span>💈</span>
                        <span>{v.barber.name}</span>
                      </span>
                    )}
                    {v.customerRating && (
                      <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20 flex items-center gap-1">
                        <span>★</span>
                        <span>{v.customerRating}/5</span>
                      </span>
                    )}
                  </div>

                  {/* Before & After Image Preview Card */}
                  {(hasBefore || hasAfter) && (
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex items-center justify-between gap-2">
                        {/* Before Photo */}
                        <div className="flex-1 flex flex-col items-center">
                          <div className="w-full aspect-[4/5] rounded-lg overflow-hidden bg-black/60 border border-white/10 relative">
                            {v.photos.originalFront ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={v.photos.originalFront}
                                alt="Before Scan"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40">
                                No photo
                              </div>
                            )}
                          </div>
                          <span className="mt-1 text-[8px] font-bold text-white/50 uppercase tracking-wider">
                            Before Scan
                          </span>
                        </div>

                        {/* Arrow */}
                        <div className="text-amber-400 font-black text-sm px-1">➔</div>

                        {/* After Photo */}
                        <div className="flex-1 flex flex-col items-center">
                          <div className="w-full aspect-[4/5] rounded-lg overflow-hidden bg-black/60 border border-emerald-500/30 relative">
                            {v.photos.hero ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={v.photos.hero}
                                alt="AI Generated Look"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40">
                                No style
                              </div>
                            )}
                          </div>
                          <span className="mt-1 text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                            AI Look
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Toggle Analysis Details Button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                    className="w-full pt-2 flex items-center justify-between text-[11px] font-medium text-white/60 hover:text-white border-t border-white/5 transition-colors"
                  >
                    <span>{isExpanded ? "Hide Details" : "View Hair Analysis & Photos"}</span>
                    <span className="text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {/* Expandable Details Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 pt-2 overflow-hidden text-xs"
                      >
                        {/* Analysis Grid */}
                        {v.analysis && (
                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            {v.analysis.faceShape && (
                              <div>
                                <span className="text-[10px] text-white/40 block">Face Shape</span>
                                <span className="font-semibold text-white capitalize">{v.analysis.faceShape}</span>
                              </div>
                            )}
                            {v.analysis.hairType && (
                              <div>
                                <span className="text-[10px] text-white/40 block">Hair Type</span>
                                <span className="font-semibold text-white capitalize">{v.analysis.hairType}</span>
                              </div>
                            )}
                            {v.analysis.texture && (
                              <div>
                                <span className="text-[10px] text-white/40 block">Texture</span>
                                <span className="font-semibold text-white capitalize">{v.analysis.texture}</span>
                              </div>
                            )}
                            {v.analysis.density && (
                              <div>
                                <span className="text-[10px] text-white/40 block">Density</span>
                                <span className="font-semibold text-white capitalize">{v.analysis.density}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Barber Notes */}
                        {v.barberNotes && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200/90 text-xs">
                            <span className="font-bold block mb-0.5 text-[10px] text-amber-300">Stylist Notes:</span>
                            {v.barberNotes}
                          </div>
                        )}

                        {/* All Photos Gallery if > 2 photos */}
                        {v.photos.all.length > 0 && (
                          <div>
                            <span className="text-[10px] text-white/40 font-bold block mb-1.5 uppercase">
                              All Visit Photos ({v.photos.all.length})
                            </span>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {v.photos.all.map((p) => (
                                <div key={p.id} className="w-16 flex-shrink-0 flex flex-col items-center">
                                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.url || ""} alt={p.kind} className="w-full h-full object-cover" />
                                  </div>
                                  <span className="text-[8px] text-white/50 mt-1 capitalize">
                                    {p.angle || p.kind}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
