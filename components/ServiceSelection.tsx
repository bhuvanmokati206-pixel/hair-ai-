"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export type ServicePick = { hair: boolean; beard: boolean; colour: boolean; treatments: boolean };

type Option = { key: keyof ServicePick; label: string; icon: string; desc: string };

const MEN: Option[] = [
  { key: "hair",       label: "Hairstyle",  icon: "💇", desc: "A new haircut" },
  { key: "beard",      label: "Beard",      icon: "🧔", desc: "Beard shape / trim" },
  { key: "colour",     label: "Colour",     icon: "🎨", desc: "Hair colour" },
  { key: "treatments", label: "Other services", icon: "✨", desc: "Treatments & care" },
];
const WOMEN: Option[] = [
  { key: "hair",       label: "Haircut",    icon: "💇", desc: "A new haircut" },
  { key: "colour",     label: "Colour",     icon: "🎨", desc: "Hair colour" },
  { key: "treatments", label: "Other services", icon: "✨", desc: "Treatments & care" },
];

export default function ServiceSelection({
  gender, onContinue, busy,
}: {
  gender?: string;
  onContinue: (pick: ServicePick) => void;
  busy?: boolean;
}) {
  const isMale = (gender ?? "").toLowerCase().startsWith("m");
  const options = isMale ? MEN : WOMEN;
  const [pick, setPick] = useState<ServicePick>({ hair: false, beard: false, colour: false, treatments: false });

  const toggle = (k: keyof ServicePick) => setPick((p) => ({ ...p, [k]: !p[k] }));
  const anySelected = Object.values(pick).some(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col min-h-screen px-6 pt-14 pb-10" style={{ background: "var(--bg)" }}
    >
      <div className="mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5"
          style={{ background: "var(--accent-light)" }}>🪄</div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>What service do you want?</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Pick one or more — we&apos;ll show a combined look.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const on = pick[o.key];
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => toggle(o.key)}
              className="rounded-2xl p-4 text-left active:scale-[0.97] transition-all"
              style={
                on
                  ? { background: "linear-gradient(135deg, rgba(143,167,154,0.15), rgba(169,162,184,0.12))", border: "1.5px solid var(--accent)" }
                  : { background: "var(--bg-card)", border: "1px solid var(--border)" }
              }
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xl">{o.icon}</span>
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs"
                  style={on ? { background: "var(--accent)", color: "#000" } : { border: "1px solid var(--border-bright)" }}>
                  {on ? "✓" : ""}
                </span>
              </div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{o.label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{o.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-8">
        <button
          className="btn-primary"
          disabled={!anySelected || busy}
          style={{ opacity: !anySelected || busy ? 0.5 : 1 }}
          onClick={() => onContinue(pick)}
        >
          {busy ? "Creating the look…" : "✨ Show my look"}
        </button>
      </div>
    </motion.div>
  );
}
