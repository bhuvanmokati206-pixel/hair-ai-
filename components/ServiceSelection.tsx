"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// ── NOIR palette (from the imported design) ──────────────────────
const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: "#7C766C",
};

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
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="min-h-screen" style={{ background: "var(--bg)", color: INK, padding: "56px 22px calc(40px + env(safe-area-inset-bottom))" }}
    >
      <div style={{ marginBottom: 26 }}>
        <div style={MICRO}>Choose your services</div>
        <div style={{ marginTop: 10, fontSize: 26, fontWeight: 200, letterSpacing: ".04em" }}>What service do you want?</div>
        <div style={{ marginTop: 8, fontSize: 13, color: MUTE }}>Pick one or more — we&apos;ll show a combined look.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {options.map((o) => {
          const on = pick[o.key];
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => toggle(o.key)}
              style={{
                borderRadius: 20, padding: 18, textAlign: "left", cursor: "pointer", transition: "all .2s ease",
                background: on ? "linear-gradient(160deg, rgba(143,167,154,.16), rgba(23,22,20,.72))" : "rgba(23,22,20,.72)",
                border: `1px solid ${on ? "rgba(143,167,154,.5)" : "rgba(242,239,233,.09)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{o.icon}</span>
                <span style={{
                  width: 20, height: 20, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, transition: "all .2s ease",
                  background: on ? ACC : "transparent", color: "#14130F",
                  border: on ? "0" : "1px solid rgba(242,239,233,.24)",
                }}>{on ? "✓" : ""}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: on ? "#BFD2C7" : INK }}>{o.label}</div>
              <div style={{ marginTop: 3, fontSize: 11, color: MUTE }}>{o.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 32 }}>
        <div
          onClick={() => { if (anySelected && !busy) onContinue(pick); }}
          style={{
            height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: anySelected && !busy ? "pointer" : "default",
            fontSize: 11, fontWeight: anySelected ? 700 : 400, letterSpacing: ".2em", textTransform: "uppercase",
            background: anySelected && !busy ? "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)" : "rgba(242,239,233,.05)",
            color: anySelected && !busy ? "#14130F" : "#635E56",
            border: anySelected && !busy ? "0" : "1px solid rgba(242,239,233,.1)",
            boxShadow: anySelected && !busy ? "0 16px 34px -14px rgba(143,167,154,.6)" : "none",
          }}
        >
          {busy ? "Creating the look…" : anySelected ? "Show my look" : "Select a service"}
        </div>
      </div>
    </motion.div>
  );
}
