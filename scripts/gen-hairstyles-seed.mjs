// Generates supabase/seed-hairstyles.sql from lib/hairstyleData.ts.
// Run with: npx tsx scripts/gen-hairstyles-seed.mjs
// Re-run whenever HAIRSTYLES changes so the seed stays in sync with the catalog.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { HAIRSTYLES } from "../lib/hairstyleData.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "supabase", "seed-hairstyles.sql");

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const textArr = (arr) => "ARRAY[" + arr.map(q).join(", ") + "]::text[]";
const intArr = (arr) => "ARRAY[" + arr.map((n) => Number(n)).join(", ") + "]::int[]";
const jsonb = (v) => q(JSON.stringify(v)) + "::jsonb";

const rows = HAIRSTYLES.map((h) => {
  const s = h.specs;
  return "  (" + [
    q(h.id),
    q(h.name),
    q(h.category),
    q(h.description),
    textArr(h.photos),
    textArr(s.faceShapes),
    q(s.hairTexture),
    q(s.maintenance),
    q(s.length),
    q(s.stylingTime),
    jsonb(h.reviews),
    intArr(h.weeklyTrend),
  ].join(", ") + ")";
}).join(",\n");

const sql = `-- ═══════════════════════════════════════════════════════════════════════════
-- Hair AI — hairstyles catalog seed. GENERATED — do not edit by hand.
-- Source: lib/hairstyleData.ts  ·  Regenerate: npx tsx scripts/gen-hairstyles-seed.mjs
-- Requires supabase/add-hairstyles.sql to have been run first.
-- Idempotent: upserts by id, so re-running refreshes rows without duplicating.
-- ${HAIRSTYLES.length} styles.
-- ═══════════════════════════════════════════════════════════════════════════

insert into hairstyles
  (id, name, category, description, photos, face_shapes, hair_texture, maintenance, length, styling_time, reviews, weekly_trend)
values
${rows}
on conflict (id) do update set
  name         = excluded.name,
  category     = excluded.category,
  description  = excluded.description,
  photos       = excluded.photos,
  face_shapes  = excluded.face_shapes,
  hair_texture = excluded.hair_texture,
  maintenance  = excluded.maintenance,
  length       = excluded.length,
  styling_time = excluded.styling_time,
  reviews      = excluded.reviews,
  weekly_trend = excluded.weekly_trend,
  updated_at   = now();
`;

writeFileSync(outPath, sql);
console.log(`Wrote ${HAIRSTYLES.length} styles to ${outPath}`);
