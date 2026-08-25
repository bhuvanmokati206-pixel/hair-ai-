"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import CustomerEntryForm from "@/components/CustomerEntryForm";
import HairAIAutomation from "@/components/HairAIAutomation";
import BottomNav from "@/components/BottomNav";
import type { CapturedPhoto } from "@/components/CameraCapture";
import type { HairAnalysis, ResumeData } from "@/components/HairAIAutomation";

type ScanStep = "entry" | "scan";

function ScanFlow() {
  const [step, setStep] = useState<ScanStep>("entry");
  const router = useRouter();
  const params = useSearchParams();
  const resumeId = params.get("resume");
  const {
    currentCustomer, setCurrentCustomer,
    currentSession, updateSessionAnalysis,
    setCurrentVisitId,
  } = useStore();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeLoading, setResumeLoading] = useState(!!resumeId);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Reopen a parked customer: pull their visit, restore the store, and jump
  // straight to the results view — no re-scan, no re-analysis.
  useEffect(() => {
    if (!resumeId) return;
    (async () => {
      try {
        const res = await fetch(`/api/visit?id=${resumeId}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not load this customer");

        if (body.customer) {
          setCurrentCustomer({
            id: body.customer.id,
            name: body.customer.name ?? "Walk-in",
            phone: body.customer.phone,
          });
        }
        setCurrentVisitId(body.visit.id);
        setResumeData({ analysis: body.visit.analysis as HairAnalysis, generated: body.generated ?? [] });
        setStep("scan");
      } catch (err) {
        setResumeError(err instanceof Error ? err.message : "Could not resume");
      } finally {
        setResumeLoading(false);
      }
    })();
    // resumeId is the only real input; the store setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const handleAnalysisComplete = async (analysis: HairAnalysis, photos: CapturedPhoto[]) => {
    updateSessionAnalysis(analysis, photos);
    setSaveError(null);

    if (!currentCustomer) return;

    try {
      // 1. Customer row. The salon comes from the session server-side, so the
      //    same phone number can belong to a different customer at each salon.
      const custRes = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentCustomer.phone,
          name: currentCustomer.name,
          gender: currentCustomer.gender,
          acceptedTerms: currentCustomer.acceptedTerms,
        }),
      });
      const custBody = await custRes.json();
      if (!custRes.ok) throw new Error(custBody.error ?? "Could not save the customer");

      const customerId: string = custBody.customer.id;
      setCurrentCustomer({ ...currentCustomer, id: customerId });

      // 2. Visit row. ended_at stays null until checkout — that is what the
      //    "in session" counter reads, and what the 1-hour review timer needs.
      const visitRes = await fetch("/api/save-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          analysis,
          serviceType: "haircut",
          chosenStyle: analysis.bestMatch ?? null,
          // Barber is chosen later at billing, not here.
        }),
      });
      const visitBody = await visitRes.json();
      if (!visitRes.ok) throw new Error(visitBody.error ?? "Could not save the visit");

      const visitId: string = visitBody.visit.id;
      setCurrentVisitId(visitId);

      // 3. The captured photos, so the 45-day rebooking message has a before shot.
      //    Fire-and-forget: a failed upload should not block the barber.
      void fetch("/api/visit-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId,
          photos: photos.map((p) => ({
            image: `data:${p.mediaType};base64,${p.base64}`,
            kind: "original",
            angle: p.label,
          })),
        }),
      }).catch((err) => console.warn("[scan] original photo upload failed:", err));
    } catch (err) {
      // Surfaced rather than swallowed: the previous version had a bare catch,
      // so every save failed silently and nothing was ever persisted.
      const msg = err instanceof Error ? err.message : "Could not save this scan";
      console.error("[scan] save failed:", err);
      setSaveError(msg);
    }
  };

  if (resumeLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg)" }}>
        <div className="spinner-lg" />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Reopening customer…</p>
      </div>
    );
  }

  if (resumeError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ background: "var(--bg)" }}>
        <p className="text-sm" style={{ color: "var(--danger)" }}>{resumeError}</p>
        <button className="btn-primary" onClick={() => router.replace("/home")}>Back to dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {step === "entry" && (
        <CustomerEntryForm onContinue={() => setStep("scan")} />
      )}

      {step === "scan" && (
        <>
          {saveError && (
            <div className="mx-5 mt-4 mb-1 rounded-xl px-4 py-3 flex items-start gap-2"
              style={{ background: "rgba(224,106,92,0.08)", border: "1px solid rgba(224,106,92,0.25)" }}>
              <span className="text-sm">⚠️</span>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--danger)" }}>
                  This scan was not saved
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {saveError} — the analysis still works, but it will not appear in history.
                </p>
              </div>
            </div>
          )}
          <HairAIAutomation
            customerName={currentCustomer?.name}
            onAnalysisComplete={handleAnalysisComplete}
            onReset={() => { setResumeData(null); router.replace("/scan"); setStep("entry"); }}
            onContinueToHaircut={() => router.push("/home")}
            resumeData={resumeData ?? undefined}
          />
        </>
      )}

      <BottomNav />
    </div>
  );
}

export default function ScanPage() {
  // useSearchParams requires a Suspense boundary in Next 16.
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--bg)" }} />}>
      <ScanFlow />
    </Suspense>
  );
}
