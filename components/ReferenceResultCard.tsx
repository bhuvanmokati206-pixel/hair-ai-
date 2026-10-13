"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ReferenceAnalysisData {
  styleName: string;
  description: string;
  customerEstimatedLength?: string;
  referenceRequiredLength?: string;
  isLengthSufficient?: boolean;
  lengthDifferenceNotes?: string;
  isSuitable?: boolean;
  suitabilityScore?: number;
  suitabilityReason?: string;
  advisoryWarning?: string | null;
  topLength: string;
  sidesFade: string;
  textureType: string;
  barberInstructions: string;
  stylingTips: string;
  suitableFaceShapes?: string[];
}

export type ReferenceAngles = {
  front?: string | null;
  left?: string | null;
  right?: string | null;
  back?: string | null;
};

interface ReferenceResultCardProps {
  referencePhotoUrl: string;
  generatedPhotoUrl: string;
  angles?: ReferenceAngles | null;
  analysis: ReferenceAnalysisData;
  onExploreRecommendations: () => void;
  onContinueToHaircut: () => void;
  onTryAnotherReference: () => void;
}

const ANGLE_TABS: Array<{ id: keyof ReferenceAngles; label: string; deg: string }> = [
  { id: "front", label: "Front", deg: "0°" },
  { id: "left", label: "Left Side", deg: "90°" },
  { id: "right", label: "Right Side", deg: "270°" },
  { id: "back", label: "Back", deg: "180°" },
];

export default function ReferenceResultCard({
  referencePhotoUrl,
  generatedPhotoUrl,
  angles,
  analysis,
  onExploreRecommendations,
  onContinueToHaircut,
  onTryAnotherReference,
}: ReferenceResultCardProps) {
  const [activeAngle, setActiveAngle] = useState<keyof ReferenceAngles>("front");

  const currentGeneratedImage = angles?.[activeAngle] || generatedPhotoUrl;
  const hasMultipleAngles = Boolean(angles?.left && angles?.right);

  const isWarningActive =
    analysis.isSuitable === false ||
    analysis.isLengthSufficient === false ||
    Boolean(analysis.advisoryWarning);

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Header Banner */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
            Reference Look Adapted
          </span>
          {typeof analysis.suitabilityScore === "number" && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                analysis.suitabilityScore >= 80
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/20"
              }`}
            >
              {analysis.suitabilityScore}% Match
            </span>
          )}
        </div>
        <h2 className="text-xl font-black text-white pt-1">{analysis.styleName}</h2>
        <p className="text-xs text-white/60 leading-relaxed px-2">{analysis.description}</p>
      </div>

      {/* Prominent Suitability / Hair Length Advisory Warning */}
      {isWarningActive && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 shadow-lg space-y-2"
        >
          <div className="flex items-start gap-2.5">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Suitability & Length Advisory
                </h4>
                {analysis.isLengthSufficient === false && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Shorter Hair
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-amber-100">
                {analysis.advisoryWarning || analysis.suitabilityReason}
              </p>
              {analysis.lengthDifferenceNotes && (
                <p className="text-[11px] text-amber-200/70 pt-0.5">
                  ✂️ {analysis.lengthDifferenceNotes}
                </p>
              )}
            </div>
          </div>

          {/* Quick Length Metric Comparison */}
          {(analysis.customerEstimatedLength || analysis.referenceRequiredLength) && (
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] border-t border-amber-500/20">
              <div className="p-1.5 rounded-lg bg-black/30">
                <span className="text-white/50 block">Your Current Length:</span>
                <span className="font-bold text-amber-200 block truncate">
                  {analysis.customerEstimatedLength || "Current length"}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-black/30">
                <span className="text-white/50 block">Reference Ideal:</span>
                <span className="font-bold text-amber-200 block truncate">
                  {analysis.referenceRequiredLength || "Reference length"}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Side-by-Side Visual Comparison Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-3 rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/40 border border-white/10 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between gap-2.5">
          {/* Reference Inspo Photo */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full aspect-[4/5] rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referencePhotoUrl}
                alt="Reference Inspo"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <span className="mt-1.5 px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-white/70 uppercase tracking-wider">
              Reference Inspo
            </span>
          </div>

          {/* Transition Arrow */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <span className="text-[#8FA79A] text-lg font-black animate-pulse">➔</span>
          </div>

          {/* Generated Look on Customer Face */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full aspect-[4/5] rounded-xl overflow-hidden border-2 border-[#8FA79A] bg-black/60 shadow-lg relative">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeAngle}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  src={currentGeneratedImage}
                  alt={`Your Generated Look - ${activeAngle}`}
                  className="w-full h-full object-cover object-top"
                />
              </AnimatePresence>
            </div>
            <span className="mt-1.5 px-2 py-0.5 rounded-full bg-[#8FA79A] text-[9px] font-black text-black uppercase tracking-wider shadow">
              Your Face ({activeAngle.toUpperCase()})
            </span>
          </div>
        </div>

        {/* 4-Angle Switcher Tabs */}
        {hasMultipleAngles && (
          <div className="pt-1">
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/40 border border-white/5">
              {ANGLE_TABS.map((tab) => {
                const isActive = activeAngle === tab.id;
                const available = Boolean(angles?.[tab.id]);
                return (
                  <button
                    key={tab.id}
                    disabled={!available}
                    onClick={() => setActiveAngle(tab.id)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                      isActive
                        ? "bg-[#8FA79A] text-black font-black shadow"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    } ${!available ? "opacity-30 cursor-not-allowed" : ""}`}
                  >
                    <span className="block text-[10px] font-bold uppercase leading-none">
                      {tab.label}
                    </span>
                    <span className={`block text-[8px] mt-0.5 ${isActive ? "text-black/70" : "text-white/30"}`}>
                      {tab.deg}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Technical Barber Cutting Guide Card */}
      <div className="card p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <span className="text-base">💈</span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Barber Execution & Styling Guide
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white/5">
            <span className="text-[10px] text-white/40 block">Top Length Target</span>
            <span className="font-semibold text-white mt-0.5 block">{analysis.topLength}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5">
            <span className="text-[10px] text-white/40 block">Sides / Fade</span>
            <span className="font-semibold text-white mt-0.5 block">{analysis.sidesFade}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
          <span className="font-bold text-amber-300 block text-[11px] mb-1">
            ✂️ Cutting Steps for Stylist:
          </span>
          {analysis.barberInstructions}
        </div>

        {analysis.stylingTips && (
          <div className="p-2.5 rounded-xl bg-white/5 text-xs text-white/70">
            <span className="text-[10px] text-white/40 block font-bold">Recommended Styling:</span>
            <p className="mt-0.5">{analysis.stylingTips}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={onContinueToHaircut}
          className="w-full btn-primary py-3.5 text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
        >
          <span>✂️ Confirm & Start Haircut</span>
        </button>

        <button
          onClick={onExploreRecommendations}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#8FA79A] bg-[#8FA79A]/10 border border-[#8FA79A]/30 hover:bg-[#8FA79A]/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
        >
          <span>✨</span>
          <span>Want to also see what suits your face shape?</span>
        </button>

        <button
          onClick={onTryAnotherReference}
          className="w-full py-2.5 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors"
        >
          🔄 Try a different reference photo
        </button>
      </div>
    </div>
  );
}
