"use client";

// WhatsApp outbox viewer — see every queued/sent message rendered to its final
// text, and trigger the dispatcher manually to test the flow without a scheduler
// or real credentials (simulation mode marks them sent).

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type Msg = {
  id: string; type: string; status: string; sendAt: string; sentAt: string | null;
  attempts: number; lastError: string | null; to: string | null; customerName: string | null;
  hasImage: boolean; preview: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#C9A15C", sending: "#8FA79A", sent: "#4FD69C", failed: "#E06A5C", cancelled: "#6B7280",
};
const TYPE_LABEL: Record<string, string> = { review: "Review", rebook: "Rebook", booking_confirm: "Booking", custom: "Custom" };

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/messages");
    const body = await res.json();
    if (res.ok) setMessages(body.messages ?? []);
    setLoading(false);
  }, []);

  // Fetch on mount — the load callback owns the setState. Standard data-load pattern.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const runDispatcher = async () => {
    setDispatching(true); setResult(null);
    try {
      const res = await fetch("/api/cron/dispatch", { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        setResult(`${body.simulated ? "Simulated" : "Sent"}: ${body.sent} sent · ${body.retrying} retrying · ${body.failed} failed`);
        await load();
      } else {
        setResult(body.error ?? "Dispatch failed");
      }
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-icon">←</button>
        <div>
          <p className="section-label">WhatsApp</p>
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Message outbox</h1>
        </div>
      </div>

      <div className="px-5 mb-4">
        <button onClick={runDispatcher} disabled={dispatching} className="w-full btn-primary" style={{ opacity: dispatching ? 0.6 : 1 }}>
          {dispatching ? "Running…" : "▶ Send due messages now"}
        </button>
        {result && <p className="text-center text-[11px] mt-2" style={{ color: "var(--text-secondary)" }}>{result}</p>}
        <p className="text-center text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          Simulation mode marks messages sent without calling WhatsApp.
        </p>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="text-center py-8"><div className="spinner" style={{ width: 22, height: 22, margin: "0 auto" }} /></div>
        ) : messages.length === 0 ? (
          <div className="card p-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            No messages queued yet. Complete a scan and bill a customer to queue the review + rebook.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="card p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(143,167,154,0.1)", color: "var(--accent)" }}>
                      {TYPE_LABEL[m.type] ?? m.type}
                    </span>
                    {m.hasImage && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>🖼️</span>}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${STATUS_COLOR[m.status] ?? "#6B7280"}1A`, color: STATUS_COLOR[m.status] ?? "#6B7280" }}>
                    {m.status}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{m.preview}</p>
                <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  {m.customerName ?? m.to ?? "—"} · {m.status === "sent" && m.sentAt
                    ? `sent ${new Date(m.sentAt).toLocaleString("en-IN")}`
                    : `due ${new Date(m.sendAt).toLocaleString("en-IN")}`}
                  {m.attempts > 0 ? ` · ${m.attempts} attempt${m.attempts > 1 ? "s" : ""}` : ""}
                </p>
                {m.lastError && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{m.lastError}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
