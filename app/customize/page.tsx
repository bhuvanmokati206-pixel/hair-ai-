"use client";

// Customize studio. Top: an interactive 3D mannequin head that reacts to the
// selection. Middle: Front / Side / Back catalog pickers + attribute controls →
// "Generate Custom Style" onto the customer. Bottom: an optional web-search +
// reference-board path that transfers a reference look instead.
//
// Cost model: browsing/selecting is free; only Generate/Apply costs one image.

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import HairstyleSearch from "@/components/HairstyleSearch";
import ReferenceBoard, { type BoardRef } from "@/components/ReferenceBoard";
import { downloadImage, imageFilename } from "@/lib/download";
import {
  TOP_STYLES, FADE_STYLES, BACK_STYLES, HAIR_COLORS, TEXTURES, VOLUMES,
  CustomizeState, DEFAULT_CUSTOMIZE_STATE, describeCustomization, Option,
} from "@/lib/customizeOptions";
import type { SearchImage } from "@/app/api/hairstyle-search/route";

// WebGL can't server-render — load the 3D head client-only.
const HeadPreview3D = dynamic(() => import("@/components/HeadPreview3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center"><div className="spinner-lg" /></div>,
});

const ANGLES = [
  { key: "front", label: "Front" },
  { key: "left",  label: "Left" },
  { key: "right", label: "Right" },
  { key: "back",  label: "Back" },
] as const;
type AngleKey = typeof ANGLES[number]["key"];

let refCounter = 0;
const newId = () => `ref-${Date.now()}-${refCounter++}`;

