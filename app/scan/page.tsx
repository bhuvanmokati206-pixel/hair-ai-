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

  // Prevent accidental back-navigation / swipe-away during scan session
  useEffect(() => {
    if (step !== "scan" || !!resumeId) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "A customer scan is in progress. Leaving will discard unsaved photos.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step, resumeId]);

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
        setCurrentVisitId(resumeId);
        setResumeData({
          analysis: body.visit.analysis as HairAnalysis,
          generated: body.generated ?? [],
          photos: body.photos ?? body.originalPhotos ?? [],
        });
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

    const customer = currentCustomer ?? {
      name: "Walk-in Guest",
      phone: "9999999999",
      acceptedTerms: true,
    };
    if (!currentCustomer) {
      setCurrentCustomer(customer);
    }

    try {
      // 1. Customer row. The salon comes from the session server-side, so the
      //    same phone number can belong to a different customer at each salon.
      const custRes = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customer.phone,
          name: customer.name,
          gender: customer.gender,
          acceptedTerms: customer.acceptedTerms,
        }),
      });
      const custBody = await custRes.json();
      if (!custRes.ok) throw new Error(custBody.error ?? "Could not save the customer");

      const customerId: string = custBody.customer.id;
      setCurrentCustomer({ ...customer, id: customerId });

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

      // 3. The captured photos, uploaded to Supabase storage and recorded in visit_photos.
      try {
        const photoRes = await fetch("/api/visit-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitId,
            photos: photos.map((p) => ({
              image: p.base64 ? `data:${p.mediaType || "image/jpeg"};base64,${p.base64}` : p.preview,
              kind: "original",
              angle: p.label,
            })),
          }),
        });
        if (photoRes.ok) {
          const photoData = await photoRes.json();
          console.log("[scan] Photos saved to database:", photoData);
          if (Array.isArray(photoData.photos) && photoData.photos.length > 0) {
            const updatedPhotos = photos.map((p) => {
              const matched = photoData.photos.find((sp: { angle: string | null; url: string | null }) => sp.angle === p.label);
              return {
                ...p,
                preview: matched?.url || p.preview,
              };
            });
            updateSessionAnalysis(analysis, updatedPhotos);
          }
        }
      } catch (err) {
        console.warn("[scan] original photo upload failed:", err);
      }
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "var(--bg)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: "rgba(143,167,154,0.12)", border: "1px solid rgba(143,167,154,0.3)" }}>
          <span className="text-xl">🪑</span>
        </div>
        <div>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "#8FA79A" }}>
            Reopening Customer
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Restoring biometric scan, hair metrics &amp; generated styles…
          </p>
        </div>
        <div className="w-40 h-1 rounded-full overflow-hidden mt-2" style={{ background: "rgba(242,239,233,0.1)" }}>
          <div className="h-full rounded-full animate-pulse" style={{ width: "65%", background: "var(--accent)" }} />
        </div>
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

      {/* The operator nav only belongs on the entry screen. During the guided
          scan flow (capture → service → style → preview) it overlapped the
          flow's own bottom buttons, so the "Show my look" CTA couldn't be tapped. */}
      {step === "entry" && <BottomNav />}
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
