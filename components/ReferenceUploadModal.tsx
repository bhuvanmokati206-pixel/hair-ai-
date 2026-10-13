"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReferenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { base64: string; mediaType: string }) => void;
  busy?: boolean;
}

export default function ReferenceUploadModal({
  isOpen,
  onClose,
  onSubmit,
  busy = false,
}: ReferenceUploadModalProps) {
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [preview, setPreview] = useState<{ base64: string; mediaType: string } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera access failed:", err);
      // Fallback to front camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
      } catch (fallbackErr) {
        setCameraError("Camera access denied or unavailable. Please use file upload.");
      }
    }
  };

  const handleModeSwitch = (newMode: "upload" | "camera") => {
    setMode(newMode);
    if (newMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const [header, base64] = dataUrl.split(";base64,");
    const mediaType = header.replace("data:", "");

    setPreview({ base64, mediaType });
    stopCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (JPEG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(";base64,");
      const mediaType = header.replace("data:", "");
      setPreview({ base64, mediaType });
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    stopCamera();
    setPreview(null);
    onClose();
  };

  const handleConfirm = () => {
    if (preview) {
      stopCamera();
      onSubmit(preview);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            background: "#14130F",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8FA79A]">Hairstyle Inspo</p>
              <h3 className="text-base font-black text-white">Upload Reference Photo</h3>
            </div>
            <button
              onClick={handleClose}
              disabled={busy}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-white/60 active:scale-90"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Mode Switch Tabs (if no preview selected) */}
            {!preview && (
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/5 border border-white/5">
                <button
                  type="button"
                  onClick={() => handleModeSwitch("upload")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    mode === "upload"
                      ? "bg-[#8FA79A] text-black shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  📁 Gallery / File
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch("camera")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    mode === "camera"
                      ? "bg-[#8FA79A] text-black shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  📷 Snap Photo
                </button>
              </div>
            )}

            {/* Preview Box */}
            {preview ? (
              <div className="space-y-3">
                <div className="w-full aspect-[4/5] max-h-72 rounded-2xl overflow-hidden border border-white/20 bg-black/60 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${preview.mediaType};base64,${preview.base64}`}
                    alt="Reference Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setPreview(null)}
                    disabled={busy}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 text-[10px] font-bold text-white/90 border border-white/20 hover:bg-black"
                  >
                    Change Photo
                  </button>
                </div>
                <p className="text-[11px] text-center text-white/60">
                  AI will analyze this haircut and generate it on the customer&apos;s face.
                </p>
              </div>
            ) : mode === "upload" ? (
              /* Upload Dropzone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-white/20 hover:border-[#8FA79A] bg-white/[0.02] hover:bg-white/[0.04] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all space-y-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[#8FA79A]/20 flex items-center justify-center text-2xl transition-colors">
                  📸
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-[#8FA79A]">
                    Tap to upload photo
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Pinterest, Instagram screenshot, or downloaded look
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* Live Camera Snap */
              <div className="space-y-3">
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-white/10 relative">
                  {cameraError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-xs text-red-300">
                      <p>{cameraError}</p>
                      <button
                        onClick={() => handleModeSwitch("upload")}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-white/10 text-white font-bold"
                      >
                        Switch to Upload
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={capturePhoto}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#8FA79A] text-black font-black text-xs shadow-lg active:scale-95 flex items-center gap-1.5"
                      >
                        <span>📸</span>
                        <span>Capture Reference</span>
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-center text-white/50">
                  Point camera at a poster, magazine, or screen with the desired haircut.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="flex-1 py-3 rounded-xl text-xs font-semibold text-white/60 hover:text-white bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!preview || busy}
                className="flex-2 py-3 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-[#F4F1EB] to-[#8FA79A] hover:opacity-95 active:scale-98 transition-all shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {busy ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    <span>Analyzing & Generating…</span>
                  </>
                ) : (
                  <>
                    <span>✦</span>
                    <span>Scan & Apply Hairstyle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
