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
        <h1 className="text-2xl font-black gradient-text-animated">Hair Health</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {currentSession?.customer.name
            ? `Analysing ${currentSession.customer.name}'s hair health`
            : "Answer 7 questions for personalised recommendations"}
        </p>
        <div className="mt-3 inline-flex">
          <span className="badge-green">✓ Free · No credits needed</span>
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
