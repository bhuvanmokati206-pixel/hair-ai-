// Platform admin — the salon list. Tap a salon to drill into its data.
//
// Server Component: requireAdmin() runs before any markup ships, so an
// unauthorised user never receives the data.

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  active:    "#4FD69C",
  trial:     "#C9A15C",
  suspended: "#E06A5C",
  cancelled: "#7C766C",
};

export default async function AdminPage() {
  const profile = await requireAdmin();

  // Service client: reads across every salon, which the salon-scoped RLS
  // policies forbid for normal users.
  const db = getServiceClient();

  // One row per salon with a live customer + visit count, so the list shows
  // size at a glance without a query per card.
  const [{ data: salons }, { data: customers }, { data: visits }] = await Promise.all([
    db.from("salons").select("id, code, name, city, status").order("name"),
    db.from("customers").select("salon_id"),
    db.from("visits").select("salon_id"),
  ]);

  const custBySalon  = countBy(customers ?? [], "salon_id");
  const visitBySalon = countBy(visits ?? [], "salon_id");
  const salonRows = salons ?? [];
  const activeCount = salonRows.filter((s) => s.status === "active").length;

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)", color: "#F2EFE9" }}>
      <div className="px-5 pt-14 pb-5">
        <div style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: "#7C766C" }}>
          Platform admin
        </div>
        <h1 style={{ marginTop: 10, fontSize: 26, fontWeight: 200, letterSpacing: ".04em", color: "#BFD2C7" }}>Salons</h1>
        <p className="text-xs mt-1.5" style={{ color: "#948D82" }}>
          {salonRows.length} total · {activeCount} active · signed in as {profile.email}
        </p>
      </div>

      <div className="px-5 flex flex-col gap-2 mb-8">
        {salonRows.length === 0 ? (
          <div className="rounded-2xl p-6 text-center text-xs"
            style={{ background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)", color: "#948D82" }}>
            No salons yet.
          </div>
        ) : (
          salonRows.map((s) => (
            <Link key={s.id} href={`/admin/${s.id}`}
              className="rounded-2xl p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
              style={{ background: "rgba(23,22,20,.72)", border: "1px solid rgba(242,239,233,.08)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: "#F2EFE9" }}>{s.name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${STATUS_COLORS[s.status] ?? "#7C766C"}22`, color: STATUS_COLORS[s.status] ?? "#7C766C", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    {s.status}
                  </span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: "#948D82" }}>
                  <span className="font-mono">{s.code ?? "—"}</span>
                  {s.city ? ` · ${s.city}` : ""} · {custBySalon[s.id] ?? 0} customers · {visitBySalon[s.id] ?? 0} scans
                </p>
              </div>
              <span className="text-lg shrink-0" style={{ color: "#7C766C" }}>›</span>
            </Link>
          ))
        )}
      </div>

      <div className="px-5">
        <LogoutButton />
      </div>
    </div>
  );
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = String(r[key] ?? "");
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
