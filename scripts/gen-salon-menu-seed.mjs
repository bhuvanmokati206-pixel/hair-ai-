// Generates supabase/seed-salon-menu.sql from lib/salonMenu.ts, attaching every
// service to the Fish Net Salon. Run: npx tsx scripts/gen-salon-menu-seed.mjs
// Re-run whenever SALON_MENU changes.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SALON_MENU } from "../lib/salonMenu.ts";

// Fish Net Salon — fixed id from supabase/seed.sql. Do NOT change the salon name.
const SALON_ID = "11111111-1111-1111-1111-111111111111";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "supabase", "seed-salon-menu.sql");

const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const textArr = (arr) => "ARRAY[" + (arr ?? []).map(q).join(", ") + "]::text[]";
const jsonb = (v) => q(JSON.stringify(v)) + "::jsonb";

const rows = SALON_MENU.map((s, i) => {
  const id = `fishnet:${s.id}`;
  return "  (" + [
    q(id),
    q(SALON_ID),
    q(s.id),
    q(s.category),
    q(s.section),
    q(s.name),
    q(s.gender),
    q(s.kind),
    jsonb(s.variants),
    textArr(s.targets),
    q(s.note),
    i, // sort_order preserves menu order
  ].join(", ") + ")";
}).join(",\n");

const sql = `-- ═══════════════════════════════════════════════════════════════════════════
-- Hair AI — Fish Net Salon menu seed. GENERATED — do not edit by hand.
-- Source: lib/salonMenu.ts  ·  Regenerate: npx tsx scripts/gen-salon-menu-seed.mjs
-- Requires supabase/add-salon-menu.sql (table) and the Fish Net Salon row
-- (supabase/seed.sql) to exist first.
-- Idempotent: upserts by id. ${SALON_MENU.length} services.
-- ═══════════════════════════════════════════════════════════════════════════

insert into menu_services
  (id, salon_id, slug, category, section, name, gender, kind, variants, targets, note, sort_order)
values
${rows}
on conflict (id) do update set
  category   = excluded.category,
  section    = excluded.section,
  name       = excluded.name,
  gender     = excluded.gender,
  kind       = excluded.kind,
  variants   = excluded.variants,
  targets    = excluded.targets,
  note       = excluded.note,
  sort_order = excluded.sort_order,
  active     = true,
  updated_at = now();
`;

writeFileSync(outPath, sql);
console.log(`Wrote ${SALON_MENU.length} services for Fish Net Salon to ${outPath}`);