// Horizontal single-select row of labelled cards (icon/text — no photos yet).
function PickerRow({ title, icon, options, selectedId, onSelect }: {
  title: string; icon: string; options: Option[]; selectedId: string; onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-4">
      <p className="section-label mb-2">{title}</p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {options.map((o) => {
          const selected = o.id === selectedId;
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className="shrink-0 w-[74px] flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background: selected ? "rgba(143,167,154,0.12)" : "var(--bg-subtle)",
                  border: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
                }}>
                {icon}
              </div>
              <span className="text-[10px] font-semibold text-center leading-tight"
                style={{ color: selected ? "var(--accent)" : "var(--text-secondary)" }}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CustomizePage() {
  const router = useRouter();
  const currentSession = useStore((s) => s.currentSession);
  const currentVisitId = useStore((s) => s.currentVisitId);

  // Catalog selection
  const [state, setState] = useState<CustomizeState>(DEFAULT_CUSTOMIZE_STATE);
  const [reactKey, setReactKey] = useState(0);      // bumps the 3D head on any pick
  const [lit, setLit] = useState(true);
  const setField = <K extends keyof CustomizeState>(k: K, v: CustomizeState[K]) => {
    setState((s) => ({ ...s, [k]: v }));
    setReactKey((n) => n + 1);
  };

  // Shared target + result
  const [angle, setAngle] = useState<AngleKey>("front");
  const [results, setResults] = useState<Partial<Record<AngleKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference path
  const [refs, setRefs] = useState<BoardRef[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const photoFor = (a: AngleKey) => currentSession?.photos.find((p) => p.label === a);
  const hasAnyPhoto = (currentSession?.photos.length ?? 0) > 0;
  const targetPhoto = photoFor(angle);
  const activeRef = refs.find((r) => r.id === activeId) ?? null;
  const hairHex = HAIR_COLORS.find((c) => c.id === state.color)?.hex ?? "#3B2417";
  const volumeNorm = VOLUMES.indexOf(state.volume) / (VOLUMES.length - 1 || 1);

  const saveToVisit = (imageUrl: string, styleName: string) => {
    if (!currentVisitId) return;
    void fetch("/api/visit-photos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitId: currentVisitId,
        photos: [{ image: imageUrl, kind: "generated", angle, serviceType: "haircut", styleName, isHero: angle === "front" }],
      }),
    }).catch((e) => console.warn("[customize] save failed:", e));
  };

  // Catalog generate — combined Front+Side+Back+attributes onto the customer.
  const generateCatalog = async () => {
    if (!targetPhoto) { setError(`No ${angle} photo from this customer's scan.`); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/generate-hairstyle", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDescription: describeCustomization(state),
          styleName: TOP_STYLES.find((t) => t.id === state.topStyle)?.label ?? state.topStyle,
          hairColor: HAIR_COLORS.find((c) => c.id === state.color)?.label,
          hairTexture: state.texture,
          angle,
          photoBase64: targetPhoto.base64,
          photoMediaType: targetPhoto.mediaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResults((prev) => ({ ...prev, [angle]: data.imageUrl }));
      saveToVisit(data.imageUrl, "custom style");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally { setBusy(false); }
  };

  // Reference apply — transfer a reference look onto the customer.
  const applyReference = async () => {
    if (!activeRef) { setError("Pick a reference on the board first."); return; }
    if (!targetPhoto) { setError(`No ${angle} photo from this customer's scan.`); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/hair-transfer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetBase64: targetPhoto.base64, targetMediaType: targetPhoto.mediaType,
          referenceUrl: activeRef.url, referenceBase64: activeRef.base64, referenceMediaType: activeRef.mediaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      setResults((prev) => ({ ...prev, [angle]: data.imageUrl }));
      saveToVisit(data.imageUrl, "custom look");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally { setBusy(false); }
  };

  const addSearch = (img: SearchImage) => {
    const r: BoardRef = { id: newId(), thumb: img.thumb, url: img.url };
    setRefs((p) => [...p, r]); setActiveId(r.id);
  };
  const addUpload = ({ base64, mediaType }: { base64: string; mediaType: string }) => {
    const r: BoardRef = { id: newId(), thumb: `data:${mediaType};base64,${base64}`, base64, mediaType };
    setRefs((p) => [...p, r]); setActiveId(r.id);
  };
  const removeRef = (id: string) => { setRefs((p) => p.filter((r) => r.id !== id)); if (activeId === id) setActiveId(null); };

  const result = results[angle];

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-icon">←</button>
        <div>
          <p className="section-label">Customize studio</p>
          <h1 className="text-xl font-black gradient-text-animated">Your custom look</h1>
        </div>
      </div>

      {/* 3D interactive head */}
      <div className="mx-5 mb-3 rounded-3xl overflow-hidden relative"
        style={{ height: 280, background: "linear-gradient(160deg, rgba(143,167,154,0.10), rgba(169,162,184,0.06))", border: "1px solid var(--border)" }}>
        <HeadPreview3D hairColor={hairHex} volume={volumeNorm} lit={lit} reactKey={reactKey} />
        <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] pointer-events-none" style={{ color: "var(--text-muted)" }}>
          drag to rotate · tap to react
        </span>
        <button onClick={() => setLit((v) => !v)}
          className="absolute top-2 right-2 text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: lit ? "var(--accent)" : "var(--bg-subtle)", color: lit ? "#000" : "var(--text-secondary)" }}>
          ☀ Lighting {lit ? "on" : "off"}
        </button>
      </div>

      {!hasAnyPhoto && (
        <div className="mx-5 mb-3 rounded-xl px-4 py-2.5" style={{ background: "rgba(201,161,92,0.08)", border: "1px solid rgba(201,161,92,0.25)" }}>
          <p className="text-[11px]" style={{ color: "var(--warning, #C9A15C)" }}>
            No scan loaded — run a scan first so the look can apply to the customer&apos;s photo.
          </p>
        </div>
      )}

      {/* Attribute controls */}
      <div className="px-5 mb-4">
        <p className="section-label mb-2">Hair colour</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {HAIR_COLORS.map((c) => (
            <button key={c.id} onClick={() => setField("color", c.id)}
              className="w-8 h-8 rounded-full active:scale-90 transition-transform"
              style={{ background: c.hex, border: state.color === c.id ? "2.5px solid var(--accent)" : "1px solid var(--border)" }}
              title={c.label} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="section-label mb-1.5">Hair type</p>
            <div className="flex gap-1.5 flex-wrap">
              {TEXTURES.map((t) => (
                <button key={t} onClick={() => setField("texture", t)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                  style={state.texture === t
                    ? { background: "var(--accent)", color: "#000" }
                    : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="section-label mb-1.5">Volume</p>
            <div className="flex gap-1.5">
              {VOLUMES.map((v) => (
                <button key={v} onClick={() => setField("volume", v)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-bold"
                  style={state.volume === v
                    ? { background: "var(--accent)", color: "#000" }
                    : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Catalog pickers */}
      <div className="px-5">
        <PickerRow title="Front hairstyles" icon="💇" options={TOP_STYLES}  selectedId={state.topStyle}  onSelect={(id) => setField("topStyle", id)} />
        <PickerRow title="Side profiles"    icon="✂️" options={FADE_STYLES} selectedId={state.fadeStyle} onSelect={(id) => setField("fadeStyle", id)} />
        <PickerRow title="Back hairstyles"  icon="🔄" options={BACK_STYLES} selectedId={state.backStyle} onSelect={(id) => setField("backStyle", id)} />
      </div>

      {/* Angle target */}
      <div className="px-5 mt-1 mb-3">
        <p className="section-label mb-2">Apply to angle</p>
        <div className="flex gap-2">
          {ANGLES.map((a) => {
            const disabled = !photoFor(a.key);
            return (
              <button key={a.key} onClick={() => setAngle(a.key)} disabled={disabled}
                className="flex-1 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all"
                style={angle === a.key
                  ? { background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000" }
                  : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: disabled ? 0.4 : 1 }}>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result */}
      {(result || busy) && (
        <div className="mx-5 mb-3 rounded-2xl overflow-hidden relative" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", aspectRatio: "3/4" }}>
          {busy ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div className="spinner-lg" /><span className="text-xs" style={{ color: "var(--text-secondary)" }}>Generating…</span>
            </div>
          ) : result ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="result" className="w-full h-full object-cover object-top" />
              <button onClick={() => downloadImage(result, imageFilename("custom-look", angle))}
                className="absolute bottom-2 right-2 h-8 px-2.5 rounded-full flex items-center gap-1 text-white text-[11px] font-bold"
                style={{ background: "var(--accent)" }}>Save</button>
            </>
          ) : null}
        </div>
      )}

      {error && <p className="mx-5 mb-2 text-[11px] rounded-lg px-3 py-2" style={{ background: "rgba(224,106,92,0.08)", color: "var(--danger)" }}>{error}</p>}

      <div className="px-5">
        <motion.button whileTap={{ scale: 0.98 }} onClick={generateCatalog} disabled={busy || !targetPhoto}
          className="w-full btn-primary" style={{ opacity: busy || !targetPhoto ? 0.5 : 1 }}>
          {busy ? "Generating…" : "✦ Generate custom style"}
        </motion.button>
      </div>

      {/* Reference path */}
      <div className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>or use a reference photo</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
        <div className="mb-3"><HairstyleSearch onAdd={addSearch} /></div>
        <ReferenceBoard refs={refs} activeId={activeId} onAddSearch={addSearch} onAddUpload={addUpload} onSelect={setActiveId} onRemove={removeRef} />
        <button onClick={applyReference} disabled={busy || !activeRef || !targetPhoto}
          className="w-full mt-3 py-3 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-bright)", color: "var(--text-primary)", opacity: busy || !activeRef || !targetPhoto ? 0.5 : 1 }}>
          Apply reference to customer
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
