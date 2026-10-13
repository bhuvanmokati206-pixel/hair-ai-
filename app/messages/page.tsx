"use client";

// WhatsApp outbox viewer & demo trigger control center.
// View queued/sent messages, trigger fast-forward 45-day retention rebooks,
// test instant bookings, and launch real-time WhatsApp preview modals.

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import WhatsAppPreviewModal from "@/components/WhatsAppPreviewModal";
import { getWhatsAppWebUrl } from "@/lib/whatsappDemo";

type Msg = {
  id: string;
  type: "review" | "rebook" | "booking_confirm" | "custom";
  status: string;
  sendAt: string;
  sentAt: string | null;
  attempts: number;
  lastError: string | null;
  to: string | null;
  customerName: string | null;
  hasImage: boolean;
  headerImageUrl: string | null;
  preview: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#C9A15C",
  sending: "#8FA79A",
  sent: "#4FD69C",
  failed: "#E06A5C",
  cancelled: "#6B7280",
};

const TYPE_LABEL: Record<string, string> = {
  review: "Trigger 1: Review",
  rebook: "Trigger 2: 45-Day Retention",
  booking_confirm: "Trigger 3: Booking",
  custom: "Custom",
};

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Modal State for Previewing
  const [selectedMsg, setSelectedMsg] = useState<Msg | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/messages");
    const body = await res.json();
    if (res.ok) setMessages(body.messages ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runDispatcher = async () => {
    setDispatching(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/dispatch", { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        setResult(
          `${body.simulated ? "Simulated" : "Sent"}: ${body.sent} sent · ${body.retrying} retrying · ${body.failed} failed`
        );
        await load();
      } else {
        setResult(body.error ?? "Dispatch failed");
      }
    } finally {
      setDispatching(false);
    }
  };

  const fastForward45Days = async (id: string) => {
    setActionBusy(id);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_now", messageId: id }),
      });
      await runDispatcher();
    } finally {
      setActionBusy(null);
    }
  };

  const createDemoRebook = async () => {
    setActionBusy("create_rebook");
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_demo_rebook" }),
      });
      await load();
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      {/* Top Header */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-icon">
            ←
          </button>
          <div>
            <p className="section-label">WhatsApp Automation</p>
            <h1 className="text-xl font-black text-white">Client Demo Control</h1>
          </div>
        </div>
        <button
          onClick={() => router.push("/book")}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 active:scale-95"
        >
          + Test Booking
        </button>
      </div>

      {/* Demo Triggers Quick Banner */}
      <div className="px-5 mb-4">
        <div className="card p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 border border-emerald-500/20 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">⚡ 3 WhatsApp Triggers Live</span>
            <span className="text-[10px] text-white/50">Client Demo Mode</span>
          </div>
          <p className="text-[11px] text-white/70 leading-relaxed">
            1. <b>Checkout Review:</b> Triggers when barber completes a visit.
            <br />
            2. <b>45-Day Retention:</b> Fast-forward retention rebook messages below.
            <br />
            3. <b>Booking Confirm:</b> Test live appointments via the booking form.
          </p>
        </div>
      </div>

      {/* Outbox Dispatcher Actions */}
      <div className="px-5 mb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={runDispatcher}
            disabled={dispatching}
            className="btn-primary py-2.5 text-xs font-bold"
            style={{ opacity: dispatching ? 0.6 : 1 }}
          >
            {dispatching ? "Dispatching..." : "▶ Send Due Messages"}
          </button>
          <button
            onClick={createDemoRebook}
            disabled={actionBusy === "create_rebook"}
            className="py-2.5 text-xs font-bold rounded-xl text-amber-300 bg-amber-500/10 border border-amber-500/30 active:scale-95 transition-all"
          >
            {actionBusy === "create_rebook" ? "Creating..." : "+ Add 45-Day Demo"}
          </button>
        </div>

        {result && <p className="text-center text-[11px] text-emerald-400 font-medium">{result}</p>}
      </div>

      {/* Messages List */}
      <div className="px-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="section-label">Queued & Sent Outbox Messages</p>
          <span className="text-[10px] text-white/40">{messages.length} total</span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="spinner" style={{ width: 22, height: 22, margin: "0 auto" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="card p-6 text-center text-xs text-white/40">
            No messages queued yet. Tap <b>&quot;+ Add 45-Day Demo&quot;</b> or complete a scan to see triggers in action.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => {
              const waUrl = getWhatsAppWebUrl(m.to ?? "919876543210", m.preview);
              const isPending = m.status === "pending";

              return (
                <div key={m.id} className="card p-4 space-y-2.5 relative hover:border-white/20 transition-all">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: "rgba(143,167,154,0.15)", color: "var(--accent)" }}
                      >
                        {TYPE_LABEL[m.type] ?? m.type}
                      </span>
                      {m.hasImage && <span className="text-[11px]" title="Contains hairstyle photo">🖼️ Photo</span>}
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        background: `${STATUS_COLOR[m.status] ?? "#6B7280"}22`,
                        color: STATUS_COLOR[m.status] ?? "#6B7280",
                      }}
                    >
                      {m.status}
                    </span>
                  </div>

                  {/* Message Preview Text */}
                  <p className="text-xs leading-relaxed text-white/90 font-sans">{m.preview}</p>

                  {/* Customer Meta */}
                  <p className="text-[10px] text-white/50">
                    {m.customerName ?? m.to ?? "Customer"} ·{" "}
                    {m.status === "sent" && m.sentAt
                      ? `Sent ${new Date(m.sentAt).toLocaleString("en-IN")}`
                      : `Due ${new Date(m.sendAt).toLocaleString("en-IN")}`}
                  </p>

                  {/* Action Buttons Row */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    {/* Fast Forward 45 Days Button for Retention Rebook */}
                    {m.type === "rebook" && isPending && (
                      <button
                        onClick={() => fastForward45Days(m.id)}
                        disabled={actionBusy === m.id}
                        className="py-1 px-2.5 rounded-lg text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 active:scale-95"
                      >
                        {actionBusy === m.id ? "Fast-Forwarding..." : "⏩ Fast-Forward 45 Days"}
                      </button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => setSelectedMsg(m)}
                        className="py-1 px-2.5 rounded-lg text-[10px] font-bold text-white/80 bg-white/10 hover:bg-white/20 active:scale-95"
                      >
                        👁️ Smartphone Preview
                      </button>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1 px-2.5 rounded-lg text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-95"
                      >
                        📱 Open WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Smartphone Preview Modal */}
      {selectedMsg && (
        <WhatsAppPreviewModal
          isOpen={!!selectedMsg}
          onClose={() => setSelectedMsg(null)}
          triggerType={
            selectedMsg.type === "review"
              ? "review"
              : selectedMsg.type === "rebook"
              ? "rebook"
              : "booking_confirm"
          }
          customerName={selectedMsg.customerName ?? "Valued Customer"}
          phone={selectedMsg.to ?? "919876543210"}
          messageText={selectedMsg.preview}
          headerImageUrl={selectedMsg.headerImageUrl ?? undefined}
          sentTime={selectedMsg.sentAt ? new Date(selectedMsg.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined}
        />
      )}

      <BottomNav />
    </div>
  );
}
