"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import StyleGrid from "@/components/StyleGrid";
import type { GeneratedStyle } from "@/components/HairAIAutomation";

export default function CustomisePage() {
  const { currentSession } = useStore();
  const [mode, setMode] = useState<"hair" | "beard">("hair");
  const [styles, setStyles] = useState<GeneratedStyle[]>(() =>
    currentSession?.analysis?.feasibleStyles.map((name) => ({
      styleName: name,
      imageUrl: null,
      loading: false,
      error: null,
    })) ?? []
  );
  const beardStyles = ["Short stubble", "Full beard", "Goatee", "French cut", "Clean shaven"];
  const [beardGenerated, setBeardGenerated] = useState<GeneratedStyle[]>(
    beardStyles.map((name) => ({ styleName: name, imageUrl: null, loading: false, error: null }))
  );

  const frontPhoto = currentSession?.photos.find((p) => p.label === "front") ?? currentSession?.photos[0];

  const generateStyle = async (index: number) => {
    if (!frontPhoto || !currentSession?.analysis) return;
    const list = mode === "hair" ? styles : beardGenerated;
    const setList = mode === "hair" ? setStyles : setBeardGenerated;
    const style = list[index];
    if (!style || style.loading || style.imageUrl) return;

    setList((prev) => prev.map((s, i) => i === index ? { ...s, loading: true, error: null } : s));

    try {
      const res = await fetch("/api/generate-hairstyle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: frontPhoto.base64,
          styleName: style.styleName,
          hairColor: currentSession.analysis.hairColor,
          hairTexture: currentSession.analysis.hairTexture,
          includeBeard: mode === "beard",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setList((prev) => prev.map((s, i) => i === index ? { ...s, loading: false, imageUrl: data.imageUrl } : s));
    } catch (err) {
      setList((prev) => prev.map((s, i) =>
        i === index ? { ...s, loading: false, error: err instanceof Error ? err.message : "Failed" } : s
      ));
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-14 pb-5">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Customise</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {currentSession?.customer.name ? `Styling for ${currentSession.customer.name}` : "Try different looks"}
        </p>
      </div>

      {!frontPhoto ? (
        <div className="px-5">
          <div className="card p-8 text-center">
            <p className="text-3xl mb-3">📷</p>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No scan yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Complete a scan first to try styles here</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mode toggle */}
          <div className="px-5 mb-5">
            <div className="flex rounded-xl p-1" style={{ background: "var(--bg-subtle)" }}>
              {(["hair", "beard"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: mode === m ? "var(--bg-card)" : "transparent",
                    color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {m === "hair" ? "💇 Hair Styles" : "🧔 Beard Styles"}
                </button>
              ))}
            </div>
          </div>

          <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <StyleGrid
              styles={mode === "hair" ? styles : beardGenerated}
              bestMatch={currentSession?.analysis?.bestMatch ?? ""}
              onGenerate={generateStyle}
            />
          </motion.div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
