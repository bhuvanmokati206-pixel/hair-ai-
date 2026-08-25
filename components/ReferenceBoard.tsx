"use client";

import { useRef, useState } from "react";
import type { SearchImage } from "@/app/api/hairstyle-search/route";

// A reference on the board: either a web image (url) or an uploaded photo (base64).
export type BoardRef = {
  id: string;
  thumb: string;
  url?: string;
  base64?: string;
  mediaType?: string;
};

type Props = {
  refs: BoardRef[];
  activeId: string | null;
  onAddSearch: (img: SearchImage) => void;
  onAddUpload: (r: { base64: string; mediaType: string }) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

// Downscale an uploaded reference so payloads stay small — same idea as
// CameraCapture's compressImage.
async function compress(file: File, maxDim = 900, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width >= height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
  else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function ReferenceBoard({ refs, activeId, onAddSearch, onAddUpload, onSelect, onRemove }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const json = e.dataTransfer.getData("application/json");
    if (json) {
      try { onAddSearch(JSON.parse(json) as SearchImage); } catch { /* ignore */ }
    }
  };

  const handleFiles = async (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await compress(file);
      const base64 = dataUrl.split(",")[1];
      onAddUpload({ base64, mediaType: "image/jpeg" });
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="rounded-2xl p-3 transition-colors"
        style={{
          background: dragOver ? "rgba(143,167,154,0.08)" : "var(--bg-card)",
          border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border-bright)"}`,
        }}
      >
        {refs.length === 0 ? (
          <button
            onClick={() => fileInput.current?.click()}
            className="w-full py-6 flex flex-col items-center gap-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="text-2xl">🖼️</span>
            <span className="text-xs font-semibold">Drop a hairstyle here, or tap to upload</span>
            <span className="text-[10px]">Search results, or a photo from the phone</span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {refs.map((r) => {
              const selected = r.id === activeId;
              return (
                <div key={r.id} className="relative aspect-square rounded-xl overflow-hidden"
                  style={{ border: selected ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                  <button onClick={() => onSelect(r.id)} className="w-full h-full active:scale-95 transition-transform">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.thumb} alt="reference" className="w-full h-full object-cover" />
                    {selected && (
                      <span className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: "var(--accent)", color: "#000" }}>✓</span>
                    )}
                  </button>
                  <button onClick={() => onRemove(r.id)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>✕</button>
                </div>
              );
            })}
            <button
              onClick={() => fileInput.current?.click()}
              className="aspect-square rounded-xl flex items-center justify-center"
              style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border-bright)", color: "var(--text-muted)" }}
            >
              <span className="text-lg">+</span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
