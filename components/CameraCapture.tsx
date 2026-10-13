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

// ── NOIR palette (from the imported design) ──────────────────────
const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", color: "#7C766C",
};
const SAGE_BTN: React.CSSProperties = {
  background: "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)", color: "#14130F",
  boxShadow: "0 16px 34px -14px rgba(143,167,154,.6), inset 0 1px 0 rgba(255,255,255,.4)",
};
const GHOST_BTN: React.CSSProperties = {
  background: "rgba(242,239,233,.05)", color: INK, border: "1px solid rgba(242,239,233,.14)",
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
  const [flipError, setFlipError]     = useState<string | null>(null); // transient toast in camera view
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode]   = useState<"user" | "environment">("user");
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
    setFacingMode("user");

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
        video: { facingMode: "user", width: { ideal: 2560 }, height: { ideal: 1440 } },
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

  const flipCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const nextFacingMode = facingMode === "user" ? "environment" : "user";
    const base = { width: { ideal: 2560 }, height: { ideal: 1440 } };
    const open = (v: MediaTrackConstraints) =>
      navigator.mediaDevices.getUserMedia({ video: { ...base, ...v }, audio: false });

    // Remember the current lens's deviceId, then RELEASE it — some phones won't
    // hand over the other camera while the first is still live.
    const curDeviceId = streamRef.current?.getVideoTracks?.()[0]?.getSettings?.().deviceId;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVideoReady(false);

    // `exact` forces the switch — a plain `ideal` facingMode just re-hands the
    // camera that's already open, so the flip appeared to do nothing.
    let stream: MediaStream | null = null;
    try {
      stream = await open({ facingMode: { exact: nextFacingMode } });
    } catch {
      // No camera matches that facing (or exact unsupported) — pick a *different*
      // videoinput device by id.
      try {
        const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        const other = cams.find((c) => c.deviceId && c.deviceId !== curDeviceId);
        if (other) stream = await open({ deviceId: { exact: other.deviceId } });
      } catch { /* fall through */ }
    }

    if (!stream) {
      // Only one camera (e.g. a laptop) — reopen the current lens so the preview
      // keeps working, and flag it.
      try { stream = await open({ facingMode }); } catch { /* ignore */ }
      if (stream) {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setVideoReady(true);
      }
      setFlipError("This device has only one camera.");
      setTimeout(() => setFlipError(null), 2500);
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
    setFacingMode(nextFacingMode);
    setVideoReady(true);
  }, [facingMode]);

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

    // Mirror the user-facing lens so the saved image matches the preview.
    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
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
            .getUserMedia({ video: { facingMode: "environment", width: { ideal: 2560 }, height: { ideal: 1440 } }, audio: false })
            .then((newStream) => {
              oldStream.getTracks().forEach((t) => t.stop());
                streamRef.current = newStream;
                setFacingMode("environment");
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
  }, [angle.id, currentAngle, facingMode, photos, videoReady, stopCamera, onComplete]);

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
  // LOCAL-FIRST full resolution: nano-banana needs facial detail to LOCK the face,
  // and full-res photos preserve it (same prompt that changed the face at 1280 keeps
  // it at full res). 4096/0.95 is effectively full quality for phone photos. This
  // only fits when the app runs on a local/LAN dev server (no request-size cap) —
  // the Vercel-hosted build will 413 on generation with images this large. To run
  // full-res on Vercel too, switch the generation to storage URLs.
  const compressImage = async (file: File, maxDim = 4096, quality = 0.95): Promise<string> => {
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

  // ── HOME SCREEN (NOIR intro) ───────────────────────────────────
  if (step === "home") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: INK, padding: "0 24px 130px",
        display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={MICRO}>Biometric Capture</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 200, letterSpacing: ".08em" }}>Face Scan</div>
          <div style={{ marginTop: 8, fontSize: 13, color: MUTE }}>4 angles · about 60 seconds</div>
        </div>

        {/* Angle list card */}
        <div style={{ borderRadius: 26, padding: "24px 22px", background: "rgba(23,22,20,.78)",
          border: "1px solid rgba(242,239,233,.09)", boxShadow: "0 40px 80px -30px rgba(0,0,0,.9)" }}>
          <div style={{ ...MICRO, marginBottom: 18 }}>We&apos;ll capture</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {ANGLES.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 30, height: 30, flex: "none", borderRadius: 9, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: 600, background: "rgba(143,167,154,.1)",
                  border: "1px solid rgba(143,167,154,.28)", color: ACC }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{a.label}</div>
                  <div style={{ marginTop: 2, fontSize: 11, color: MUTE }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 16, borderRadius: 14, padding: "12px 14px", fontSize: 12, textAlign: "center",
            background: "rgba(224,106,92,0.1)", border: "1px solid rgba(224,106,92,0.28)", color: "#E06A5C" }}>{error}</div>
        )}

        {!cameraSupported && (
          <div style={{ marginTop: 16, borderRadius: 14, padding: "12px 14px", fontSize: 11, textAlign: "center",
            background: "rgba(143,167,154,0.06)", border: "1px solid rgba(143,167,154,0.2)", color: MUTE }}>
            Camera needs HTTPS, so it&apos;s unavailable here. Use <span style={{ color: ACC, fontWeight: 700 }}>Upload</span> below — it works the same.
          </div>
        )}

        {/* Primary = Start Camera when supported, else Upload */}
        <div
          onClick={openCamera}
          style={{ marginTop: 22, height: 58, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase",
            ...(cameraSupported ? SAGE_BTN : GHOST_BTN) }}>
          {cameraSupported ? "Start Camera" : "Camera (needs HTTPS)"}
        </div>

        <div
          onClick={() => { setPhotos([]); fileInputRef.current?.click(); }}
          style={{ marginTop: 12, height: 54, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase",
            ...(cameraSupported ? GHOST_BTN : SAGE_BTN) }}>
          Upload 4 Photos
        </div>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
          style={{ display: "none" }} onChange={handleUpload} />
      </div>
    );
  }

  // ── CAMERA SCREEN (NOIR biometric guide) ───────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0C0B0A", zIndex: 60 }}>
      {/* Flash overlay */}
      {flash && <div style={{ position: "absolute", inset: 0, background: "#fff", zIndex: 50, pointerEvents: "none", opacity: 0.7 }} />}

      {/* Live video */}
      <video
        ref={videoRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        muted playsInline autoPlay
        onPlaying={() => setVideoReady(true)}
        onCanPlay={() => setVideoReady(true)}
      />
      {/* Vignette for legibility */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(66% 46% at 50% 42%, transparent 40%, rgba(12,11,10,.55) 100%), linear-gradient(180deg, rgba(12,11,10,.6), transparent 30%, transparent 62%, rgba(12,11,10,.92))" }} />

      {/* Top: close + angle track + flip */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "44px 22px 0", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <button onClick={() => { stopCamera(); setStep("home"); }}
            style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(12,11,10,.6)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(242,239,233,.18)", color: INK, fontSize: 16, cursor: "pointer" }}>✕</button>
          <div style={{ ...MICRO, color: "rgba(242,239,233,.6)" }}>Live Camera</div>
          <button onClick={flipCamera} aria-label="Flip camera" title="Flip camera"
            style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(12,11,10,.6)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(242,239,233,.18)", color: INK, fontSize: 16, cursor: "pointer" }}>↔</button>
        </div>
        {/* Angle track bars */}
        <div style={{ display: "flex", gap: 8 }}>
          {ANGLES.map((a, i) => (
            <div key={a.id} style={{ flex: 1, height: 2, borderRadius: 2, transition: "all .5s ease",
              background: i < photos.length ? "#F2EFE9" : i === currentAngle ? "rgba(242,239,233,.55)" : "rgba(242,239,233,.14)",
              boxShadow: i === currentAngle && photos.length < 4 ? "0 0 12px rgba(242,239,233,.8)" : "none" }} />
          ))}
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
          {ANGLES.map((a, i) => (
            <div key={a.id} style={{ flex: 1, textAlign: "center", fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase",
              color: i <= currentAngle ? "#FFFFFF" : "#4E4941", transition: "color .4s ease" }}>{a.label}</div>
          ))}
        </div>
      </div>

      {/* Flip result toast */}
      {flipError && (
        <div style={{ position: "absolute", top: "11%", left: 0, right: 0, textAlign: "center", zIndex: 20 }}>
          <span style={{ display: "inline-block", padding: "8px 14px", borderRadius: 999, fontSize: 11, letterSpacing: ".04em",
            background: "rgba(12,11,10,.8)", backdropFilter: "blur(10px)", border: "1px solid rgba(242,239,233,.18)", color: "#F2EFE9" }}>
            {flipError}
          </span>
        </div>
      )}

      {/* Face guide + brackets */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-52%)", pointerEvents: "none" }}>
        <svg viewBox="0 0 268 356" width="268" height="356" style={{ overflow: "visible", maxWidth: "78vw", height: "auto" }}>
          <ellipse cx="134" cy="176" rx="103" ry="139" fill="none" stroke="#F2EFE9" strokeWidth="1.2" opacity="0.9" />
          <ellipse cx="134" cy="176" rx="103" ry="139" fill="none" stroke="#F2EFE9" strokeWidth="8" opacity="0.09" />
          <ellipse cx="134" cy="176" rx="60" ry="139" fill="none" stroke="#F2EFE9" strokeWidth="0.6" opacity="0.28" />
          <ellipse cx="134" cy="176" rx="103" ry="68" fill="none" stroke="#F2EFE9" strokeWidth="0.6" opacity="0.22" />
          <line x1="134" y1="30" x2="134" y2="322" stroke="#F2EFE9" strokeWidth="0.5" opacity="0.2" />
          <line x1="32" y1="176" x2="236" y2="176" stroke="#F2EFE9" strokeWidth="0.5" opacity="0.2" />
          <line x1="8" y1="16" x2="8" y2="50" stroke="#F2EFE9" strokeWidth="1.6" /><line x1="8" y1="16" x2="42" y2="16" stroke="#F2EFE9" strokeWidth="1.6" />
          <line x1="260" y1="16" x2="260" y2="50" stroke="#F2EFE9" strokeWidth="1.6" /><line x1="226" y1="16" x2="260" y2="16" stroke="#F2EFE9" strokeWidth="1.6" />
          <line x1="8" y1="340" x2="8" y2="306" stroke="#F2EFE9" strokeWidth="1.6" /><line x1="8" y1="340" x2="42" y2="340" stroke="#F2EFE9" strokeWidth="1.6" />
          <line x1="260" y1="340" x2="260" y2="306" stroke="#F2EFE9" strokeWidth="1.6" /><line x1="226" y1="340" x2="260" y2="340" stroke="#F2EFE9" strokeWidth="1.6" />
        </svg>
      </div>

      {/* Angle title + hint / capture confirm */}
      <div style={{ position: "absolute", top: "16%", left: 0, right: 0, textAlign: "center", zIndex: 10, padding: "0 24px" }}>
        {tick ? (
          <>
            <div style={{ fontSize: 12, letterSpacing: ".4em", textTransform: "uppercase", color: "#4FD69C" }}>Captured ✓</div>
            {currentAngle < ANGLES.length - 1 && (
              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(242,239,233,.7)" }}>Next — {ANGLES[currentAngle + 1].label}</div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, letterSpacing: ".4em", textTransform: "uppercase", color: INK }}>{angle.label}</div>
            <div style={{ marginTop: 10, fontSize: 13, color: "rgba(242,239,233,.66)" }}>{angle.instruction}</div>
            <div style={{ marginTop: 10, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 10, letterSpacing: ".2em", color: INK }}>
              {videoReady ? "ALIGN WITHIN THE GUIDE" : "STARTING CAMERA…"}
            </div>
          </>
        )}
      </div>

      {/* Bottom: capture + retake + counter */}
      <div style={{ position: "absolute", bottom: 52, left: 24, right: 24, zIndex: 10, display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          onClick={() => { if (videoReady && !tick) capturePhoto(); }}
          style={{ height: 60, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: videoReady && !tick ? "pointer" : "default", fontSize: 11, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase",
            background: videoReady && !tick ? "linear-gradient(160deg, #F4F1EB, #F2EFE9 52%, #C7BDAE)" : "rgba(242,239,233,.14)",
            color: videoReady && !tick ? "#14130F" : "rgba(242,239,233,.6)",
            border: videoReady && !tick ? "0" : "1px solid rgba(242,239,233,.3)",
            boxShadow: videoReady && !tick ? "0 16px 34px -14px rgba(242,239,233,.6), inset 0 1px 0 rgba(255,255,255,.4)" : "none",
            transition: "all .3s ease" }}>
          {tick ? "Saved ✓" : videoReady ? `Capture ${angle.label}` : "Loading camera…"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#635E56" }}>
          <button type="button" className="tap" onClick={() => { setPhotos([]); setCurrentAngle(0); }} style={{ letterSpacing: ".2em", textTransform: "uppercase", fontSize: 10, color: "#635E56" }}>Retake</button>
          <button type="button" className="tap" onClick={flipCamera} title="Flip camera" aria-label="Flip camera"
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#8FA79A", padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(143,167,154,.32)" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8FA79A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h13a4 4 0 0 1 4 4v1" /><path d="m16 4-3 3 3 3" />
              <path d="M21 17H8a4 4 0 0 1-4-4v-1" /><path d="m8 20 3-3-3-3" />
            </svg>
            Flip
          </button>
          <span>{photos.length} / {ANGLES.length}</span>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
