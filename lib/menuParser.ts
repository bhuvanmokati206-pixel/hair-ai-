// Menu text → structured services, two ways:
//
//   parseMenuText(text)    — deterministic, no network. Good for clean rate-card
//                            text (name … price [memberPrice], length rows, etc.).
//   aiParseMenuText(text)  — Groq (openai/gpt-oss-120b) structures messy input.
//                            This is the "AI import, without Claude" path — Groq,
//                            not Anthropic. Falls back to the rules parser on error.
//
// Both return raw service objects; the caller runs them through sanitizeService()
// before writing to the DB.

import type { MenuKind, Target } from "@/lib/salonMenu";

export type ParsedService = {
  category: string;
  section?: string;
  name: string;
  kind: MenuKind;
  gender: "women" | "men" | "unisex";
  variants: { label: string; price: number; memberPrice?: number; lengthBand: "short" | "medium" | "long" | "any" }[];
  targets: Target[];
};

// ── keyword inference ─────────────────────────────────────────────────────────
function inferKind(text: string): MenuKind {
  const t = text.toLowerCase();
  if (/\bcombo\b|\+/.test(t)) return "combo";
  if (/straighten|smoothen|rebond|nanoplast|botox|keratin|texture/.test(t)) return "texture";
  if (/colou?r|highlight|balayage|ombre|streak|touch-?up|global/.test(t)) return "colour";
  if (/massage/.test(t)) return "massage";
  if (/spa|ritual|treatment|scalp|nourish|hydrat|anti[- ]?frizz|repair|infusion|dandruff|hair ?fall|hair ?loss/.test(t)) return "treatment";
  if (/blow|iron|roller|makeup|styling|shampoo|conditioning|setting/.test(t)) return "styling";
  if (/cut|crop|fade|trim|shave|beard/.test(t)) return "haircut";
  return "other";
}

function inferTargets(text: string): Target[] {
  const t = text.toLowerCase();
  const out = new Set<Target>();
  if (/dry|hydrat|nourish|moist/.test(t)) out.add("dryness");
  if (/frizz|smoothen/.test(t)) out.add("frizz");
  if (/hair ?fall|hair ?loss|density|follicle|aminexil|serioxyl|growth|thinning/.test(t)) out.add("hairfall");
  if (/dandruff|flake/.test(t)) out.add("dandruff");
  if (/oil|sebum|clean ?up|shampeel/.test(t)) out.add("oiliness");
  if (/colou?r ?(damage|last|seal|lock)/.test(t)) out.add("colour-damage");
  if (/breakage|rebuild|restore|strong|elastic|bond/.test(t)) out.add("breakage");
  if (/repair|regenerat|botox|protein|damage/.test(t)) out.add("damage");
  if (/soothing|sensitive/.test(t)) out.add("scalp-sensitive");
  if (/itch|scalp facial/.test(t)) out.add("itchy-scalp");
  if (/grey|gray|white hair|touch-?up|global colou?r/.test(t)) out.add("greying");
  if (/volume|density|thick/.test(t)) out.add("volume");
  if (/straighten|rebond/.test(t)) out.add("straightening");
  if (/smoothen|silky|shine|gloss/.test(t)) out.add("shine");
  if (/massage|relax|spa/.test(t)) out.add("relax");
  return [...out];
}

function lengthBandFor(label: string): "short" | "medium" | "long" | "any" {
  const l = label.toLowerCase();
  if (/long/.test(l)) return "long";
  if (/medium|short/.test(l)) return "medium";
  return "any";
}

