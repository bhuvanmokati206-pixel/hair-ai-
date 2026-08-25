"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type InProgress = {
  id: string;
  created_at: string;
  status: string;
  chosen_style: string | null;
  service_type: string;
  customerName: string;
  barberName: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  scanning: "Scanning", choosing: "Choosing", in_progress: "In the chair",
};

function elapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * The park-and-resume queue. Owner starts a customer, parks them here, moves to
 * the next. "Done" checks a customer out and fires the WhatsApp automation.
 *
 * onChange lets the parent (dashboard) refresh its counters when a checkout
 * moves a visit from "in session" to "completed".
 */
export default function InProgressStrip({ onChange }: { onChange?: () => void }) {
  const router = useRouter();
  const [visits, setVisits] = useState<InProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/visit/in-progress");
      const body = await res.json();
      if (res.ok) setVisits(body.visits ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // "Done" now opens the billing page — the bill's Finalize is what actually
  // completes the visit (sets ended_at, queues WhatsApp). No direct checkout here.
  const markDone = (id: string) => {
    router.push(`/bill/${id}`);
  };

  if (loading) return null;
  if (visits.length === 0) return null;

  return (
    <div className="px-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>In progress</h2>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(79,214,156,0.12)", color: "#4FD69C" }}>
          {visits.length} active
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {visits.map((v) => (
            <motion.div
              key={v.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="rounded-2xl p-3.5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      {v.customerName}
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(143,167,154,0.1)", color: "var(--accent)" }}>
                      {STATUS_LABEL[v.status] ?? v.status}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                    {v.chosen_style ?? "no style yet"}
                    {v.barberName ? ` · ${v.barberName}` : ""} · {elapsed(v.created_at)}
                  </p>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => router.push(`/scan?resume=${v.id}`)}
                    className="px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
                  >
                    Resume
                  </button>
                  {/* Done → billing page, which finalizes and completes the visit. */}
                  <button
                    onClick={() => markDone(v.id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                    style={{ background: "rgba(79,214,156,0.12)", color: "#4FD69C" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
