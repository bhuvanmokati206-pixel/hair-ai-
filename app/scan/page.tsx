"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import CustomerEntryForm from "@/components/CustomerEntryForm";
import HairAIAutomation from "@/components/HairAIAutomation";
import BottomNav from "@/components/BottomNav";
import type { CapturedPhoto } from "@/components/CameraCapture";
import type { HairAnalysis } from "@/components/HairAIAutomation";

type ScanStep = "entry" | "scan";

export default function ScanPage() {
  const [step, setStep] = useState<ScanStep>("entry");
  const router = useRouter();
  const { currentCustomer, currentSession, updateSessionAnalysis } = useStore();

  const handleAnalysisComplete = async (analysis: HairAnalysis, photos: CapturedPhoto[]) => {
    updateSessionAnalysis(analysis, photos);

    // Save session to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && currentCustomer) {
        await supabase.from("customer_sessions").insert({
          salon_id: user.id,
          customer_name: currentCustomer.name,
          customer_phone: currentCustomer.phone,
          analysis_json: analysis,
          saved_styles: [],
        });

        // Track style choice for trending
        if (analysis.bestMatch) {
          await supabase.from("style_choices").insert({
            salon_id: user.id,
            style_name: analysis.bestMatch,
            chosen_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Non-critical — session still works locally
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {step === "entry" && (
        <CustomerEntryForm onContinue={() => setStep("scan")} />
      )}

      {step === "scan" && (
        <HairAIAutomation
          customerName={currentCustomer?.name}
          onAnalysisComplete={handleAnalysisComplete}
          onReset={() => setStep("entry")}
        />
      )}

      {step === "entry" && <BottomNav />}
    </div>
  );
}