// Pull trailing prices off a line. "Basic Cut with blast dry 419 349" →
// { name: "Basic Cut with blast dry", prices: [419, 349] }.
function splitNameAndPrices(line: string): { name: string; prices: number[] } {
  // Grab a run of 1–3 numbers (with optional ₹ / commas) at the end of the line.
  const m = line.match(/^(.*?)[\s.:–-]*((?:₹?\s?[\d,]{2,6}\s*){1,3})$/);
  if (!m) return { name: line.trim(), prices: [] };
  const prices = (m[2].match(/[\d,]{2,6}/g) ?? [])
    .map((n) => parseInt(n.replace(/,/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n >= 10);
  return { name: m[1].trim(), prices };
}

const LENGTH_LABEL = /^(upto\s+medium\s+length|medium\s+length|medium|upto\s+medium|long\s+length|long|short)\b/i;

/**
 * Deterministic parser. Heuristics:
 *  • A line that is mostly UPPERCASE and has no price → category header.
 *  • A Title-Case line with no price → section header (or a service whose length
 *    variants follow on the next lines).
 *  • A line ending in 1–2 numbers → a service (price, memberPrice).
 *  • A length-labelled line ending in numbers → a variant of the service above.
 */
export function parseMenuText(text: string, gender: "women" | "men" | "unisex" = "unisex"): ParsedService[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const services: ParsedService[] = [];
  let category = "Uncategorised";
  let section: string | undefined;
  let pendingName: string | null = null; // a name line whose prices are on following length rows

  const isUpper = (s: string) => s.replace(/[^a-z]/gi, "").length > 0 && s === s.toUpperCase();

  const pushService = (name: string, variants: ParsedService["variants"]) => {
    // Infer kind/targets from the NAME first, so a section note like
    // "with shampoo & conditioner wash" can't turn a haircut into styling.
    let kind = inferKind(name);
    if (kind === "other") kind = inferKind(`${section ?? ""} ${category}`);
    const targets = inferTargets(`${name} ${section ?? ""} ${category}`);
    services.push({ category, section, name, kind, gender, variants, targets });
  };

  const skip = (l: string) =>
    /price\s+in\s+₹|inclusive of all taxes|^member$|^\*|t&c|save up to|offer available/i.test(l) &&
    splitNameAndPrices(l).prices.length === 0;

  const isLengthRow = (l: string) => LENGTH_LABEL.test(l) && splitNameAndPrices(l).prices.length > 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skip(line)) continue;

    const { name, prices } = splitNameAndPrices(line);

    // length-variant row → attach to the pending name or the last service
    if (isLengthRow(line)) {
      const label = name || line.replace(/[\d,₹\s]+$/, "").trim();
      const variant = { label, price: prices[0], memberPrice: prices[1], lengthBand: lengthBandFor(label) };
      if (pendingName) { pushService(pendingName, [variant]); pendingName = null; }
      else if (services.length) services[services.length - 1].variants.push(variant);
      continue;
    }

    if (prices.length === 0) {
      // No price on this line. If the NEXT meaningful line is a length row, this
      // is a service name whose prices follow; otherwise it's a header.
      let j = i + 1;
      while (j < lines.length && skip(lines[j])) j++;
      const nextIsLengthRow = j < lines.length && isLengthRow(lines[j]);
      if (nextIsLengthRow) { pendingName = line.replace(/[:*].*$/, "").trim(); continue; }

      if (isUpper(line) && line.length <= 44) { category = titleCase(line); section = undefined; }
      else if (line.length <= 48) { section = line.replace(/[:*].*$/, "").trim(); }
      pendingName = null;
      continue;
    }

    // a normal service line with its own price(s)
    pushService(name, [{ label: "", price: prices[0], memberPrice: prices[1], lengthBand: "any" }]);
    pendingName = null;
  }

  return services.filter((s) => s.variants.length > 0 && s.name.length > 1);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── AI path (Groq, not Claude) ────────────────────────────────────────────────
export async function aiParseMenuText(
  text: string,
  gender: "women" | "men" | "unisex" = "unisex",
): Promise<{ services: ParsedService[]; source: "ai" | "rules" }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { services: parseMenuText(text, gender), source: "rules" };

  const prompt = `You are structuring a salon rate card into JSON. Below is raw menu text (may be messy / OCR'd).
Extract every bookable service. Return ONLY JSON: {"services":[{"category":"","section":"","name":"","kind":"haircut|styling|treatment|texture|colour|massage|combo|other","variants":[{"label":"","price":0,"memberPrice":0,"lengthBand":"short|medium|long|any"}],"targets":["dryness|frizz|hairfall|dandruff|oiliness|colour-damage|breakage|damage|scalp-sensitive|itchy-scalp|greying|volume|straightening|smoothening|shine|relax"]}]}
Rules: prices are integers (drop ₹ and commas). If a service lists "Upto Medium Length" and "Long" prices, make two variants with those lengthBands. If two numbers per row, first is price and second is memberPrice. Pick targets only from the given list, based on what the service treats. Omit non-service header/footer lines.

RATE CARD:
${text.slice(0, 12000)}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 8000,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { services: parseMenuText(text, gender), source: "rules" };
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const services = Array.isArray(parsed.services) ? parsed.services : [];
    if (services.length === 0) return { services: parseMenuText(text, gender), source: "rules" };
    // stamp gender (the card is single-gender) and coerce shape lightly
    for (const s of services) s.gender = gender;
    return { services, source: "ai" };
  } catch {
    return { services: parseMenuText(text, gender), source: "rules" };
  }
}
