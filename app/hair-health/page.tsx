"use client";

import { useStore } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import HairHealthWizard from "@/components/HairHealthWizard";

export default function HairHealthPage() {
  const { currentSession } = useStore();
  const frontPhoto = currentSession?.photos.find((p) => p.label === "front") ?? currentSession?.photos[0];

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: "#7C766C" }}>
          Hair &amp; scalp
        </div>
        <h1 style={{ marginTop: 10, fontSize: 26, fontWeight: 200, letterSpacing: ".04em", color: "#F2EFE9" }}>Hair Health</h1>
        <p className="text-sm mt-1.5" style={{ color: "#948D82" }}>
          {currentSession?.customer.name
            ? `Analysing ${currentSession.customer.name}'s hair health`
            : "Answer 7 questions for personalised recommendations"}
        </p>
        <div className="mt-3 inline-flex" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 10px", borderRadius: 999, background: "rgba(79,214,156,.12)", color: "#4FD69C", border: "1px solid rgba(79,214,156,.3)" }}>
          ✓ Free · No credits needed
        </div>
      </div>

      {/* Wizard */}
      <div className="px-5">
        <HairHealthWizard
          photoBase64={frontPhoto?.base64}
          photoMediaType={frontPhoto?.mediaType}
          gender={currentSession?.analysis?.gender}
        />
      </div>

      <BottomNav />
    </div>
  );
}
