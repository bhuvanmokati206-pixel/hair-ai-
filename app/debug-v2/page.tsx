"use client";

import { useState } from "react";

// End-to-end test page for the full v2 pipeline:
// Segment → Inpaint → Face Lock → Output
// Visit /debug-v2 to verify on real photos before wiring into the main app.
export default function DebugV2Page() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleName, setStyleName] = useState("undercut");
  const [hairColor, setHairColor] = useState("natural");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const compressImage = async (file: File): Promise<string> => {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    let { width, height } = bitmap;
    const maxDim = 768;
    if (width >= height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
    else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    setPreview(dataUrl);
    setPhotoBase64(dataUrl.split(",")[1]);
    setResult(null);
    setError(null);
  };

  const runPipeline = async () => {
    if (!photoBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/generate-hairstyle-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleName,
          hairColor,
          photoBase64,
          photoMediaType: "image/jpeg",
          editTarget: "hair",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pipeline failed");
      setResult(data.imageUrl);
      setElapsed(Math.round((Date.now() - t0) / 1000));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>V2 Pipeline Test — Segment + Inpaint + Face Lock</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        Full 3-step pipeline. Face pixels are guaranteed identical to original — no AI drift possible.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <input type="file" accept="image/*" onChange={handleFile} />
        <input value={styleName} onChange={e => setStyleName(e.target.value)}
          placeholder="Style (e.g. undercut, mullet)" style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", width: 180 }} />
        <input value={hairColor} onChange={e => setHairColor(e.target.value)}
          placeholder="Colour (e.g. black, natural)" style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", width: 160 }} />
        <button onClick={runPipeline} disabled={!photoBase64 || loading}
          style={{ padding: "8px 20px", borderRadius: 8, background: loading ? "#ccc" : "#1a1a1a", color: "#fff", border: "none", fontWeight: 600, cursor: loading ? "default" : "pointer" }}>
          {loading ? "Running pipeline…" : "Generate"}
        </button>
      </div>

      {error && <p style={{ color: "crimson", marginBottom: 12 }}>{error}</p>}
      {elapsed && !loading && <p style={{ color: "#333", marginBottom: 12, fontSize: 13 }}>Completed in {elapsed}s</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Original</p>
          {preview && <img src={preview} alt="original" style={{ width: "100%", borderRadius: 10 }} />}
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Result (face locked)</p>
          {loading && <div style={{ aspectRatio: "1", background: "#f0f0f0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>Generating…</div>}
          {result && <img src={result} alt="result" style={{ width: "100%", borderRadius: 10 }} />}
        </div>
      </div>
    </div>
  );
}
