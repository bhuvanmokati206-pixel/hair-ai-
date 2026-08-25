"use client";

import { useState } from "react";

// Standalone test page for Step 1 of the segmentation pipeline (hair masking).
// Not linked from the app nav — visit /debug-hair-mask directly to verify
// mask quality on a real photo before face-lock + inpainting get built on top.
export default function DebugHairMaskPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustmentFactor, setAdjustmentFactor] = useState(0);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const compressImage = async (file: File, maxDim = 1024, quality = 0.85): Promise<string> => {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    let width = bitmap.width;
    let height = bitmap.height;
    if (width >= height && width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else if (height > maxDim) {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); throw new Error("Canvas not available"); }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", quality);
  };

  const runMask = async (base64: string, factor: number) => {
    setLoading(true);
    setError(null);
    setMaskUrl(null);
    try {
      const res = await fetch("/api/debug-hair-mask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoBase64: base64,
          photoMediaType: "image/jpeg",
          adjustmentFactor: factor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mask generation failed");
      setMaskUrl(data.maskUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    const base64 = dataUrl.split(",")[1];
    setPreview(dataUrl);
    setPhotoBase64(base64);
    await runMask(base64, adjustmentFactor);
  };

  const handleRerun = () => {
    if (photoBase64) runMask(photoBase64, adjustmentFactor);
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Hair Mask Debug — Step 1</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Upload a real test photo. White = detected hair. Tune the adjustment factor and re-run to
        check hairline boundary quality before this gets wired into face-lock + inpainting.
      </p>

      <input type="file" accept="image/*" onChange={handleFile} style={{ marginBottom: 16 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <label style={{ fontSize: 13 }}>
          Adjustment factor: <b>{adjustmentFactor}</b> (negative = shrink mask, positive = grow it)
        </label>
        <input
          type="range"
          min={-30}
          max={30}
          value={adjustmentFactor}
          onChange={(e) => setAdjustmentFactor(Number(e.target.value))}
        />
        <button
          onClick={handleRerun}
          disabled={!photoBase64 || loading}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #333", background: "#fff" }}
        >
          Re-run
        </button>
      </div>

      {error && <p style={{ color: "crimson", marginBottom: 12 }}>{error}</p>}
      {loading && <p style={{ marginBottom: 12 }}>Generating mask…</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Original</p>
          {preview && <img src={preview} alt="original" style={{ width: "100%", borderRadius: 8 }} />}
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Hair mask</p>
          {maskUrl && <img src={maskUrl} alt="mask" style={{ width: "100%", borderRadius: 8, background: "#222" }} />}
        </div>
      </div>
    </div>
  );
}
