"use client";

// Salon owner's Service Menu manager.
//  • Lists the salon's services grouped by category (from /api/salon/menu).
//  • Add / edit / delete a single service.
//  • Import: paste the rate card, let AI (Groq — not Claude) structure it,
//    preview, then save. Deterministic parser is the offline fallback.

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { MENU_KINDS, TARGET_TAGS, type MenuServiceRow } from "@/lib/salonMenuDb";
import type { MenuKind, PriceVariant } from "@/lib/salonMenu";

type Draft = {
  slug?: string;
  name: string;
  category: string;
  section: string;
  kind: MenuKind;
  gender: "women" | "men" | "unisex";
  targets: string[];
  variants: PriceVariant[];
  note: string;
};

const EMPTY_DRAFT: Draft = {
  name: "", category: "", section: "", kind: "treatment", gender: "unisex",
  targets: [], variants: [{ label: "", price: 0, memberPrice: undefined, lengthBand: "any" }], note: "",
};

const card = { background: "var(--bg-card)", border: "1px solid var(--border)" };

export default function MenuManagerPage() {
  const [services, setServices] = useState<MenuServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salon/menu");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setServices(data.services ?? []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const g = new Map<string, MenuServiceRow[]>();
    for (const s of services) {
      if (!g.has(s.category)) g.set(s.category, []);
      g.get(s.category)!.push(s);
    }
    return [...g.entries()];
  }, [services]);

  const activeCount = services.filter((s) => s.active).length;

  async function remove(slug: string, name: string) {
    if (!confirm(`Remove "${name}" from the menu?`)) return;
    const res = await fetch(`/api/salon/menu?slug=${encodeURIComponent(slug)}&hard=1`, { method: "DELETE" });
    if (res.ok) load(); else alert("Delete failed");
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-black gradient-text-animated">Service Menu</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {loading ? "Loading…" : `${activeCount} services · powers customer recommendations`}
        </p>
      </div>

      <div className="px-5 flex gap-2 mb-5">
        <button onClick={() => setEditing({ ...EMPTY_DRAFT })}
          className="px-4 py-2 rounded-full text-xs font-bold active:scale-95 transition"
          style={{ background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000" }}>
          + Add service
        </button>
        <button onClick={() => setShowImport(true)}
          className="px-4 py-2 rounded-full text-xs font-bold active:scale-95 transition"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          ⇪ Import menu
        </button>
      </div>

      {err && (
        <div className="mx-5 mb-4 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(224,106,92,0.1)", border: "1px solid rgba(224,106,92,0.3)", color: "#fca5a5" }}>
          {err}
        </div>
      )}

      {!loading && services.length === 0 && !err && (
        <div className="mx-5 rounded-2xl p-6 text-center text-xs" style={{ ...card, color: "var(--text-muted)" }}>
          No services yet. Add one, or import your rate card.
        </div>
      )}

      <div className="px-5 flex flex-col gap-6">
        {grouped.map(([category, rows]) => (
          <div key={category}>
            <h2 className="text-sm font-black mb-2" style={{ color: "var(--text-primary)" }}>{category}</h2>
            <div className="rounded-2xl overflow-hidden" style={card}>
              {rows.map((s, i) => (
                <div key={s.id} className="px-4 py-3 flex items-start justify-between gap-3"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", opacity: s.active ? 1 : 0.45 }}>
                  <div className="min-w-0">
                    <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {s.section ? `${s.section} · ` : ""}{s.kind}
                      {s.targets.length > 0 ? ` · ${s.targets.join(", ")}` : ""}
                    </p>
                    <p className="text-[11px] mt-1 font-semibold" style={{ color: "var(--accent)" }}>
                      {s.variants.map((v) => `${v.label ? v.label + " " : ""}₹${v.price}${v.memberPrice ? `/₹${v.memberPrice}` : ""}`).join("  ·  ")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditing(toDraft(s))} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>Edit</button>
                    <button onClick={() => remove(s.slug, s.name)} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: "rgba(224,106,92,0.12)", color: "#fca5a5" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editing && <ServiceEditor draft={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
        {showImport && <ImportPanel onClose={() => setShowImport(false)} onSaved={() => { setShowImport(false); load(); }} />}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function toDraft(s: MenuServiceRow): Draft {
  return {
    slug: s.slug, name: s.name, category: s.category, section: s.section ?? "",
    kind: s.kind, gender: s.gender, targets: s.targets, variants: s.variants.length ? s.variants : [{ label: "", price: 0, lengthBand: "any" }], note: s.note ?? "",
  };
}

// ── Single-service editor ─────────────────────────────────────────────────────
function ServiceEditor({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const setVariant = (i: number, patch: Partial<PriceVariant>) =>
    setD((p) => ({ ...p, variants: p.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  async function save() {
    if (!d.name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    const res = await fetch("/api/salon/menu", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: d }),
    });
    setSaving(false);
    if (res.ok) onSaved(); else alert((await res.json()).error ?? "Save failed");
  }

  return (
    <Sheet onClose={onClose} title={draft.slug ? "Edit service" : "Add service"}>
      <Field label="Name"><input value={d.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} placeholder="e.g. Deep Hydration Ritual" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Category"><input value={d.category} onChange={(e) => set("category", e.target.value)} style={inputStyle} placeholder="Hair Care Protocols" /></Field>
        <Field label="Section"><input value={d.section} onChange={(e) => set("section", e.target.value)} style={inputStyle} placeholder="Biolage Rituals" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type"><select value={d.kind} onChange={(e) => set("kind", e.target.value as MenuKind)} style={inputStyle}>{MENU_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></Field>
        <Field label="Gender"><select value={d.gender} onChange={(e) => set("gender", e.target.value as Draft["gender"])} style={inputStyle}><option value="women">women</option><option value="men">men</option><option value="unisex">unisex</option></select></Field>
      </div>

      <Field label="Prices">
        <div className="flex flex-col gap-2">
          {d.variants.map((v, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} placeholder="label" style={{ ...inputStyle, flex: 1.2 }} />
              <input type="number" value={v.price || ""} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} placeholder="₹" style={{ ...inputStyle, width: 70 }} />
              <input type="number" value={v.memberPrice ?? ""} onChange={(e) => setVariant(i, { memberPrice: e.target.value ? Number(e.target.value) : undefined })} placeholder="member" style={{ ...inputStyle, width: 70 }} />
              <select value={v.lengthBand} onChange={(e) => setVariant(i, { lengthBand: e.target.value as PriceVariant["lengthBand"] })} style={{ ...inputStyle, width: 80 }}>
                <option value="any">any</option><option value="short">short</option><option value="medium">medium</option><option value="long">long</option>
              </select>
              {d.variants.length > 1 && <button onClick={() => set("variants", d.variants.filter((_, j) => j !== i))} style={{ color: "#fca5a5" }}>✕</button>}
            </div>
          ))}
          <button onClick={() => set("variants", [...d.variants, { label: "", price: 0, lengthBand: "any" }])}
            className="text-[11px] self-start px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>+ price tier</button>
        </div>
      </Field>

      <Field label="Treats / good for (recommendation tags)">
        <div className="flex flex-wrap gap-1.5">
          {TARGET_TAGS.map((t) => {
            const on = d.targets.includes(t);
            return (
              <button key={t} onClick={() => set("targets", on ? d.targets.filter((x) => x !== t) : [...d.targets, t])}
                className="text-[10px] px-2 py-1 rounded-full font-semibold"
                style={on ? { background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000" } : { background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {t}
              </button>
            );
          })}
        </div>
      </Field>

      <button onClick={save} disabled={saving}
        className="mt-2 w-full py-3 rounded-xl font-bold text-sm active:scale-95 transition"
        style={{ background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving…" : "Save service"}
      </button>
    </Sheet>
  );
}

// ── Import panel ──────────────────────────────────────────────────────────────
type PreviewSvc = { name: string; category: string; section?: string | null; kind: string; targets: string[]; variants: PriceVariant[] };

function ImportPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [gender, setGender] = useState<"women" | "men" | "unisex">("women");
  const [mode, setMode] = useState<"ai" | "rules">("ai");
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewSvc[] | null>(null);
  const [source, setSource] = useState<string>("");
  const [skipped, setSkipped] = useState<string[]>([]);

  async function run(dryRun: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/salon/menu/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, gender, mode, dryRun, replace }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Import failed"); return; }
      if (dryRun) { setPreview(data.services); setSource(data.source); setSkipped(data.skipped ?? []); }
      else onSaved();
    } finally { setBusy(false); }
  }

  return (
    <Sheet onClose={onClose} title="Import menu">
      <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
        Paste your rate card as text. AI mode uses Groq (not Claude) to structure it; Rules mode parses it offline.
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7}
        placeholder={"HAIRCUTS\nBasic Cut with blast dry 419 349\nBIOLAGE RITUALS\nDeep Hydration Ritual\nUpto Medium Length 1559 1299\nLong 1799 1499"}
        style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11, lineHeight: 1.5 }} />

      <div className="grid grid-cols-3 gap-2 mt-2">
        <Field label="Gender"><select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} style={inputStyle}><option value="women">women</option><option value="men">men</option><option value="unisex">unisex</option></select></Field>
        <Field label="Engine"><select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} style={inputStyle}><option value="ai">AI (Groq)</option><option value="rules">Rules</option></select></Field>
        <Field label="Replace all"><select value={replace ? "y" : "n"} onChange={(e) => setReplace(e.target.value === "y")} style={inputStyle}><option value="n">No</option><option value="y">Yes</option></select></Field>
      </div>

      <button onClick={() => run(true)} disabled={busy || text.trim().length < 5}
        className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm active:scale-95 transition"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-primary)", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Reading…" : "Preview"}
      </button>

      {preview && (
        <div className="mt-3">
          <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
            Read {preview.length} services via <b>{source}</b>{skipped.length ? ` · ${skipped.length} skipped` : ""}.
          </p>
          <div className="rounded-xl overflow-hidden max-h-52 overflow-y-auto" style={card}>
            {preview.map((s, i) => (
              <div key={i} className="px-3 py-2" style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <p className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {s.category}{s.section ? ` · ${s.section}` : ""} · {s.kind} · {s.variants.map((v) => `₹${v.price}`).join("/")}
                </p>
              </div>
            ))}
          </div>
          <button onClick={() => run(false)} disabled={busy}
            className="mt-3 w-full py-3 rounded-xl font-bold text-sm active:scale-95 transition"
            style={{ background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Saving…" : `Save ${preview.length} services${replace ? " (replace existing)" : ""}`}
          </button>
        </div>
      )}
    </Sheet>
  );
}

// ── shared bits ───────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 10, fontSize: 12,
  background: "var(--bg-elevated, rgba(255,255,255,0.03))", border: "1px solid var(--border)", color: "var(--text-primary)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-2">
      <span className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[88vh] overflow-y-auto"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} className="text-xl" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
