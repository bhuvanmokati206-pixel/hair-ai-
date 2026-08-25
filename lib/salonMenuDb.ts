// DB <-> app mapping for the menu_services table (see supabase/add-salon-menu.sql).
// Keeps the wire shape the editor UI uses in one place, separate from the static
// seed data in lib/salonMenu.ts.

import type { MenuKind, PriceVariant, Target } from "@/lib/salonMenu";

export const MENU_KINDS: MenuKind[] = [
  "haircut", "styling", "treatment", "texture", "colour", "massage", "combo", "other",
];

export const TARGET_TAGS: Target[] = [
  "dryness", "frizz", "hairfall", "dandruff", "oiliness", "colour-damage", "breakage",
  "damage", "scalp-sensitive", "itchy-scalp", "greying", "volume", "straightening",
  "smoothening", "shine", "relax",
];

// A menu service as it travels over the wire and lives in the editor.
export type MenuServiceRow = {
  id: string;          // "<salonSlug>:<slug>" — stable across edits
  slug: string;        // unique within the salon
  category: string;
  section: string | null;
  name: string;
  gender: "women" | "men" | "unisex";
  kind: MenuKind;
  variants: PriceVariant[];
  targets: string[];
  note: string | null;
  active: boolean;
  sort_order: number;
};

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

// Coerce arbitrary parsed/edited input into a valid variants array.
export function normalizeVariants(input: unknown): PriceVariant[] {
  if (!Array.isArray(input)) return [];
  const out: PriceVariant[] = [];
  for (const v of input) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const price = Number(o.price);
    if (!Number.isFinite(price)) continue;
    const memberPrice = Number(o.memberPrice);
    const band = String(o.lengthBand ?? "any");
    out.push({
      label: String(o.label ?? ""),
      price: Math.round(price),
      memberPrice: Number.isFinite(memberPrice) ? Math.round(memberPrice) : undefined,
      lengthBand: (["short", "medium", "long", "any"].includes(band) ? band : "any") as PriceVariant["lengthBand"],
    });
  }
  return out;
}

// Validate + clean one incoming service (from the editor or the importer).
// Returns { row } or { error }.
export function sanitizeService(
  input: Record<string, unknown>,
  salonSlug: string,
): { row: Omit<MenuServiceRow, "sort_order" | "active"> } | { error: string } {
  const name = String(input.name ?? "").trim();
  if (!name) return { error: "Service name is required" };

  const kind = String(input.kind ?? "other") as MenuKind;
  if (!MENU_KINDS.includes(kind)) return { error: `Unknown kind "${kind}"` };

  const genderRaw = String(input.gender ?? "unisex");
  const gender = (["women", "men", "unisex"].includes(genderRaw) ? genderRaw : "unisex") as MenuServiceRow["gender"];

  const variants = normalizeVariants(input.variants);
  if (variants.length === 0) return { error: `"${name}" needs at least one price` };

  const slug = String(input.slug ?? "").trim() || slugify(name);
  const targets = Array.isArray(input.targets)
    ? (input.targets as unknown[]).map(String).filter((t) => TARGET_TAGS.includes(t as Target))
    : [];

  return {
    row: {
      id: `${salonSlug}:${slug}`,
      slug,
      category: String(input.category ?? "Uncategorised").trim() || "Uncategorised",
      section: input.section ? String(input.section).trim() : null,
      name,
      gender,
      kind,
      variants,
      targets,
      note: input.note ? String(input.note).trim() : null,
    },
  };
}
