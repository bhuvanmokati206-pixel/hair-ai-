"use client";

// Billing page — opened when a visit is marked Done. Pick the barber who cut,
// add service line items (preset prices, editable), apply discount + GST +
// payment method, then finalize. Finalizing saves the bill AND completes the
// visit (queuing the WhatsApp review/rebook). No customer photos appear here.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  SERVICE_CATALOG, PAYMENT_METHODS, DEFAULT_GST_PERCENT,
  computeBill, rupees, parseRupeesToPaise,
  type BillLine, type PaymentMethod,
} from "@/lib/billing";

type Barber = { id: string; name: string };
type Visit = { customerName: string; customerPhone: string | null };

export default function BillingPage() {
  const router = useRouter();
  const visitId = useParams().visitId as string;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [salonName, setSalonName] = useState("Salon");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  const [barberId, setBarberId] = useState<string | null>(null);
  const [lines, setLines] = useState<BillLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [gst, setGst] = useState(DEFAULT_GST_PERCENT);
  const [payment, setPayment] = useState<PaymentMethod>("Cash");

  // Customer feedback — becomes the star rating + short review shown in the home
  // "Before & after" gallery.
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState<string | null>(null); // set once finalized

  useEffect(() => {
    (async () => {
      const [v, s, b] = await Promise.all([
        fetch(`/api/visit?id=${visitId}`).then((r) => r.json()).catch(() => null),
        fetch("/api/salon").then((r) => r.json()).catch(() => null),
        fetch("/api/barbers").then((r) => r.json()).catch(() => null),
      ]);
      if (v?.customer) setVisit({ customerName: v.customer.name ?? "Walk-in", customerPhone: v.customer.phone ?? null });
      if (v?.visit?.barberId) setBarberId(v.visit.barberId);
      if (s?.salon) setSalonName(s.salon.name);
      if (b?.barbers) setBarbers(b.barbers);
      // Default the bill to a single haircut line — the common case.
      setLines([{ id: `haircut-${Date.now()}`, name: "Haircut", pricePaise: 15000, qty: 1 }]);
      setLoading(false);
    })();
  }, [visitId]);

  const totals = useMemo(
    () => computeBill(lines, parseRupeesToPaise(discount), gst),
    [lines, discount, gst]
  );

  const addLine = (name: string, defaultPaise: number) => {
    setLines((prev) => [...prev, { id: `${name}-${Date.now()}`, name, pricePaise: defaultPaise, qty: 1 }]);
  };
  const updateLine = (id: string, patch: Partial<BillLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  const finalize = async () => {
    if (lines.length === 0) { setError("Add at least one service."); return; }
    setBusy(true); setError(null);
    try {
      // 1. Save the bill (also stamps the barber on the visit).
      const billRes = await fetch("/api/bill", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId, barberId, items: lines,
          discountPaise: parseRupeesToPaise(discount), gstPercent: gst, paymentMethod: payment,
        }),
      });
      const billBody = await billRes.json();
      if (!billRes.ok) throw new Error(billBody.error ?? "Could not save the bill");
      setInvoiceNo(billBody.bill.invoice_no);

      // 2. Complete the visit — sets ended_at, status=completed, queues WhatsApp
      //    (the barber is already set, so the review message names them).
      await fetch("/api/visit/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId,
          ...(rating ? { customerRating: rating } : {}),
          ...(review.trim() ? { customerReview: review.trim() } : {}),
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finalize");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><div className="spinner-lg" /></div>;
  }

  // ── Finalized receipt (no photos) ──────────────────────────────────
  if (invoiceNo) {
    return (
      <div className="min-h-screen flex flex-col items-center px-5 pt-14" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-center mb-4">
            <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{salonName}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Invoice {invoiceNo}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{new Date().toLocaleString("en-IN")}</p>
          </div>
          <div className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            <p>Customer: <b style={{ color: "var(--text-primary)" }}>{visit?.customerName}</b></p>
            {barberId && <p>Barber: {barbers.find((b) => b.id === barberId)?.name}</p>}
            <p>Payment: {payment}</p>
          </div>
          <div className="border-t border-b py-2 my-2 flex flex-col gap-1" style={{ borderColor: "var(--border)" }}>
            {lines.map((l) => (
              <div key={l.id} className="flex justify-between text-xs" style={{ color: "var(--text-primary)" }}>
                <span>{l.name}{l.qty > 1 ? ` ×${l.qty}` : ""}</span>
                <span>{rupees(l.pricePaise * l.qty)}</span>
              </div>
            ))}
          </div>
          <Totals totals={totals} />
          <p className="text-center text-[10px] mt-4" style={{ color: "var(--text-muted)" }}>Thank you for visiting {salonName}</p>
        </div>
        <button onClick={() => router.replace("/home")} className="btn-primary mt-5 w-full max-w-sm">Done</button>
      </div>
    );
  }

  // ── Bill builder ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-icon">←</button>
        <div>
          <p className="section-label">Billing</p>
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{visit?.customerName ?? "Customer"}</h1>
          {visit?.customerPhone && <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{visit.customerPhone}</p>}
        </div>
      </div>

      {/* Barber */}
      <section className="px-5 mb-4">
        <p className="section-label mb-2">Barber who cut</p>
        <div className="flex gap-2 flex-wrap">
          {barbers.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>No barbers — add them in Profile.</p>}
          {barbers.map((b) => (
            <button key={b.id} onClick={() => setBarberId(b.id === barberId ? null : b.id)}
              className="px-3.5 py-2 rounded-full text-xs font-bold active:scale-95 transition-all"
              style={b.id === barberId
                ? { background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000" }
                : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {b.name}
            </button>
          ))}
        </div>
      </section>

      {/* Customer feedback — optional. Rating + short review feed the home
          "Before & after" gallery so new customers see real transformations. */}
      <section className="px-5 mb-4">
        <p className="section-label mb-2">Customer feedback <span style={{ color: "var(--text-muted)" }}>(optional)</span></p>
        <div className="flex gap-1.5 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n === rating ? null : n)}
              className="text-2xl active:scale-90 transition-transform leading-none"
              style={{ color: rating && n <= rating ? "#C9A15C" : "var(--border-bright)" }}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}>
              ★
            </button>
          ))}
        </div>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value.slice(0, 160))}
          placeholder="A short review from the customer (optional)…"
          rows={2}
          className="w-full text-sm resize-none"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", color: "var(--text-primary)" }}
        />
        {review.length > 0 && (
          <p className="text-[10px] mt-1 text-right" style={{ color: "var(--text-muted)" }}>{review.length}/160</p>
        )}
      </section>

      {/* Add services */}
      <section className="px-5 mb-4">
        <p className="section-label mb-2">Add services</p>
        {SERVICE_CATALOG.map((cat) => (
          <div key={cat.group} className="mb-2">
            <p className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>{cat.group}</p>
            <div className="flex gap-2 flex-wrap">
              {cat.items.map((item) => (
                <button key={item.id} onClick={() => addLine(item.name, item.defaultPaise)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  + {item.name} <span style={{ color: "var(--text-muted)" }}>{rupees(item.defaultPaise)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Line items */}
      <section className="px-5 mb-4">
        <p className="section-label mb-2">Bill items</p>
        {lines.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tap a service above to add it.</p>
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-2 p-3">
                <span className="text-xs font-bold flex-1 truncate" style={{ color: "var(--text-primary)" }}>{l.name}</span>
                {/* qty */}
                <div className="flex items-center gap-1">
                  <button onClick={() => updateLine(l.id, { qty: Math.max(1, l.qty - 1) })} className="w-6 h-6 rounded-md text-xs font-bold" style={{ background: "var(--bg-subtle)" }}>−</button>
                  <span className="text-xs w-4 text-center" style={{ color: "var(--text-primary)" }}>{l.qty}</span>
                  <button onClick={() => updateLine(l.id, { qty: l.qty + 1 })} className="w-6 h-6 rounded-md text-xs font-bold" style={{ background: "var(--bg-subtle)" }}>+</button>
                </div>
                {/* editable price */}
                <input
                  type="number"
                  value={l.pricePaise / 100}
                  onChange={(e) => updateLine(l.id, { pricePaise: parseRupeesToPaise(e.target.value) })}
                  className="w-16 text-xs text-right"
                  style={{ padding: "4px 6px" }}
                />
                <button onClick={() => removeLine(l.id)} className="text-xs" style={{ color: "var(--danger)" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Discount / GST / payment */}
      <section className="px-5 mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="section-label mb-1.5">Discount (₹)</p>
          <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" style={{ padding: "8px 12px" }} />
        </div>
        <div>
          <p className="section-label mb-1.5">GST %</p>
          <div className="flex gap-1.5">
            {[0, 5, 18].map((g) => (
              <button key={g} onClick={() => setGst(g)}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold"
                style={gst === g ? { background: "var(--accent)", color: "#000" } : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {g}%
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 mb-4">
        <p className="section-label mb-1.5">Payment method</p>
        <div className="flex gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button key={m} onClick={() => setPayment(m)}
              className="flex-1 py-2 rounded-xl text-xs font-bold"
              style={payment === m ? { background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000" } : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {m}
            </button>
          ))}
        </div>
      </section>

      {/* Totals */}
      <section className="px-5 mb-4">
        <div className="card p-4"><Totals totals={totals} /></div>
      </section>

      {error && <p className="mx-5 mb-2 text-[11px] rounded-lg px-3 py-2" style={{ background: "rgba(224,106,92,0.08)", color: "var(--danger)" }}>{error}</p>}

      <div className="px-5">
        <button onClick={finalize} disabled={busy} className="w-full btn-primary" style={{ opacity: busy ? 0.6 : 1 }}>
          {busy ? "Finalizing…" : `Finalize & complete · ${rupees(totals.totalPaise)}`}
        </button>
      </div>
    </div>
  );
}

function Totals({ totals }: { totals: ReturnType<typeof computeBill> }) {
  return (
    <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
      <Row label="Subtotal" value={rupees(totals.subtotalPaise)} />
      {totals.discountPaise > 0 && <Row label="Discount" value={`− ${rupees(totals.discountPaise)}`} />}
      {totals.gstPercent > 0 && <Row label={`GST ${totals.gstPercent}%`} value={rupees(totals.gstPaise)} />}
      <div className="flex justify-between font-black text-sm mt-1 pt-1" style={{ color: "var(--text-primary)", borderTop: "1px solid var(--border)" }}>
        <span>Total</span><span>{rupees(totals.totalPaise)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span>{label}</span><span>{value}</span></div>;
}
