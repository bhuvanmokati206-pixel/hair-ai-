"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import ClientNav from "@/components/ClientNav";
import CustomerDashboardView, { type DashPhoto } from "@/components/CustomerDashboardView";

const INK = "#F2EFE9";
const MUTE = "#948D82";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { currentCustomer, currentSession, setCurrentSession, setCurrentCustomer } = useStore();

  const [dbLoading, setDbLoading] = useState(false);
  const photos = currentSession?.photos ?? [];
  const analysis = currentSession?.analysis ?? null;
  const name = currentCustomer?.name ?? "there";

  // If memory/localStorage doesn't have photos yet, fetch latest visit & photos from database!
  useEffect(() => {
    if (photos.length > 0) return;

    (async () => {
      setDbLoading(true);
      try {
        const res = await fetch("/api/visit");
        const data = await res.json();
        if (res.ok && data.visit) {
          const loadedPhotos: DashPhoto[] = (data.photos || data.originalPhotos || []).map((p: { preview?: string; url?: string; label?: string; angle?: string }) => ({
            preview: p.preview || p.url || "",
            label: p.label || p.angle || "front",
          }));

          const customerData = data.customer || { name: "Walk-in Guest", phone: "9999999999" };
          setCurrentCustomer(customerData);
          setCurrentSession({
            customer: customerData,
            photos: loadedPhotos as any,
            analysis: data.visit.analysis,
            savedStyles: [],
          });
        }
      } catch (err) {
        console.warn("[customer-dashboard] Failed to load latest visit from database:", err);
      } finally {
        setDbLoading(false);
      }
    })();
  }, [photos.length, setCurrentCustomer, setCurrentSession]);

  if (dbLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
        <div style={{ fontSize: 13, color: MUTE }}>Loading your scan photos...</div>
        <ClientNav />
      </div>
    );
  }

  // Nothing captured yet in memory or in database — send them to a scan.
  if (photos.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: INK, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 30px" }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>📷</div>
        <div style={{ fontSize: 18, fontWeight: 500 }}>No scan loaded yet</div>
        <div style={{ marginTop: 8, fontSize: 13, color: MUTE, maxWidth: 260 }}>
          Capture a customer&apos;s 4 angles first — their photos and analysis show up here.
        </div>
        <button type="button" className="tap" onClick={() => router.push("/scan")}
          style={{ marginTop: 22, padding: "14px 26px", borderRadius: 16, cursor: "pointer", fontSize: 11, fontWeight: 700,
            letterSpacing: ".18em", textTransform: "uppercase", background: "linear-gradient(160deg, #F4F1EB, #8FA79A 52%, #C7BDAE)", color: "#14130F" }}>
          Start a scan
        </button>
        <ClientNav />
      </div>
    );
  }

  return (
    <>
      <CustomerDashboardView name={name} photos={photos} analysis={analysis} />
      <ClientNav />
    </>
  );
}
