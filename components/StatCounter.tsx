"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  value: number | string | null;
  /** Small line under the value — trend, count, or context. */
  sub?: string;
  accent?: string;
  /** Live pulse dot, for the "in session" counter. */
  live?: boolean;
  loading?: boolean;
};

/**
 * Counts up to the value rather than snapping to it, so an increment after a
 * scan is visible instead of silently changing between renders.
 */
function useCountUp(target: number, enabled: boolean) {
  const [display, setDisplay] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    if (!enabled) { setDisplay(target); previous.current = target; return; }

    const from = previous.current;
    const to = target;
    previous.current = target;
    if (from === to) { setDisplay(to); return; }

    // requestAnimationFrame is paused while the tab is hidden, so the count-up
    // would freeze mid-way and the number would read wrong. Snap to the final
    // value instead — correctness beats the animation.
    if (typeof document !== "undefined" && document.hidden) {
      setDisplay(to);
      return;
    }

    const duration = 550;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out: fast at first, settles gently on the final number
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    // Backstop: if rAF never delivers a final frame (throttled/backgrounded),
    // guarantee the value lands after the animation window.
    const settle = setTimeout(() => setDisplay(to), duration + 100);

    return () => { cancelAnimationFrame(frame); clearTimeout(settle); };
  }, [target, enabled]);

  return display;
}

export default function StatCounter({
  label, value, sub, accent = "#8FA79A", live = false, loading = false,
}: Props) {
  const isNumeric = typeof value === "number";
  const counted = useCountUp(isNumeric ? value : 0, isNumeric);

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: `${accent}0D`, border: `1px solid ${accent}1F` }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <p className="section-label">{label}</p>
        {live && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
        )}
      </div>

      <p
        className="text-3xl font-black leading-none tabular-nums"
        style={{ color: accent }}
      >
        {loading ? "—" : isNumeric ? counted.toLocaleString("en-IN") : (value ?? "—")}
      </p>

      {sub && !loading && (
        <p className="text-[10px] mt-1.5" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
