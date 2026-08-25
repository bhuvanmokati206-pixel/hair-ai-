"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type CapturedPhoto = {
  base64: string;
  mediaType: "image/jpeg" | "image/png";
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
    color: "#4FD69C",
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
  // Camera only works in a secure context (https / localhost). On plain-HTTP
  // network access (phone over LAN) it is blocked by the browser — so we make
  // Upload the primary action there instead of the camera.
  const [cameraSupported, setCameraSupported] = useState(true);
  useEffect(() => {
    setCameraSupported(window.isSecureContext && !!navigator.mediaDevices?.getUserMedia);
  }, []);

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
    // Guard against capturing an empty/black frame before real pixels exist.
    if (video.readyState < 2 || video.videoWidth === 0) return;

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

        // Only attempt a rear-camera switch for the back shot (angle 2 → 3).
        // IMPORTANT: get the new stream FIRST, and only stop the old one if it
        // succeeds. On single-camera devices (laptops) the rear request fails —
        // in that case we keep the original stream alive instead of killing it.
        if (currentAngle === 2 && streamRef.current) {
          const oldStream = streamRef.current;
          navigator.mediaDevices
            .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
            .then((newStream) => {
              oldStream.getTracks().forEach((t) => t.stop());
              streamRef.current = newStream;
              if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                videoRef.current.play().catch(() => {});
                // onPlaying will fire and set videoReady = true
              }
            })
            .catch(() => {
              // Rear camera unavailable (e.g. laptop) — keep the front stream
              // running. It is still attached and live, so capture stays usable.
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

  // ── Upload flow — pick all 4 photos at once in a single picker ────
  // Browsers block re-opening a file picker programmatically (not a user
  // gesture), so we select every angle in one go and map them in order.
  // Phone photos are huge (several MB) — we downscale + re-encode them so the
  // request to the analysis API stays under its size limit (avoids HTTP 413).
  // Uses createImageBitmap with imageOrientation:"from-image" so EXIF rotation
  // from phone cameras is respected (otherwise photos come out sideways).
  // Small max dimension keeps 4 base64 images well under Groq's request limit.
  // Bigger, sharper input → sharper output. The model can't render detail it was
  // never given. 1280/0.82 keeps payloads reasonable while lifting quality.
  const compressImage = async (file: File, maxDim = 1280, quality = 0.82): Promise<string> => {
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

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).slice(0, ANGLES.length);
      e.target.value = "";
      if (files.length === 0) return;

      try {
        const newPhotos: CapturedPhoto[] = [];
        for (let i = 0; i < files.length; i++) {
          const dataUrl = await compressImage(files[i]);
          newPhotos.push({
            base64: dataUrl.split(",")[1],
            mediaType: "image/jpeg",
            label: ANGLES[i].id,
            preview: dataUrl,
          });
        }
        setPhotos(newPhotos);
        setStep("home");
        onComplete(newPhotos);
      } catch {
        setError("Could not read those photos — please try different images.");
      }
    },
    [onComplete]
  );

  // ── HOME SCREEN ────────────────────────────────────────────────
  if (step === "home") {
    return (
      <div className="flex flex-col min-h-screen px-4 pb-32" style={{ background: "var(--bg)" }}>
        {/* Header */}
        <div className="pt-12 pb-6 text-center">
          <h1 className="text-3xl font-black gradient-text-animated mb-1">Scan Hair</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>4-angle AI analysis · 60 seconds</p>
        </div>

        {/* Instruction card */}
        <div className="rounded-3xl p-5 mb-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="font-bold text-sm mb-4" style={{ color: "var(--text-primary)" }}>We&apos;ll take 4 quick photos:</p>
          <div className="space-y-3">
            {ANGLES.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: a.color + "18", border: `1px solid ${a.color}40` }}>
                  {a.emoji}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{a.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.sub}</p>
                </div>
                <div className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl p-3 text-sm text-center mb-4"
            style={{ background: "rgba(224,106,92,0.1)", border: "1px solid rgba(224,106,92,0.3)", color: "#E06A5C" }}>
            {error}
          </div>
        )}

        {!cameraSupported && (
          <div className="rounded-2xl p-3 text-xs text-center mb-4"
            style={{ background: "rgba(143,167,154,0.06)", border: "1px solid rgba(143,167,154,0.2)", color: "var(--text-secondary)" }}>
            📷 Camera needs HTTPS, so it&apos;s unavailable here. Use <span style={{ color: "var(--accent)", fontWeight: 700 }}>Upload</span> below — it works the same.
          </div>
        )}

        {/* CTA buttons — Upload becomes primary when the camera can't run */}
        <button
          onClick={() => { setPhotos([]); fileInputRef.current?.click(); }}
          className={`w-full rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform ${cameraSupported ? "py-3.5 text-sm mb-3" : "py-4 text-base mb-3"}`}
          style={cameraSupported
            ? { background: "transparent", border: "1px solid var(--border-bright)", color: "var(--text-secondary)" }
            : { background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 45%, #0EA5E9 100%)", color: "#fff", boxShadow: "0 0 24px rgba(99,102,241,0.4)" }}
        >
          <span className="text-xl">📁</span> Upload 4 Photos (front, left, right, back)
        </button>

        <button
          onClick={openCamera}
          className={`w-full rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform ${cameraSupported ? "py-4 font-black text-base" : "py-3 font-semibold text-sm"}`}
          style={cameraSupported
            ? { background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 45%, #0EA5E9 100%)", color: "#fff", boxShadow: "0 0 24px rgba(99,102,241,0.4)" }
            : { background: "transparent", border: "1px solid var(--border-bright)", color: "var(--text-muted)" }}
        >
          <span className="text-xl">📷</span> {cameraSupported ? "Start Camera" : "Camera (needs HTTPS)"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    );
  }

  // ── CAMERA SCREEN ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
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
        onPlaying={() => setVideoReady(true)}
        onCanPlay={() => setVideoReady(true)}
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
