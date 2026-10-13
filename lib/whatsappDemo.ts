// WhatsApp Demo Helper (Option A)
// Generates formatted text and wa.me URLs for live client demonstration of triggers.

import { normalizePhone } from "./whatsapp";
import { renderTemplate } from "./whatsappTemplates";

export type TriggerType = "review" | "rebook" | "booking_confirm";

export interface DemoTriggerPayload {
  toPhone?: string;
  customerName?: string;
  salonName?: string;
  barberName?: string;
  styleName?: string;
  serviceName?: string;
  bookingDateTime?: string;
  salonAddress?: string;
  heroImageUrl?: string;
}

/** Constructs a direct WhatsApp web/app link to send a pre-filled message */
export function getWhatsAppWebUrl(phone: string, text: string): string {
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/** Formats the final text for display or direct wa.me link */
export function formatTriggerDemoText(type: TriggerType, data: DemoTriggerPayload): string {
  const customerName = data.customerName ?? "Alex";
  const salonName = data.salonName ?? "Modern Edge Salon";
  const barberName = data.barberName ?? "Master Barber Sam";
  const styleName = data.styleName ?? "Textured Crop Fade";

  if (type === "review") {
    return renderTemplate("visit_feedback", [customerName, styleName, barberName, salonName]);
  }

  if (type === "rebook") {
    return renderTemplate("rebook_reminder", [salonName]);
  }

  if (type === "booking_confirm") {
    const serviceName = data.serviceName ?? "Haircut & Beard Styling";
    const dateTime = data.bookingDateTime ?? "Tomorrow at 4:30 PM";
    const address = data.salonAddress ?? "MG Road, Suite 4B";
    return renderTemplate("booking_confirmation", [
      customerName,
      salonName,
      barberName,
      serviceName,
      dateTime,
      address,
    ]);
  }

  return `[${type}] Hello ${customerName} from ${salonName}!`;
}
