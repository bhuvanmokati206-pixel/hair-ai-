"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type CapturedPhoto = {
  base64: string;
  mediaType: "image/jpeg";
  label: string;
  preview: string;
};

type Props = {
  onComplete: (photos: CapturedPhoto[]) => void;
};

const ANGLES = [
  {
    id: "front",
    label: "Front",
    emoji: "🧑",
    color: "#f97316",
    instruction: "Face the camera directly",
    sub: "Look straight ahead — both ears visible",
  },
  {
    id: "left",
    label: "Left Side",
    emoji: "👈",
    color: "#22d3ee",
    instruction: "Turn to show your LEFT side",
    sub: "We measure hair length from ear to tip",
  },
  {
    id: "right",
    label: "Right Side",
    emoji: "👉",
    color: "#a855f7",
    instruction: "Turn to show your RIGHT side",
    sub: "Let the hair fall naturally",
  },
  {
    id: "back",
    label: "Back",
    emoji: "🔄",
    color: "#22c55e",
    instruction: "Turn around — show the BACK",
    sub: "Most important shot for density",
  },
];

export default function CameraCapture({ onComplete }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  const [step, setStep]               = useState<"home" | "camera" | "upload">("home");
  const [currentAngle, setCurrentAngle] = useState(0);
  const [photos, setPhotos]           = useState<CapturedPhoto[]>([]);
  const [flash, setFlash]             = useState(false);
  const [tick, setTick]               = useState(false); // brief ✓ after capture
  const [videoReady, setVideoReady]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);

  const angle = ANGLES[currentAngle];

  // ── Attach stream after camera UI renders ──────────────────────
  useEffect(() => {
    if (!pendingStream || step !== "camera") return;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = pendingStream;
    streamRef.current = pendingStream;
    video.play().catch(() => {});
    setPendingStream(null);
  }, [pendingStream, step]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVideoReady(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Open camera (one session for all 4 shots) ──────────────────
  const openCamera = useCallback(async () => {
    setError(null);
    setCurrentAngle(0);
    setPhotos([]);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.location.protocol === "http:" && !window.location.hostname.includes("localhost")
          ? "Camera blocked on HTTP. Connect phone via USB and use http://localhost:3000, or tap Upload instead."
          : "Camera not available. Use Upload instead."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStep("camera");
      setPendingStream(stream);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("NotAllowed") || msg.includes("Permission")
          ? "Camera permission denied — tap Upload instead."
          : "Could not open camera. Tap Upload instead."
      );
    }
  }, []);

  // ── Capture one photo, then advance angle ──────────────────────
  const capturePhoto = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoReady) return;

    const w = video.videoWidth  || 640;
    const h = video.videoHeight || 480;
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror for front/side shots
    if (angle.id !== "back") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    const base64  = dataUrl.split(",")[1];
    if (!base64 || base64.length < 500) return;

    const photo: CapturedPhoto = {
      base64,
      mediaType: "image/jpeg",
      label: angle.id,
      preview: dataUrl,
    };

    // Flash + tick animation
    setFlash(true);
    setTick(true);
    setTimeout(() => setFlash(false), 200);

    const newPhotos = [...photos, photo];
    setPhotos(newPhotos);

    if (currentAngle < ANGLES.length - 1) {
      setTimeout(() => {
        setTick(false);
        setCurrentAngle((i) => i + 1);

        // Only switch cameras for the back shot (angle 2 → 3)
        // For all other transitions the stream is still live — no reset needed
        if (currentAngle === 2 && streamRef.current) {
          setVideoReady(false); // back camera needs to load fresh
          streamRef.current.getTracks().forEach((t) => t.stop());
          navigator.mediaDevices
            .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
            .then((newStream) => {
              streamRef.current = newStream;
              if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                videoRef.current.play().catch(() => {});
                // onCanPlay will fire and set videoReady = true
              }
            })
            .catch(() => {
              // Back camera unavailable — keep front camera and mark ready
              setVideoReady(true);
            });
        }
        // angles 0→1 and 1→2: stream keeps playing, already ready
      }, 600);
    } else {
      // All 4 done
      setTimeout(() => {
        stopCamera();
        setStep("home");
        onComplete(newPhotos);
      }, 600);
    }
  }, [angle.id, currentAngle, photos, videoReady, stopCamera, onComplete]);

  // ── Upload flow — picks photos one by one ─────────────────────
  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const photo: CapturedPhoto = {
          base64: dataUrl.split(",")[1],
          mediaType: "image/jpeg",
          label: ANGLES[currentAngle].id,
          preview: dataUrl,
        };
        const newPhotos = [...photos, photo];
        setPhotos(newPhotos);

        if (currentAngle < ANGLES.length - 1) {
          setCurrentAngle((i) => i + 1);
          setTimeout(() => fileInputRef.current?.click(), 300);
        } else {
          setStep("home");
          onComplete(newPhotos);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [currentAngle, photos, onComplete]
  );

  // ── HOME SCREEN ────────────────────────────────────────────────
  if (step === "home") {
    return (
      <div className="flex flex-col min-h-screen bg-[#0d0d0d] px-4 pb-10">
        {/* Header */}
        <div className="pt-10 pb-8 text-center">
          <h1 className="text-4xl font-black gradient-text mb-1">Hair AI</h1>
          <p className="text-gray-400 text-sm">Professional hairstyle analyser</p>
        </div>

        {/* Instruction card */}
        <div className="rounded-3xl p-5 mb-6" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff12" }}>
          <p className="text-white font-bold text-base mb-4">We'll take 4 quick photos:</p>
          <div className="space-y-3">
            {ANGLES.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: a.color + "20", border: `1.5px solid ${a.color}50` }}>
                  {a.emoji}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{a.label}</p>
                  <p className="text-gray-500 text-xs">{a.sub}</p>
                </div>
                <div className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-gray-600"
                  style={{ border: "1.5px solid #333" }}>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-2xl p-3 text-red-300 text-sm text-center mb-4">
            {error}
          </div>
        )}

        {/* CTA buttons */}
        <button
          onClick={openCamera}
          className="w-full py-5 rounded-2xl font-black text-xl text-white mb-3 active:scale-95 transition-transform flex items-center justify-center gap-3"
          style={{ background: "linear-gradient(135deg, #f97316, #facc15)" }}
        >
          <span className="text-2xl">📷</span> Start Camera
        </button>

        <button
          onClick={() => { setCurrentAngle(0); setPhotos([]); setStep("upload"); fileInputRef.current?.click(); }}
          className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 active:scale-95 transition-transform"
          style={{ background: "transparent", border: "2px solid #ffffff20", color: "#aaa" }}
        >
          <span>📁</span> Upload Photos Instead
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    );
  }

  // ── CAMERA SCREEN ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Flash overlay */}
      {flash && <div className="absolute inset-0 bg-white z-50 pointer-events-none" style={{ opacity: 0.7 }} />}

      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: angle.id !== "back" ? "scaleX(-1)" : "none" }}
        muted
        playsInline
        autoPlay
        onCanPlay={() => setVideoReady(true)}
        onLoadedMetadata={() => setVideoReady(true)}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-3 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => { stopCamera(); setStep("home"); }}
          className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white text-lg"
        >
          ✕
        </button>

        {/* Progress dots */}
        <div className="flex gap-2">
          {ANGLES.map((a, i) => (
            <div key={a.id} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: i < photos.length ? a.color : i === currentAngle ? a.color + "40" : "#33333380",
                border: `2px solid ${i <= currentAngle ? a.color : "#333"}`,
                color: i < photos.length ? "#000" : i === currentAngle ? a.color : "#666",
              }}>
              {i < photos.length ? "✓" : i + 1}
            </div>
          ))}
        </div>

        <div className="w-10" />
      </div>

      {/* Instruction overlay */}
      <div className="absolute top-28 left-4 right-4 z-10">
        {tick ? (
          <div className="bg-green-500/90 backdrop-blur-sm rounded-2xl px-4 py-4 text-center">
            <p className="text-white font-black text-2xl">✓ Got it!</p>
            {currentAngle < ANGLES.length - 1 && (
              <p className="text-green-100 text-sm mt-1">
                Now → {ANGLES[currentAngle + 1].instruction}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: angle.color }}>
              Photo {currentAngle + 1} of 4 — {angle.label}
            </p>
            <p className="text-white font-black text-xl">{angle.instruction}</p>
            <p className="text-gray-300 text-sm mt-1">{angle.sub}</p>
          </div>
        )}
      </div>

      {/* Bottom — capture button */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-12 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent pt-8">
        <button
          onClick={capturePhoto}
          disabled={!videoReady || tick}
          className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: videoReady && !tick ? angle.color : "#333",
            border: `4px solid ${videoReady && !tick ? "white" : "#555"}`,
            opacity: videoReady && !tick ? 1 : 0.5,
          }}
        >
          {tick ? (
            <span className="text-3xl">✓</span>
          ) : videoReady ? (
            <div className="w-12 h-12 rounded-full bg-white/30" />
          ) : (
            <div className="w-8 h-8 rounded-full border-3 border-white/40 border-t-white animate-spin" />
          )}
        </button>
        <p className="text-white/60 text-xs">
          {tick ? "" : videoReady ? "Tap to capture" : "Loading camera…"}
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
