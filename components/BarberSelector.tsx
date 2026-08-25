"use client";

import { useEffect, useState } from "react";

type Barber = { id: string; name: string };

type Props = {
  value: string | null;
  onChange: (barberId: string | null) => void;
};

/**
 * "Who's cutting?" — a chip selector, not a login. One tap at scan time gives
 * per-barber attribution (and per-barber ratings) without every barber needing
 * their own account. See the earlier design note for why logins are the wrong
 * tool at salon scale.
 */
export default function BarberSelector({ value, onChange }: Props) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/barbers");
        const body = await res.json();
        if (res.ok) setBarbers(body.barbers ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addBarber = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Could not add"); return; }
      setBarbers((prev) => [...prev, body.barber].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(body.barber.id); // auto-select the one just added
      setNewName("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        Who&apos;s cutting?
      </label>

      {loading ? (
        <div className="h-10 rounded-xl" style={{ background: "var(--bg-subtle)" }} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {barbers.map((b) => {
            const selected = value === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onChange(selected ? null : b.id)}
                className="px-3.5 py-2 rounded-full text-xs font-bold active:scale-95 transition-all"
                style={
                  selected
                    ? { background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000" }
                    : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                }
              >
                {b.name}
              </button>
            );
          })}

          {adding ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addBarber(); }}
                placeholder="Barber name"
                autoFocus
                className="text-xs"
                style={{ width: 130, padding: "8px 12px" }}
              />
              <button type="button" onClick={addBarber} disabled={busy}
                className="px-3 py-2 rounded-full text-xs font-bold active:scale-95 transition-transform"
                style={{ background: "#4FD69C", color: "#fff", opacity: busy ? 0.6 : 1 }}>
                {busy ? "…" : "✓"}
              </button>
              <button type="button" onClick={() => { setAdding(false); setNewName(""); setError(null); }}
                className="px-3 py-2 rounded-full text-xs font-bold"
                style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="px-3.5 py-2 rounded-full text-xs font-bold active:scale-95 transition-transform"
              style={{ background: "transparent", border: "1px dashed var(--border-bright)", color: "var(--text-muted)" }}
            >
              + Add barber
            </button>
          )}
        </div>
      )}

      {error && <p className="text-[11px] mt-1.5" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
