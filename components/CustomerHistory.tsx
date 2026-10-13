"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ACC = "#8FA79A";
const INK = "#F2EFE9";
const MUTE = "#948D82";
const FAINT = "#7C766C";
const MICRO: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: FAINT,
};
const CARD: React.CSSProperties = { borderRadius: 20, background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" };

type Visit = {
  id: string;
  created_at: string;
  ended_at: string | null;
  chosen_style: string | null;
  service_type: string | null;
  customer_rating: number | null;
};

const SERVICE_LABEL: Record<string, string> = { haircut: "Haircut", beard: "Beard", both: "Hair + Beard", colour: "Colour" };
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: "#C9A15C", fontSize: 12, letterSpacing: 1 }}>
      {"★".repeat(n)}<span style={{ color: "rgba(242,239,233,.2)" }}>{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

// The customer's own history: how many visits, their average rating, and a dated
// list of past looks/preferences. Real data, salon-scoped via the signed-in operator.
export default function CustomerHistory({ customerId, customerName }: { customerId?: string; customerName?: string }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await createClient()
          .from("visits")
          .select("id, created_at, ended_at, chosen_style, service_type, customer_rating")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false });
        if (!cancelled) setVisits((data ?? []) as Visit[]);
      } catch { /* leave empty */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  const rated = visits.filter((v) => v.customer_rating != null);
  const avg = rated.length ? rated.reduce((s, v) => s + (v.customer_rating ?? 0), 0) / rated.length : null;

  const first = customerName?.split(" ")[0] ?? "there";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: INK, paddingBottom: 100 }}>
      <div style={{ padding: "58px 20px 0" }}>
        <div style={MICRO}>Your history</div>
        <div style={{ marginTop: 10, fontSize: 26, fontWeight: 200, letterSpacing: ".04em" }}>Visits &amp; looks</div>
      </div>

      {/* Stat cards */}
      <div style={{ padding: "20px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...CARD, padding: "18px 16px" }}>
          <div style={MICRO}>Total visits</div>
          <div style={{ marginTop: 10, fontSize: 34, fontWeight: 700, letterSpacing: "-.02em", color: "#C7BDAE" }}>
            {loading ? "—" : visits.length}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: MUTE }}>{visits.length === 1 ? "First visit" : "With this salon"}</div>
        </div>
        <div style={{ ...CARD, padding: "18px 16px" }}>
          <div style={MICRO}>Your rating</div>
          <div style={{ marginTop: 10, fontSize: 34, fontWeight: 700, letterSpacing: "-.02em", color: "#C7BDAE" }}>
            {loading ? "—" : avg != null ? avg.toFixed(1) : "—"}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: MUTE }}>{rated.length ? `From ${rated.length} review${rated.length === 1 ? "" : "s"}` : "No reviews yet"}</div>
        </div>
      </div>

      {/* Past preferences by date */}
      <div style={{ padding: "26px 20px 0" }}>
        <div style={{ ...MICRO, marginBottom: 12, paddingLeft: 2 }}>Past looks by date</div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ ...CARD, height: 64 }} />)}
          </div>
        ) : visits.length === 0 ? (
          <div style={{ ...CARD, padding: "26px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🗓️</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: MUTE }}>No history yet</div>
            <div style={{ marginTop: 6, fontSize: 12, color: FAINT }}>{first}, your past looks &amp; preferences will appear here after each visit.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visits.map((v, i) => {
              const inProgress = !v.ended_at;
              const date = new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              return (
                <div key={v.id} style={{ ...CARD, padding: "15px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {cap(v.chosen_style) || SERVICE_LABEL[v.service_type ?? ""] || "Visit"}
                        {i === 0 && <span style={{ ...MICRO, fontSize: 8, marginLeft: 8, color: ACC }}>{inProgress ? "In progress" : "Latest"}</span>}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 11, color: MUTE }}>
                        {date}{v.service_type ? ` · ${SERVICE_LABEL[v.service_type] ?? v.service_type}` : ""}
                      </div>
                    </div>
                    {v.customer_rating != null ? <Stars n={v.customer_rating} /> : <span style={{ fontSize: 10, color: FAINT }}>—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
