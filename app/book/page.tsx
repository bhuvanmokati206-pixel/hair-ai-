"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import WhatsAppPreviewModal from "@/components/WhatsAppPreviewModal";

type Barber = { id: string; name: string };

export default function BookAppointmentPage() {
  const router = useRouter();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [customerName, setCustomerName] = useState("Alex Rivers");
  const [customerPhone, setCustomerPhone] = useState("9876543210");
  const [serviceType, setServiceType] = useState<"haircut" | "beard" | "both">("both");

  // Date and Time inputs
  const todayStr = new Date().toISOString().split("T")[0];
  const [bookingDate, setBookingDate] = useState(todayStr);
  const [bookingTime, setBookingTime] = useState("16:30");
  const [notes, setNotes] = useState("Wants medium fade haircut with sharp beard outline");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Trigger 3 WhatsApp preview
  const [modalOpen, setModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    customerName: string;
    phone: string;
    messageText: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/barbers")
      .then((res) => res.json())
      .then((data) => {
        if (data.barbers && data.barbers.length > 0) {
          setBarbers(data.barbers);
          setSelectedBarber(data.barbers[0].id);
        }
      })
      .catch(() => null);
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      setError("Please enter a valid phone number");
      return;
    }

    setBusy(true);
    setError(null);

    const slotAt = new Date(`${bookingDate}T${bookingTime}:00`).toISOString();

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          barberId: selectedBarber || undefined,
          serviceType,
          slotAt,
          notes: notes.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Booking failed");

      // Set trigger 3 modal preview
      setPreviewData({
        customerName: body.customerName ?? customerName,
        phone: body.customerPhone ?? customerPhone,
        messageText: body.previewText,
      });
      setModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-icon">
            ←
          </button>
          <div>
            <p className="section-label">WhatsApp Demo Trigger 3</p>
            <h1 className="text-xl font-black text-white">Book Appointment</h1>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Trigger 3 Live
        </span>
      </div>

      <form onSubmit={handleBook} className="px-5 space-y-4 max-w-md mx-auto">
        {/* Customer Information */}
        <div className="card p-4 space-y-3">
          <p className="section-label">Customer Details</p>
          <div>
            <label className="text-[11px] font-medium text-white/70 mb-1 block">Customer Name</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full text-xs"
              placeholder="e.g. Alex Rivers"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/70 mb-1 block">WhatsApp Phone Number</label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full text-xs"
              placeholder="e.g. 9876543210"
            />
          </div>
        </div>

        {/* Service & Barber Selection */}
        <div className="card p-4 space-y-3">
          <p className="section-label">Service & Stylist</p>
          <div>
            <label className="text-[11px] font-medium text-white/70 mb-1.5 block">Service Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "haircut", label: "Haircut" },
                { id: "beard", label: "Beard" },
                { id: "both", label: "Hair + Beard" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceType(s.id as "haircut" | "beard" | "both")}
                  className="py-2 px-1 rounded-xl text-xs font-bold transition-all"
                  style={
                    serviceType === s.id
                      ? { background: "linear-gradient(135deg,#8FA79A,#6E8778)", color: "#000" }
                      : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-white/70 mb-1.5 block">Select Barber</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBarber(b.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all"
                  style={
                    selectedBarber === b.id
                      ? { background: "var(--accent)", color: "#000" }
                      : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }
                >
                  ✂️ {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date & Time Slot */}
        <div className="card p-4 space-y-3">
          <p className="section-label">Date & Time Slot</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-white/70 mb-1 block">Date</label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-white/70 mb-1 block">Time Slot</label>
              <input
                type="time"
                required
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-white/70 mb-1 block">Special Request / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-xs resize-none"
              placeholder="Any styling preferences..."
            />
          </div>
        </div>

        {error && (
          <p className="text-[11px] rounded-xl p-3 bg-red-500/10 text-red-400 border border-red-500/20">{error}</p>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={busy}
          className="w-full btn-primary py-3 text-sm font-bold shadow-lg"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Booking Appointment..." : "⚡ Confirm Booking & Trigger WhatsApp"}
        </motion.button>
      </form>

      {/* WhatsApp Preview Modal for Trigger 3 */}
      {previewData && (
        <WhatsAppPreviewModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          triggerType="booking_confirm"
          customerName={previewData.customerName}
          phone={previewData.phone}
          messageText={previewData.messageText}
        />
      )}

      <BottomNav />
    </div>
  );
}
