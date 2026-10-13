"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getWhatsAppWebUrl } from "@/lib/whatsappDemo";

interface WhatsAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  triggerType: "review" | "rebook" | "booking_confirm";
  customerName?: string;
  phone?: string;
  messageText: string;
  headerImageUrl?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  sentTime?: string;
}

const TYPE_TITLE: Record<string, { label: string; tagColor: string }> = {
  review: { label: "Trigger 1: Instant Review Request", tagColor: "#C9A15C" },
  rebook: { label: "Trigger 2: 45-Day Retention Sequel", tagColor: "#8FA79A" },
  booking_confirm: { label: "Trigger 3: Booking Confirmation", tagColor: "#4FD69C" },
};

export default function WhatsAppPreviewModal({
  isOpen,
  onClose,
  triggerType,
  phone = "919876543210",
  messageText,
  headerImageUrl,
  beforeImageUrl,
  afterImageUrl,
  sentTime,
}: WhatsAppPreviewModalProps) {
  if (!isOpen) return null;

  const displayTime = sentTime ?? new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const waUrl = getWhatsAppWebUrl(phone, messageText);
  const typeInfo = TYPE_TITLE[triggerType] ?? { label: "WhatsApp Notification", tagColor: "#4FD69C" };

  // Fallback demo photos for 45-day comparison
  const lastLookPhoto = beforeImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80";
  const nextLookPhoto = afterImageUrl || headerImageUrl || "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-sm max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            background: "#0B141A", // Dark WhatsApp background
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Top Banner Tag */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/10" style={{ background: "rgba(18,27,34,0.95)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: typeInfo.tagColor }} />
              <span className="text-[11px] font-bold text-white/90">{typeInfo.label}</span>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-xs w-6 h-6 rounded-full flex items-center justify-center bg-white/5 active:scale-90"
            >
              ✕
            </button>
          </div>

          {/* WhatsApp Header Bar */}
          <div className="px-4 py-3 bg-[#1F2C34] flex items-center gap-3 border-b border-white/5 shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold text-xs shadow">
              ✂️
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">Salon AI Assistant</h4>
              <p className="text-[10px] text-emerald-400 font-medium">● WhatsApp Business</p>
            </div>
          </div>

          {/* Chat Background & Message Card */}
          <div
            className="p-3 sm:p-4 flex-1 overflow-y-auto flex flex-col justify-start min-h-[300px] relative space-y-3"
            style={{
              backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          >
            {/* Timestamp Badge */}
            <div className="self-center px-3 py-1 rounded-lg bg-[#182229] text-[10px] text-white/50 font-medium tracking-wide">
              TODAY
            </div>

            {/* Green WhatsApp Speech Bubble */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="self-end w-full rounded-2xl rounded-tr-xs p-3 shadow-xl relative"
              style={{
                background: "#005C4B", // WhatsApp dark green bubble
                color: "#E9EDEF",
              }}
            >
              {/* Trigger 2: 45-Day Sequel Side-by-Side Card */}
              {triggerType === "rebook" ? (
                <div
                  className="mb-3 rounded-2xl overflow-hidden p-3 text-center border border-emerald-400/20 shadow-inner"
                  style={{
                    background: "linear-gradient(170deg, #0d382c 0%, #061e17 60%, #03100c 100%)",
                  }}
                >
                  {/* Card Title */}
                  <div className="flex items-center justify-center gap-1.5 mb-2.5">
                    <span className="text-amber-300 text-xs">✨</span>
                    <h5 className="text-[13px] font-black tracking-wider text-amber-200 uppercase font-sans">
                      45 DAYS LATER...
                    </h5>
                    <span className="text-amber-300 text-xs">👑</span>
                  </div>

                  {/* Side-by-Side Images */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {/* Left: Your Last Look */}
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full aspect-[4/5] rounded-xl overflow-hidden border-2 border-white/20 shadow-md bg-black/40 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={lastLookPhoto}
                          alt="Your Last Look"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="mt-1.5 px-2 py-0.5 rounded-md bg-[#C9A15C] text-[8px] sm:text-[9px] font-black text-black uppercase tracking-tight shadow">
                        YOUR LAST LOOK
                      </div>
                    </div>

                    {/* Arrow Divider */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <span className="text-amber-300 text-lg font-black animate-pulse">➔</span>
                    </div>

                    {/* Right: Your Next Look */}
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full aspect-[4/5] rounded-xl overflow-hidden border-2 border-amber-400/70 shadow-md bg-black/40 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={nextLookPhoto}
                          alt="Your Next Look"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="mt-1.5 px-2 py-0.5 rounded-md bg-[#C9A15C] text-[8px] sm:text-[9px] font-black text-black uppercase tracking-tight shadow">
                        YOUR NEXT LOOK
                      </div>
                    </div>
                  </div>

                  {/* Sequel Footer Badge */}
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/50 border border-amber-400/30">
                    <span className="text-[10px] font-extrabold text-amber-300 tracking-wider uppercase">
                      TIME FOR THE SEQUEL ✂️
                    </span>
                  </div>
                </div>
              ) : (
                /* Standard Image for other triggers */
                headerImageUrl && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-white/10 aspect-square max-h-48 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={headerImageUrl} alt="Header Preview" className="w-full h-full object-cover" />
                  </div>
                )
              )}

              {/* Message Text */}
              <p className="text-xs leading-relaxed whitespace-pre-line font-sans text-white/95">
                {messageText}
              </p>

              {/* Quick Reply WhatsApp Button Preview */}
              {triggerType === "rebook" && (
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <div className="w-full py-2 px-3 rounded-xl bg-[#09382F] border border-emerald-400/30 flex items-center justify-center gap-2 text-center shadow">
                    <span className="text-xs">💬</span>
                    <span className="text-xs font-bold text-amber-300">Reply &quot;BOOK&quot;</span>
                    <span className="text-[11px] text-white/80">and we&apos;ll get you a slot. ✂️</span>
                  </div>
                </div>
              )}

              {/* Time & Double Checkmark */}
              <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-white/60">
                <span>{displayTime}</span>
                <span className="text-cyan-300 font-bold">✓✓</span>
              </div>
            </motion.div>
          </div>

          {/* Action Buttons Footer */}
          <div className="p-3 sm:p-4 bg-[#1F2C34] border-t border-white/10 flex flex-col gap-2 shrink-0">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all shadow-lg"
            >
              <span>📱 Open & Send in Real WhatsApp</span>
            </a>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Close Preview
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
