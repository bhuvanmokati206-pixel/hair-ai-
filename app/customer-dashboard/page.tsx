"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import ClientNav from "@/components/ClientNav";
import CustomerDashboardView from "@/components/CustomerDashboardView";

const INK = "#F2EFE9";
const MUTE = "#948D82";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { currentCustomer, currentSession } = useStore();

  const photos = currentSession?.photos ?? [];
  const analysis = currentSession?.analysis ?? null;
  const name = currentCustomer?.name ?? "there";

  // Nothing captured yet — send them to a scan.
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
