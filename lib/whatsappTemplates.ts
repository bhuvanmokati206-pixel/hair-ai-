// WhatsApp message templates — the exact copy to submit to Meta (WhatsApp
// Manager → Message Templates), and the local renderer used by simulation mode
// so you can preview the real message before any credentials exist.
//
// Placeholder order MUST match the bodyParams passed in lib/messageQueue.ts.

export type TemplateDef = {
  name: string;
  category: "UTILITY" | "MARKETING";
  language: string;
  // {{1}}, {{2}}… body with a human description of each param.
  body: string;
  params: string[]; // description per placeholder, in order
  hasHeaderImage?: boolean;
  note?: string;
};

export const TEMPLATES: Record<string, TemplateDef> = {
  // Review — tied to THIS visit (barber + style + salon named), which is what
  // keeps it UTILITY (~₹0.145) instead of MARKETING (~₹1.09).
  visit_feedback: {
    name: "visit_feedback",
    category: "UTILITY",
    language: "en",
    body: "Hi {{1}}! How was your {{2}} with {{3}} at {{4}} today? We'd love your feedback — reply with a rating from 1 to 5. ⭐",
    params: ["customer name", "style", "barber", "salon"],
    note: "Keep it tied to the specific visit (style + barber) or Meta reclassifies it as Marketing.",
  },

  // Rebook — 45-day sequel retention message with side-by-side transformation header.
  rebook_reminder: {
    name: "rebook_reminder",
    category: "MARKETING",
    language: "en",
    body: `Bro... your haircut is 45 days old 💀✂️

We’re not saying it’s bad...
we’re just saying it’s probably ready for a sequel. 👀🔥

Remember that fresh look you walked out with last time?
That was Chapter 1.
Now it’s time for the next upgrade. 😉

Don’t wait till your hair starts making decisions for you 😂

Reply "BOOK" and we'll get you a slot. ✂️

— {{1}} —
LET’S GET YOU LOOKING FRESH AGAIN.`,
    params: ["salon"],
    hasHeaderImage: true,
  },

  // Booking confirmation — sent immediately upon appointment booking.
  booking_confirmation: {
    name: "booking_confirmation",
    category: "UTILITY",
    language: "en",
    body: "Booking Confirmed! ✂️ Hi {{1}}, your appointment at {{2}} with {{3}} for {{4}} is set for {{5}}. Address: {{6}}. Reply CANCEL or RESCHEDULE anytime.",
    params: ["customer name", "salon", "barber", "service", "date/time", "address"],
  },
};

/** Fill a template's {{n}} placeholders with the ordered params — for previews. */
export function renderTemplate(templateName: string, bodyParams: string[]): string {
  const tpl = TEMPLATES[templateName];
  if (!tpl) return `[${templateName}] ${bodyParams.join(" · ")}`;
  return tpl.body.replace(/\{\{(\d+)\}\}/g, (_, n) => bodyParams[Number(n) - 1] ?? `{{${n}}}`);
}

