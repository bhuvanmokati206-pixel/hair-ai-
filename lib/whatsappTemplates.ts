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

  // Rebook — persuades a new visit, so it is MARKETING by definition. Header
  // image = the customer's previous generated look.
  rebook_reminder: {
    name: "rebook_reminder",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}, it's been a while since your {{2}} at {{3}}! Ready for a fresh look? Reply BOOK to grab a slot. ✂️",
    params: ["customer name", "style", "salon"],
    hasHeaderImage: true,
  },
};

/** Fill a template's {{n}} placeholders with the ordered params — for previews. */
export function renderTemplate(templateName: string, bodyParams: string[]): string {
  const tpl = TEMPLATES[templateName];
  if (!tpl) return `[${templateName}] ${bodyParams.join(" · ")}`;
  return tpl.body.replace(/\{\{(\d+)\}\}/g, (_, n) => bodyParams[Number(n) - 1] ?? `{{${n}}}`);
}
