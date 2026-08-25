// Creates a storage folder per salon and moves any existing photos into it.
//
//   node scripts/organise-salon-storage.mjs
//
// Old layout:  visits/<visitId>/generated-haircut-front-1786200699882.jpg
// New layout:  FNS-5572/<visitId>/textured-crop-front.jpg
//              FNS-5572/<visitId>/original-front.jpg
//
// Salon-scoped, and named after the style instead of a timestamp, so each visit
// folder reads as a before/after set you can eyeball or script against.
//
// Safe to re-run: anything already in place is skipped.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const BUCKET = "visit-photos";
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const slug = (t) =>
  (t ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "style";

// ── 1. A folder per salon ─────────────────────────────────────────────────────
// Supabase Storage has no real directories — a "folder" only exists while it
// holds an object. A .keep marker makes each salon visible in the dashboard
// before its first photo lands.
const { data: salons, error: salonErr } = await db.from("salons").select("id, code, name");
if (salonErr) { console.error("could not read salons:", salonErr.message); process.exit(1); }

console.log("folders:");
for (const s of salons) {
  const folder = s.code || s.id;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(`${folder}/.keep`, new Blob([`${s.name}\n`], { type: "text/plain" }), { upsert: true });
  console.log(`  ${error ? "FAILED " : "ok     "}${folder}/  (${s.name})${error ? " — " + error.message : ""}`);
}

// ── 2. Move existing photos into the new layout ───────────────────────────────
const { data: photos, error: photoErr } = await db
  .from("visit_photos")
  .select("id, visit_id, kind, angle, service_type, style_name, storage_path");

if (photoErr) { console.error("could not read visit_photos:", photoErr.message); process.exit(1); }

// One lookup for every visit's salon, rather than a query per photo.
const visitIds = [...new Set(photos.map((p) => p.visit_id))];
const { data: visits } = await db
  .from("visits")
  .select("id, salon_id, chosen_style, salons(code)")
  .in("id", visitIds.length ? visitIds : ["00000000-0000-0000-0000-000000000000"]);

const visitById = Object.fromEntries((visits ?? []).map((v) => [v.id, v]));

console.log("\nphotos:");
if (photos.length === 0) console.log("  (none)");

let moved = 0, skipped = 0, failed = 0;

for (const p of photos) {
  const v = visitById[p.visit_id];
  const folder = v?.salons?.code || v?.salon_id || "unassigned";
  const ext = p.storage_path.split(".").pop() || "jpg";

  // Fall back to the visit's chosen style when the row has no style_name — the
  // early uploads predate that column being populated.
  const name =
    p.kind === "original"
      ? "original"
      : slug(p.style_name ?? v?.chosen_style ?? p.service_type ?? "generated");

  const target = `${folder}/${p.visit_id}/${name}-${p.angle ?? "front"}.${ext}`;

  if (p.storage_path === target) { skipped++; continue; }

  const { error: moveErr } = await db.storage.from(BUCKET).move(p.storage_path, target);
  if (moveErr) {
    console.log(`  FAILED ${p.storage_path} -> ${target}: ${moveErr.message}`);
    failed++;
    continue;
  }

  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(target);
  // The url column is cached for WhatsApp sends — a moved object with a stale
  // url would make Meta fetch a 404 and drop the image from the message.
  await db.from("visit_photos").update({ storage_path: target, url: pub?.publicUrl ?? null }).eq("id", p.id);

  console.log(`  moved  ${target}`);
  moved++;
}

console.log(`\nmoved=${moved} already-correct=${skipped} failed=${failed}`);
