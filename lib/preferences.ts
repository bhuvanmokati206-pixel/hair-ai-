// Customer preference questionnaire — shown after photo capture, before analysis.
//
// The answers are woven into the analysis prompt so feasibleStyles + bestMatch
// reflect what the customer actually wants, not just what their hair allows.
// Each option carries a `promptHint`: the exact instruction handed to the model
// when that option is chosen. Edit the hints to change how an answer steers the AI
// without touching the route or the UI.

export type PreferenceOption = {
  value: string;   // stored + sent to the API
  label: string;   // shown on the chip
  emoji?: string;
  promptHint: string; // injected into the analysis prompt when chosen
};

export type PreferenceQuestion = {
  id: string;       // key in the answers object
  question: string; // shown to the barber/customer
  helper?: string;
  options: PreferenceOption[];
};

// 4 questions. Kept short on purpose — this sits between capture and results, so
// every extra tap is friction. All are single-select; the first is the one the
// owner asked for (professional vs casual).
export const PREFERENCE_QUESTIONS: PreferenceQuestion[] = [
  {
    id: "occasion",
    question: "What's the look for?",
    helper: "Sets the overall vibe",
    options: [
      { value: "professional", label: "Professional", emoji: "💼",
        promptHint: "Occasion is PROFESSIONAL/office — favour clean, polished, formal-appropriate cuts. Avoid extreme fades, bold colours or statement/edgy looks." },
      { value: "casual", label: "Casual", emoji: "👕",
        promptHint: "Occasion is CASUAL/everyday — favour relaxed, easy, versatile styles that look good with no fuss." },
      { value: "trendy", label: "Trendy / bold", emoji: "🔥",
        promptHint: "Occasion is TRENDY/bold — favour current, fashionable, statement cuts. Bolder fades, textured tops and modern shapes are welcome." },
      { value: "event", label: "Special event", emoji: "🎉",
        promptHint: "Occasion is a SPECIAL EVENT (wedding/party) — favour sharp, dressed-up styles that photograph well and hold for a full day." },
    ],
  },
  {
    id: "maintenance",
    question: "How much daily styling?",
    helper: "How much effort they'll put in each morning",
    options: [
      { value: "wash_and_go", label: "Wash & go", emoji: "💧",
        promptHint: "Maintenance is MINIMAL (wash-and-go) — only suggest low-upkeep styles that need no daily product or heat styling." },
      { value: "few_minutes", label: "A few minutes", emoji: "⏱️",
        promptHint: "Maintenance is MODERATE — a few minutes of styling a day is fine, but nothing high-effort." },
      { value: "happy_to_style", label: "Happy to style", emoji: "💇",
        promptHint: "Maintenance is HIGH — the customer is happy to style daily, so higher-upkeep looks (pompadours, defined quiffs) are on the table." },
    ],
  },
  {
    id: "lengthChange",
    question: "Change the length?",
    helper: "How big a cut they want",
    options: [
      { value: "keep", label: "Keep similar", emoji: "↔️",
        promptHint: "Length preference: KEEP SIMILAR — do not suggest styles that need a big cut; work with roughly the current length." },
      { value: "tidy", label: "Tidy up", emoji: "✂️",
        promptHint: "Length preference: TIDY UP — a small trim/clean-up is wanted, but no dramatic change in length." },
      { value: "big_change", label: "Big change", emoji: "✨",
        promptHint: "Length preference: BIG CHANGE — the customer is open to a noticeably shorter or restyled cut." },
    ],
  },
  {
    id: "adventurous",
    question: "How adventurous?",
    helper: "How safe or bold the suggestions should be",
    options: [
      { value: "safe", label: "Play it safe", emoji: "🛡️",
        promptHint: "Risk appetite: SAFE — stick to classic, proven, flattering styles. No experimental looks." },
      { value: "open", label: "Open to new", emoji: "🙂",
        promptHint: "Risk appetite: OPEN — mostly flattering classics, but include 1-2 fresh options they may not have considered." },
      { value: "surprise", label: "Surprise me", emoji: "🎲",
        promptHint: "Risk appetite: BOLD — include at least 2 statement/standout options alongside the safe picks." },
    ],
  },
];

export type PreferenceAnswers = Record<string, string>;

/**
 * Turns the chosen answers into the prompt block injected into the analysis.
 * Returns "" when nothing is answered, so analysis works exactly as before when
 * the step is skipped.
 */
export function preferencesToPromptBlock(answers: PreferenceAnswers | undefined): string {
  if (!answers) return "";
  const hints: string[] = [];
  for (const q of PREFERENCE_QUESTIONS) {
    const chosen = answers[q.id];
    if (!chosen) continue;
    const opt = q.options.find((o) => o.value === chosen);
    if (opt) hints.push(`- ${opt.promptHint}`);
  }
  if (hints.length === 0) return "";
  return `CUSTOMER PREFERENCES — weight these heavily when choosing feasibleStyles, bestMatch and suggestedColors. They override the "safe" default; a style the customer's hair allows but that contradicts these preferences should be dropped:\n${hints.join("\n")}`;
}
