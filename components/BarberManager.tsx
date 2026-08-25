"use client";

import { useEffect, useRef, useState } from "react";

type Barber = {
  id: string; name: string; phone: string | null; email: string | null;
  photoUrl: string | null; cutsToday: number;
};

// Downscale a barber photo before upload — same idea as the reference board.
async function compress(file: File, maxDim = 512, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width >= height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
  else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function BarberManager() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // New-barber form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); // data URI preview
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const pickPhoto = async (file: File | undefined) => {
    if (!file?.type.startsWith("image/")) return;
    setPhoto(await compress(file));
  };

  const reset = () => { setName(""); setPhone(""); setEmail(""); setPhoto(null); setError(null); setAdding(false); };

  const create = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, email,
          photoBase64: photo ? photo.split(",")[1] : undefined,
          photoMediaType: photo ? "image/jpeg" : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Could not add barber"); return; }
      setBarbers((prev) => [...prev, body.barber].sort((a, b) => a.name.localeCompare(b.name)));
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Barbers</p>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-transform"
            style={{ background: "var(--accent)", color: "#000" }}>+ New barber</button>
        )}
      </div>

      {/* New-barber form */}
      {adding && (
        <div className="card p-4 mb-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => fileInput.current?.click()}
              className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden shrink-0"
              style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border-bright)", color: "var(--text-muted)" }}>
              {photo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={photo} alt="barber" className="w-full h-full object-cover" />
                : <span className="text-[10px] text-center leading-tight">Add<br/>photo</span>}
            </button>
            <div className="flex-1">
              <input type="text" placeholder="Barber name *" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <input type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-[11px]" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={create} disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
              style={{ background: "var(--accent)", color: "#000", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Saving…" : "Save barber"}
            </button>
            <button onClick={reset} disabled={busy}
              className="px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>Cancel</button>
          </div>
          <input ref={fileInput} type="file" accept="image/*" className="hidden"
            onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      )}

      {/* Barber list */}
      <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
        {loading ? (
          <div className="p-4 text-center"><div className="spinner" style={{ width: 20, height: 20, margin: "0 auto" }} /></div>
        ) : barbers.length === 0 ? (
          <div className="p-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>No barbers yet. Add one above.</div>
        ) : (
          barbers.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-4">
              <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                {b.photoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={b.photoUrl} alt={b.name} className="w-full h-full object-cover" />
                  : (b.name[0]?.toUpperCase() ?? "?")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{b.name}</p>
                <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                  {[b.phone, b.email].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                style={{ background: b.cutsToday > 0 ? "rgba(79,214,156,0.12)" : "var(--bg-subtle)", color: b.cutsToday > 0 ? "#4FD69C" : "var(--text-muted)" }}>
                {b.cutsToday} {b.cutsToday === 1 ? "cut" : "cuts"} today
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
