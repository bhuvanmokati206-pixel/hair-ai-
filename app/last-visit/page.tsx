"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import ClientNav from "@/components/ClientNav";

const INK = "#F2EFE9";
const MUTE = "#948D82";
const FAINT = "#7C766C";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9,
  letterSpacing: ".24em",
  textTransform: "uppercase",
  color: FAINT,
};

interface VisitDetail {
  id: string;
  createdAt: string;
  chosenStyle: string | null;
  customerRating: number | null;
  barberNotes: string | null;
  barber: { name: string } | null;
  photos: {
    hero: string | null;
    originalFront: string | null;
  };
}

export default function LastVisitPage() {
  const { currentCustomer } = useStore();
  const name = currentCustomer?.name?.split(" ")[0] ?? "there";
  const [lastVisit, setLastVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const customerParam = currentCustomer?.id ? `?customerId=${currentCustomer.id}` : "";
        const res = await fetch(`/api/visit/history${customerParam}`);
        const data = await res.json();
        if (res.ok && data.visits && data.visits.length > 0) {
          setLastVisit(data.visits[0]);
        }
      } catch (err) {
        console.error("Failed to load last visit:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentCustomer]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: INK, paddingBottom: 104 }}>
      <div style={{ padding: "60px 24px 0" }}>
        <div style={MICRO}>History</div>
        <div style={{ marginTop: 9, fontSize: 26, fontWeight: 200, letterSpacing: ".02em" }}>Last visit</div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {loading ? (
          <div style={{ borderRadius: 22, padding: 30, background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)", textAlign: "center" }}>
            <div className="spinner" style={{ width: 24, height: 24, margin: "0 auto" }} />
          </div>
        ) : !lastVisit ? (
          <div style={{ borderRadius: 22, padding: "30px 18px", textAlign: "center", background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>🗓️</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>No previous visit on file</div>
            <div style={{ marginTop: 8, fontSize: 12, color: MUTE, lineHeight: 1.6 }}>
              {name}, once you&apos;ve completed a visit, your past look, stylist and review will show up here.
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: 22, padding: 20, background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ ...MICRO }}>{formatDate(lastVisit.createdAt)}</p>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#BFD2C7", marginTop: 4 }}>
                  {lastVisit.chosenStyle || "Haircut & Styling"}
                </h3>
                {lastVisit.barber?.name && (
                  <p style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>Stylist: {lastVisit.barber.name}</p>
                )}
              </div>
              {lastVisit.customerRating && (
                <div style={{ padding: "4px 8px", borderRadius: 8, background: "rgba(201,161,92,0.15)", border: "1px solid rgba(201,161,92,0.3)", color: "#C9A15C", fontSize: 12, fontWeight: 700 }}>
                  ★ {lastVisit.customerRating}/5
                </div>
              )}
            </div>

            {/* Before & After comparison */}
            {(lastVisit.photos.originalFront || lastVisit.photos.hero) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, padding: 10, borderRadius: 16, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: "100%", aspectRatio: "4/5", borderRadius: 12, overflow: "hidden", background: "#000", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {lastVisit.photos.originalFront ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={lastVisit.photos.originalFront} alt="Before" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: MUTE }}>No photo</div>
                    )}
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: MUTE, textTransform: "uppercase", marginTop: 4, display: "block" }}>Original</span>
                </div>

                <div style={{ color: "#C9A15C", fontWeight: 900, fontSize: 14 }}>➔</div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ width: "100%", aspectRatio: "4/5", borderRadius: 12, overflow: "hidden", background: "#000", border: "1px solid rgba(143,167,154,0.4)" }}>
                    {lastVisit.photos.hero ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={lastVisit.photos.hero} alt="After" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: MUTE }}>No look</div>
                    )}
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: "#8FA79A", textTransform: "uppercase", marginTop: 4, display: "block" }}>Your Look</span>
                </div>
              </div>
            )}

            {/* Barber Notes */}
            {lastVisit.barberNotes && (
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: MUTE }}>
                <span style={{ color: INK, fontWeight: 600, display: "block", marginBottom: 2 }}>Notes from your stylist:</span>
                {lastVisit.barberNotes}
              </div>
            )}
          </div>
        )}
      </div>

      <ClientNav />
    </div>
  );
}
