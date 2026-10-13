-- ═══════════════════════════════════════════════════════════════════════════
-- Hair AI — Menu + Style-Library tables & seeds, in one paste.
-- Run once in Supabase → SQL Editor → New query → Run. Idempotent (safe to re-run).
-- Creates: hairstyles (catalog) + menu_services (per-salon rate card),
-- and seeds the 44 hairstyles and the 64 Green Trends services onto Fish Net Salon.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- FROM add-hairstyles.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- Hair AI — hairstyles catalog table.
-- Mirrors the `Hairstyle` type in lib/hairstyleData.ts so the Style Library can
-- be served from the database instead of (or alongside) the bundled TS array.
-- Run once in Supabase → SQL Editor. Idempotent — safe to re-run.
-- Seed rows live in supabase/seed-hairstyles.sql (generated from the TS data).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists hairstyles (
  id            text primary key,                       -- slug, e.g. 'textured-crop'
  name          text not null,
  category      text not null check (category in ('Men','Women','Unisex')),
  description   text,
  photos        text[] not null default '{}',           -- image URLs, first is the cover
  -- specs (flattened from HairstyleSpec)
  face_shapes   text[] not null default '{}',           -- ['Oval','Square', ...]
  hair_texture  text,
  maintenance   text check (maintenance in ('Low','Medium','High')),
  length        text,
  styling_time  text,
  -- rich extras
  reviews       jsonb not null default '[]'::jsonb,     -- [{customerName,rating,comment,daysAgo}]
  weekly_trend  int[]  not null default '{}',           -- last 8 weeks, oldest -> newest
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists hairstyles_category_idx on hairstyles (category);

-- keep updated_at fresh on write
create or replace function set_hairstyles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists hairstyles_set_updated_at on hairstyles;
create trigger hairstyles_set_updated_at before update on hairstyles
  for each row execute function set_hairstyles_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Catalog is public, non-sensitive reference data: anyone may read, only the
-- service role (server-side API routes) may write.
alter table hairstyles enable row level security;

do $$ begin
  create policy "hairstyles public read" on hairstyles
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "hairstyles service role write" on hairstyles
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- FROM seed-hairstyles.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- Hair AI — hairstyles catalog seed. GENERATED — do not edit by hand.
-- Source: lib/hairstyleData.ts  ·  Regenerate: npx tsx scripts/gen-hairstyles-seed.mjs
-- Requires supabase/add-hairstyles.sql to have been run first.
-- Idempotent: upserts by id, so re-running refreshes rows without duplicating.
-- 44 styles.
-- ═══════════════════════════════════════════════════════════════════════════

insert into hairstyles
  (id, name, category, description, photos, face_shapes, hair_texture, maintenance, length, styling_time, reviews, weekly_trend)
values
  ('textured-crop', 'Textured Crop', 'Men', 'Short, choppy texture on top with a tapered or faded side, low maintenance and easy to style.', ARRAY['/styles/textured-crop/1.jpg', '/styles/textured-crop/2.jpg', '/styles/textured-crop/3.jpg']::text[], ARRAY['Oval', 'Square', 'Diamond']::text[], 'Straight to wavy', 'Low', 'Short', '5 min', '[{"customerName":"Rahul S.","rating":5,"comment":"Clean look, barely needs styling.","daysAgo":3},{"customerName":"Vikram P.","rating":4,"comment":"Good for office, grows out nicely.","daysAgo":10}]'::jsonb, ARRAY[4, 6, 5, 8, 9, 12, 14, 16]::int[]),
  ('french-crop', 'French Crop', 'Men', 'Dense fringe cut straight across the forehead with tight sides — sharp and structured.', ARRAY['/styles/french-crop/1.jpg', '/styles/french-crop/2.jpg', '/styles/french-crop/3.jpg']::text[], ARRAY['Oval', 'Round']::text[], 'Straight, thick', 'Medium', 'Short', '8 min', '[{"customerName":"Aman K.","rating":5,"comment":"Best cut I''ve had, very sharp.","daysAgo":1}]'::jsonb, ARRAY[2, 3, 4, 4, 6, 7, 9, 11]::int[]),
  ('pompadour', 'Pompadour', 'Men', 'Volume swept up and back from the forehead, sides cut shorter for contrast.', ARRAY['/styles/pompadour/1.jpg', '/styles/pompadour/2.jpg', '/styles/pompadour/3.jpg']::text[], ARRAY['Oval', 'Heart']::text[], 'Thick, wavy', 'High', 'Medium', '12 min', '[{"customerName":"Dev R.","rating":4,"comment":"Needs daily product but looks premium.","daysAgo":6}]'::jsonb, ARRAY[6, 7, 6, 5, 4, 4, 3, 3]::int[]),
  ('slick-back-undercut', 'Slick Back Undercut', 'Men', 'Hair combed straight back with a hard contrast undercut on the sides.', ARRAY['/styles/slick-back-undercut/1.jpg', '/styles/slick-back-undercut/2.jpg', '/styles/slick-back-undercut/3.jpg']::text[], ARRAY['Oval', 'Square']::text[], 'Straight, medium', 'Medium', 'Medium', '10 min', '[]'::jsonb, ARRAY[3, 4, 5, 7, 8, 10, 9, 12]::int[]),
  ('buzz-cut', 'Buzz Cut', 'Men', 'Uniform short length all over using clippers — the lowest maintenance option.', ARRAY['/styles/buzz-cut/1.jpg', '/styles/buzz-cut/2.jpg', '/styles/buzz-cut/3.jpg']::text[], ARRAY['Oval', 'Square', 'Round']::text[], 'Any', 'Low', 'Very short', '0 min', '[{"customerName":"Sanjay M.","rating":5,"comment":"Wash and go, perfect for summer.","daysAgo":14}]'::jsonb, ARRAY[8, 9, 10, 9, 11, 13, 15, 18]::int[]),
  ('side-part', 'Classic Side Part', 'Men', 'Hair parted cleanly to one side with a defined line, timeless professional look.', ARRAY['/styles/side-part/1.jpg', '/styles/side-part/2.jpg', '/styles/side-part/3.jpg']::text[], ARRAY['Oval', 'Diamond']::text[], 'Straight', 'Medium', 'Medium', '7 min', '[]'::jsonb, ARRAY[5, 5, 4, 4, 3, 3, 2, 2]::int[]),
  ('quiff', 'Modern Quiff', 'Men', 'Volume pushed up and slightly back at the front, tapered sides for a sharp silhouette.', ARRAY['https://picsum.photos/seed/quiff-0/480/600', 'https://picsum.photos/seed/quiff-1/480/600', 'https://picsum.photos/seed/quiff-2/480/600']::text[], ARRAY['Oval', 'Heart', 'Square']::text[], 'Thick, wavy', 'Medium', 'Medium', '9 min', '[{"customerName":"Imran H.","rating":4,"comment":"Stylist nailed the height balance.","daysAgo":5}]'::jsonb, ARRAY[7, 8, 10, 11, 13, 12, 14, 17]::int[]),
  ('mullet', 'Modern Mullet', 'Men', 'Short on top and sides, length kept long at the back — bold, trend-driven cut.', ARRAY['/styles/mullet/1.jpg', '/styles/mullet/2.jpg', '/styles/mullet/3.jpg']::text[], ARRAY['Oval', 'Square']::text[], 'Straight to wavy', 'Medium', 'Long at back', '8 min', '[]'::jsonb, ARRAY[1, 2, 3, 5, 6, 8, 10, 13]::int[]),
  ('curtain-fringe', 'Curtain Fringe', 'Men', 'Center-parted fringe that falls naturally on both sides framing the face.', ARRAY['https://picsum.photos/seed/curtain-fringe-0/480/600', 'https://picsum.photos/seed/curtain-fringe-1/480/600', 'https://picsum.photos/seed/curtain-fringe-2/480/600']::text[], ARRAY['Oval', 'Round']::text[], 'Straight, medium', 'Medium', 'Medium', '6 min', '[{"customerName":"Yusuf A.","rating":3,"comment":"Nice but needs frequent trims to hold shape.","daysAgo":20}]'::jsonb, ARRAY[4, 4, 5, 4, 3, 3, 2, 2]::int[]),
  ('high-fade-afro', 'High Fade Afro', 'Men', 'Natural curl volume kept on top with a sharp high fade on the sides.', ARRAY['https://picsum.photos/seed/high-fade-afro-0/480/600', 'https://picsum.photos/seed/high-fade-afro-1/480/600', 'https://picsum.photos/seed/high-fade-afro-2/480/600']::text[], ARRAY['Oval', 'Square', 'Round']::text[], 'Coily, dense', 'Medium', 'Short to medium', '10 min', '[]'::jsonb, ARRAY[3, 3, 4, 5, 5, 7, 8, 9]::int[]),
  ('long-layers', 'Long Layers', 'Women', 'Face-framing layers cut throughout long length for movement and volume.', ARRAY['https://picsum.photos/seed/long-layers-0/480/600', 'https://picsum.photos/seed/long-layers-1/480/600', 'https://picsum.photos/seed/long-layers-2/480/600']::text[], ARRAY['Oval', 'Square', 'Heart']::text[], 'Any', 'Medium', 'Long', '15 min', '[{"customerName":"Priya N.","rating":5,"comment":"Bounces beautifully, great recommendation.","daysAgo":4}]'::jsonb, ARRAY[9, 10, 11, 10, 12, 14, 15, 16]::int[]),
  ('bob-cut', 'Classic Bob', 'Women', 'Chin-to-shoulder length cut blunt or layered, a sharp and easy everyday style.', ARRAY['https://picsum.photos/seed/bob-cut-0/480/600', 'https://picsum.photos/seed/bob-cut-1/480/600', 'https://picsum.photos/seed/bob-cut-2/480/600']::text[], ARRAY['Oval', 'Round', 'Heart']::text[], 'Straight to wavy', 'Low', 'Short to medium', '8 min', '[{"customerName":"Anjali T.","rating":5,"comment":"Easiest style I''ve maintained, love it.","daysAgo":2}]'::jsonb, ARRAY[10, 11, 13, 12, 14, 16, 18, 20]::int[]),
  ('pixie-cut', 'Pixie Cut', 'Women', 'Very short cropped cut with textured layers on top — bold and low maintenance.', ARRAY['https://picsum.photos/seed/pixie-cut-0/480/600', 'https://picsum.photos/seed/pixie-cut-1/480/600', 'https://picsum.photos/seed/pixie-cut-2/480/600']::text[], ARRAY['Oval', 'Heart', 'Diamond']::text[], 'Any', 'Low', 'Very short', '4 min', '[]'::jsonb, ARRAY[3, 4, 4, 5, 6, 6, 7, 8]::int[]),
  ('beach-waves', 'Beach Waves', 'Women', 'Loose, tousled waves through mid-length to long hair for a relaxed natural look.', ARRAY['https://picsum.photos/seed/beach-waves-0/480/600', 'https://picsum.photos/seed/beach-waves-1/480/600', 'https://picsum.photos/seed/beach-waves-2/480/600']::text[], ARRAY['Oval', 'Square', 'Round']::text[], 'Wavy, medium', 'Medium', 'Medium to long', '12 min', '[{"customerName":"Sneha V.","rating":4,"comment":"Great for parties, holds for hours.","daysAgo":8}]'::jsonb, ARRAY[6, 7, 8, 9, 11, 10, 12, 14]::int[]),
  ('shag-cut', 'Shag Cut', 'Unisex', 'Heavily layered, choppy cut with a textured fringe — retro-inspired and versatile.', ARRAY['https://picsum.photos/seed/shag-cut-0/480/600', 'https://picsum.photos/seed/shag-cut-1/480/600', 'https://picsum.photos/seed/shag-cut-2/480/600']::text[], ARRAY['Oval', 'Square', 'Heart']::text[], 'Wavy to curly', 'Medium', 'Medium', '10 min', '[]'::jsonb, ARRAY[2, 3, 5, 6, 8, 9, 11, 13]::int[]),
  ('crew-cut', 'Crew Cut', 'Men', 'Short, tapered cut left slightly longer at the front, graduating shorter toward the crown — clean, military-inspired and effortless.', ARRAY['https://picsum.photos/seed/crew-cut-0/480/600', 'https://picsum.photos/seed/crew-cut-1/480/600', 'https://picsum.photos/seed/crew-cut-2/480/600']::text[], ARRAY['Oval', 'Square', 'Diamond']::text[], 'Straight to wavy', 'Low', 'Short', '3 min', '[{"customerName":"Arjun D.","rating":5,"comment":"Sharp and fuss-free, exactly what I wanted.","daysAgo":4}]'::jsonb, ARRAY[6, 7, 7, 9, 10, 11, 13, 15]::int[]),
  ('caesar-cut', 'Caesar Cut', 'Men', 'Short, horizontally straight fringe combed forward with even length all around — a low-effort classic that hides a receding hairline well.', ARRAY['https://picsum.photos/seed/caesar-cut-0/480/600', 'https://picsum.photos/seed/caesar-cut-1/480/600', 'https://picsum.photos/seed/caesar-cut-2/480/600']::text[], ARRAY['Oval', 'Oblong', 'Heart']::text[], 'Straight, thick', 'Low', 'Short', '4 min', '[]'::jsonb, ARRAY[3, 3, 4, 4, 5, 6, 7, 8]::int[]),
  ('ivy-league', 'Ivy League', 'Men', 'A grown-out crew cut with enough length on top to comb and part — polished, professional and easy to dress up or down.', ARRAY['https://picsum.photos/seed/ivy-league-0/480/600', 'https://picsum.photos/seed/ivy-league-1/480/600', 'https://picsum.photos/seed/ivy-league-2/480/600']::text[], ARRAY['Oval', 'Square', 'Diamond']::text[], 'Straight', 'Medium', 'Short', '6 min', '[{"customerName":"Nikhil B.","rating":4,"comment":"Great smart-casual look, holds a side part well.","daysAgo":9}]'::jsonb, ARRAY[4, 5, 5, 6, 7, 7, 9, 10]::int[]),
  ('taper-fade', 'Taper Fade', 'Men', 'Gradual fade at the sideburns and neckline that keeps more length up top — a versatile base that pairs with almost any style.', ARRAY['https://picsum.photos/seed/taper-fade-0/480/600', 'https://picsum.photos/seed/taper-fade-1/480/600', 'https://picsum.photos/seed/taper-fade-2/480/600']::text[], ARRAY['Oval', 'Square', 'Round', 'Heart']::text[], 'Any', 'Medium', 'Short to medium', '7 min', '[{"customerName":"Rohan G.","rating":5,"comment":"Clean edges, blended perfectly.","daysAgo":2}]'::jsonb, ARRAY[10, 12, 13, 14, 16, 18, 20, 23]::int[]),
  ('burst-fade', 'Burst Fade', 'Men', 'A fade that curves around the ear and tapers into the neckline, leaving length at the back — popular with mullets and mohawks.', ARRAY['https://picsum.photos/seed/burst-fade-0/480/600', 'https://picsum.photos/seed/burst-fade-1/480/600', 'https://picsum.photos/seed/burst-fade-2/480/600']::text[], ARRAY['Oval', 'Square', 'Diamond']::text[], 'Straight to curly', 'Medium', 'Short to medium', '8 min', '[]'::jsonb, ARRAY[5, 6, 8, 9, 11, 13, 15, 18]::int[]),
  ('comb-over-fade', 'Comb Over Fade', 'Men', 'Longer top swept to one side over a faded side — a sharp, modern take on the traditional comb over.', ARRAY['https://picsum.photos/seed/comb-over-fade-0/480/600', 'https://picsum.photos/seed/comb-over-fade-1/480/600', 'https://picsum.photos/seed/comb-over-fade-2/480/600']::text[], ARRAY['Oval', 'Square', 'Oblong']::text[], 'Straight, medium', 'Medium', 'Medium', '9 min', '[{"customerName":"Faisal K.","rating":4,"comment":"Very corporate, looks premium with a bit of pomade.","daysAgo":12}]'::jsonb, ARRAY[7, 7, 8, 8, 9, 10, 11, 12]::int[]),
  ('disconnected-undercut', 'Disconnected Undercut', 'Men', 'Long top with no blend into the shaved sides — a bold, high-contrast look with maximum styling versatility.', ARRAY['https://picsum.photos/seed/disconnected-undercut-0/480/600', 'https://picsum.photos/seed/disconnected-undercut-1/480/600', 'https://picsum.photos/seed/disconnected-undercut-2/480/600']::text[], ARRAY['Oval', 'Square', 'Diamond']::text[], 'Straight to wavy', 'High', 'Medium to long', '11 min', '[]'::jsonb, ARRAY[6, 6, 7, 7, 6, 8, 9, 10]::int[]),
  ('faux-hawk', 'Faux Hawk', 'Men', 'Hair pushed up to a soft central ridge with tapered sides — the mohawk''s wearable, work-friendly cousin.', ARRAY['https://picsum.photos/seed/faux-hawk-0/480/600', 'https://picsum.photos/seed/faux-hawk-1/480/600', 'https://picsum.photos/seed/faux-hawk-2/480/600']::text[], ARRAY['Oval', 'Square', 'Round']::text[], 'Thick, any', 'Medium', 'Short to medium', '8 min', '[{"customerName":"Kabir S.","rating":4,"comment":"Fun without being too extreme.","daysAgo":7}]'::jsonb, ARRAY[4, 5, 5, 6, 6, 7, 8, 9]::int[]),
  ('two-block', 'Two Block Cut', 'Men', 'Volume and length kept on top with the under-sides and back clipped short — the signature Korean style, soft and youthful.', ARRAY['https://picsum.photos/seed/two-block-0/480/600', 'https://picsum.photos/seed/two-block-1/480/600', 'https://picsum.photos/seed/two-block-2/480/600']::text[], ARRAY['Oval', 'Round', 'Heart']::text[], 'Straight, medium', 'Medium', 'Medium', '9 min', '[{"customerName":"Jin H.","rating":5,"comment":"K-drama look, everyone asks where I got it.","daysAgo":3}]'::jsonb, ARRAY[8, 10, 12, 14, 15, 17, 19, 22]::int[]),
  ('man-bun', 'Man Bun', 'Men', 'Long hair gathered into a bun or top-knot, often over tapered sides — relaxed yet put-together.', ARRAY['https://picsum.photos/seed/man-bun-0/480/600', 'https://picsum.photos/seed/man-bun-1/480/600', 'https://picsum.photos/seed/man-bun-2/480/600']::text[], ARRAY['Oval', 'Square', 'Oblong']::text[], 'Straight to wavy', 'Medium', 'Long', '5 min', '[]'::jsonb, ARRAY[9, 8, 8, 7, 7, 8, 8, 9]::int[]),
  ('bro-flow', 'Bro Flow', 'Men', 'Medium-to-long hair swept straight back and left to fall naturally — an easy, grown-out look with movement.', ARRAY['https://picsum.photos/seed/bro-flow-0/480/600', 'https://picsum.photos/seed/bro-flow-1/480/600', 'https://picsum.photos/seed/bro-flow-2/480/600']::text[], ARRAY['Oval', 'Square', 'Diamond']::text[], 'Wavy, medium', 'Medium', 'Medium to long', '6 min', '[{"customerName":"Sameer J.","rating":4,"comment":"Low effort but looks great after a shower shake.","daysAgo":15}]'::jsonb, ARRAY[6, 7, 8, 9, 10, 11, 12, 13]::int[]),
  ('edgar-cut', 'Edgar Cut', 'Men', 'A blunt, straight-across fringe over a high skin fade — a bold, geometric statement cut.', ARRAY['https://picsum.photos/seed/edgar-cut-0/480/600', 'https://picsum.photos/seed/edgar-cut-1/480/600', 'https://picsum.photos/seed/edgar-cut-2/480/600']::text[], ARRAY['Oval', 'Oblong', 'Diamond']::text[], 'Straight, thick', 'Medium', 'Short', '7 min', '[]'::jsonb, ARRAY[3, 4, 6, 8, 10, 12, 14, 16]::int[]),
  ('360-waves', '360 Waves', 'Men', 'Short coily hair brushed and trained into a rippling wave pattern across the whole head — a low-cut classic requiring daily brushing.', ARRAY['https://picsum.photos/seed/360-waves-0/480/600', 'https://picsum.photos/seed/360-waves-1/480/600', 'https://picsum.photos/seed/360-waves-2/480/600']::text[], ARRAY['Oval', 'Square', 'Round']::text[], 'Coily, dense', 'High', 'Very short', '10 min', '[{"customerName":"Malik T.","rating":5,"comment":"Waves came in after a few weeks of brushing, worth it.","daysAgo":18}]'::jsonb, ARRAY[5, 5, 6, 6, 7, 7, 8, 9]::int[]),
  ('long-bob-lob', 'Long Bob (Lob)', 'Women', 'A collarbone-grazing bob — longer and softer than a classic bob, flattering on almost everyone and easy to style straight or wavy.', ARRAY['https://picsum.photos/seed/long-bob-lob-0/480/600', 'https://picsum.photos/seed/long-bob-lob-1/480/600', 'https://picsum.photos/seed/long-bob-lob-2/480/600']::text[], ARRAY['Oval', 'Round', 'Square', 'Heart']::text[], 'Any', 'Low', 'Medium', '10 min', '[{"customerName":"Meera R.","rating":5,"comment":"Perfect length — professional but still fun.","daysAgo":2}]'::jsonb, ARRAY[12, 13, 14, 15, 17, 19, 21, 24]::int[]),
  ('layered-bob', 'Layered Bob', 'Women', 'A bob with graduated internal layers for lift and movement — adds body to fine hair and softens rounder faces.', ARRAY['https://picsum.photos/seed/layered-bob-0/480/600', 'https://picsum.photos/seed/layered-bob-1/480/600', 'https://picsum.photos/seed/layered-bob-2/480/600']::text[], ARRAY['Oval', 'Round', 'Heart']::text[], 'Straight to wavy', 'Medium', 'Short to medium', '12 min', '[]'::jsonb, ARRAY[8, 9, 10, 11, 12, 13, 15, 16]::int[]),
  ('curtain-bangs', 'Curtain Bangs', 'Women', 'Soft, center-parted bangs that sweep outward to frame the face — pairs with any length and grows out gracefully.', ARRAY['https://picsum.photos/seed/curtain-bangs-0/480/600', 'https://picsum.photos/seed/curtain-bangs-1/480/600', 'https://picsum.photos/seed/curtain-bangs-2/480/600']::text[], ARRAY['Oval', 'Round', 'Square', 'Heart']::text[], 'Straight to wavy', 'Medium', 'Medium to long', '10 min', '[{"customerName":"Isha P.","rating":5,"comment":"Instantly softened my face, obsessed.","daysAgo":5}]'::jsonb, ARRAY[14, 15, 16, 18, 20, 22, 24, 27]::int[]),
  ('butterfly-cut', 'Butterfly Cut', 'Women', 'Long hair with short, face-framing layers that create a voluminous, wing-like flick — big body without losing length.', ARRAY['https://picsum.photos/seed/butterfly-cut-0/480/600', 'https://picsum.photos/seed/butterfly-cut-1/480/600', 'https://picsum.photos/seed/butterfly-cut-2/480/600']::text[], ARRAY['Oval', 'Oblong', 'Diamond']::text[], 'Wavy, medium', 'Medium', 'Long', '15 min', '[]'::jsonb, ARRAY[7, 9, 11, 13, 15, 18, 20, 23]::int[]),
  ('money-piece', 'Money Piece', 'Women', 'Two brightened, face-framing front sections that lift the complexion — a low-commitment colour accent, not a cut.', ARRAY['https://picsum.photos/seed/money-piece-0/480/600', 'https://picsum.photos/seed/money-piece-1/480/600', 'https://picsum.photos/seed/money-piece-2/480/600']::text[], ARRAY['Oval', 'Round', 'Square', 'Heart']::text[], 'Any', 'Medium', 'Medium to long', '8 min', '[{"customerName":"Tara S.","rating":4,"comment":"Brightens my face without a full colour job.","daysAgo":11}]'::jsonb, ARRAY[6, 7, 8, 8, 9, 10, 11, 12]::int[]),
  ('hime-cut', 'Hime Cut', 'Women', 'Straight, cheek-length side sections and a blunt fringe over long straight hair — a striking, geometric Japanese style.', ARRAY['https://picsum.photos/seed/hime-cut-0/480/600', 'https://picsum.photos/seed/hime-cut-1/480/600', 'https://picsum.photos/seed/hime-cut-2/480/600']::text[], ARRAY['Oval', 'Heart', 'Diamond']::text[], 'Straight, thick', 'Medium', 'Long', '12 min', '[]'::jsonb, ARRAY[3, 4, 5, 6, 7, 9, 11, 13]::int[]),
  ('curly-shag', 'Curly Shag', 'Women', 'A heavily layered shag cut for curls and coils — enhances natural definition and cuts down on frizz-prone bulk.', ARRAY['https://picsum.photos/seed/curly-shag-0/480/600', 'https://picsum.photos/seed/curly-shag-1/480/600', 'https://picsum.photos/seed/curly-shag-2/480/600']::text[], ARRAY['Oval', 'Square', 'Heart']::text[], 'Curly to coily', 'Medium', 'Medium', '13 min', '[{"customerName":"Naomi F.","rating":5,"comment":"Finally a cut that works WITH my curls.","daysAgo":6}]'::jsonb, ARRAY[5, 6, 8, 9, 11, 12, 14, 16]::int[]),
  ('blunt-cut-long', 'Blunt Cut (Long)', 'Women', 'Long hair cut to one clean, even length with no layers — makes thin hair look denser and reads sleek and modern.', ARRAY['https://picsum.photos/seed/blunt-cut-long-0/480/600', 'https://picsum.photos/seed/blunt-cut-long-1/480/600', 'https://picsum.photos/seed/blunt-cut-long-2/480/600']::text[], ARRAY['Oval', 'Round', 'Heart']::text[], 'Straight, fine to medium', 'Low', 'Long', '10 min', '[]'::jsonb, ARRAY[7, 7, 8, 8, 9, 10, 10, 11]::int[]),
  ('deva-cut', 'Deva Cut', 'Women', 'A dry-cutting technique for curly hair, shaping each curl individually for balanced, defined volume.', ARRAY['https://picsum.photos/seed/deva-cut-0/480/600', 'https://picsum.photos/seed/deva-cut-1/480/600', 'https://picsum.photos/seed/deva-cut-2/480/600']::text[], ARRAY['Oval', 'Square', 'Heart']::text[], 'Curly to coily', 'Medium', 'Medium to long', '14 min', '[{"customerName":"Layla M.","rating":4,"comment":"Curls sit so much more evenly now.","daysAgo":9}]'::jsonb, ARRAY[4, 5, 5, 6, 7, 8, 9, 10]::int[]),
  ('feathered-layers', 'Feathered Layers', 'Women', 'Soft, wispy layers feathered back and away from the face for airy movement — a retro look that''s back in rotation.', ARRAY['https://picsum.photos/seed/feathered-layers-0/480/600', 'https://picsum.photos/seed/feathered-layers-1/480/600', 'https://picsum.photos/seed/feathered-layers-2/480/600']::text[], ARRAY['Oval', 'Round', 'Square']::text[], 'Straight to wavy', 'Medium', 'Medium to long', '12 min', '[]'::jsonb, ARRAY[5, 6, 7, 8, 9, 11, 12, 14]::int[]),
  ('afro', 'Natural Afro', 'Women', 'Coily hair grown out and shaped into a rounded silhouette — celebrates natural texture with a bold, voluminous outline.', ARRAY['https://picsum.photos/seed/afro-0/480/600', 'https://picsum.photos/seed/afro-1/480/600', 'https://picsum.photos/seed/afro-2/480/600']::text[], ARRAY['Oval', 'Square', 'Heart']::text[], 'Coily, dense', 'Medium', 'Medium', '12 min', '[{"customerName":"Zara O.","rating":5,"comment":"Love the volume, so easy once picked out.","daysAgo":4}]'::jsonb, ARRAY[8, 8, 9, 10, 11, 12, 13, 15]::int[]),
  ('wolf-cut', 'Wolf Cut', 'Unisex', 'A mix of shag and mullet — choppy layers up top blending into longer, wispy lengths for an edgy, undone look.', ARRAY['https://picsum.photos/seed/wolf-cut-0/480/600', 'https://picsum.photos/seed/wolf-cut-1/480/600', 'https://picsum.photos/seed/wolf-cut-2/480/600']::text[], ARRAY['Oval', 'Square', 'Heart', 'Diamond']::text[], 'Wavy to curly', 'Medium', 'Medium', '10 min', '[{"customerName":"Alex R.","rating":5,"comment":"Trendy and low-effort, gets compliments daily.","daysAgo":3}]'::jsonb, ARRAY[9, 11, 13, 16, 18, 21, 24, 27]::int[]),
  ('box-braids', 'Box Braids', 'Unisex', 'Hair sectioned into squares and braided with or without extensions — a durable, protective style that lasts weeks.', ARRAY['https://picsum.photos/seed/box-braids-0/480/600', 'https://picsum.photos/seed/box-braids-1/480/600', 'https://picsum.photos/seed/box-braids-2/480/600']::text[], ARRAY['Oval', 'Square', 'Round', 'Heart']::text[], 'Coily, dense', 'Low', 'Long', '180 min', '[{"customerName":"Amara D.","rating":5,"comment":"Lasted six weeks, barely any daily upkeep.","daysAgo":20}]'::jsonb, ARRAY[10, 10, 11, 12, 12, 13, 14, 15]::int[]),
  ('cornrows', 'Cornrows', 'Unisex', 'Hair braided flat to the scalp in continuous rows — a versatile protective style that can form intricate patterns.', ARRAY['https://picsum.photos/seed/cornrows-0/480/600', 'https://picsum.photos/seed/cornrows-1/480/600', 'https://picsum.photos/seed/cornrows-2/480/600']::text[], ARRAY['Oval', 'Square', 'Round', 'Oblong']::text[], 'Coily, dense', 'Low', 'Any', '120 min', '[]'::jsonb, ARRAY[7, 7, 8, 8, 9, 10, 11, 12]::int[]),
  ('dreadlocks', 'Dreadlocks', 'Unisex', 'Hair rope-like sections formed by matting and locking over time — a long-term, low-daily-maintenance commitment.', ARRAY['https://picsum.photos/seed/dreadlocks-0/480/600', 'https://picsum.photos/seed/dreadlocks-1/480/600', 'https://picsum.photos/seed/dreadlocks-2/480/600']::text[], ARRAY['Oval', 'Square', 'Diamond']::text[], 'Coily to curly', 'Medium', 'Medium to long', '15 min', '[{"customerName":"Kai N.","rating":4,"comment":"Takes patience to mature but worth it.","daysAgo":30}]'::jsonb, ARRAY[6, 6, 6, 7, 7, 8, 8, 9]::int[]),
  ('cropped-taper', 'Cropped Taper', 'Unisex', 'A short, uniform crop with lightly tapered edges — gender-neutral, wash-and-go, and flattering on most face shapes.', ARRAY['https://picsum.photos/seed/cropped-taper-0/480/600', 'https://picsum.photos/seed/cropped-taper-1/480/600', 'https://picsum.photos/seed/cropped-taper-2/480/600']::text[], ARRAY['Oval', 'Square', 'Round', 'Heart']::text[], 'Any', 'Low', 'Short', '3 min', '[]'::jsonb, ARRAY[5, 6, 6, 7, 8, 9, 10, 11]::int[])
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

-- ─────────────────────────────────────────────────────────────────────────
-- FROM add-salon-menu.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- Hair AI — per-salon service menu (rate card).
-- Each salon owns its own priced menu; the recommender picks bookable services
-- from it (see lib/menuRecommender.ts). Mirrors the MenuService type in
-- lib/salonMenu.ts. Run once in Supabase → SQL Editor. Idempotent.
-- Seed for Fish Net Salon: supabase/seed-salon-menu.sql (generated).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists menu_services (
  id           text primary key,                       -- '<salon>:<service-slug>' (globally unique)
  salon_id     uuid not null references salons(id) on delete cascade,
  slug         text not null,                          -- service slug, unique within the salon
  category     text not null,                          -- top-level card section
  section      text,                                   -- sub-heading
  name         text not null,
  gender       text not null default 'unisex' check (gender in ('women','men','unisex')),
  kind         text not null check (kind in
                 ('haircut','styling','treatment','texture','colour','massage','combo','other')),
  variants     jsonb not null default '[]'::jsonb,     -- [{label,price,memberPrice,lengthBand}]
  targets      text[] not null default '{}',           -- condition/goal tags for matching
  note         text,
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (salon_id, slug)
);

create index if not exists menu_services_salon_idx on menu_services (salon_id, kind);
create index if not exists menu_services_targets_idx on menu_services using gin (targets);

-- keep updated_at fresh on write
create or replace function set_menu_services_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists menu_services_set_updated_at on menu_services;
create trigger menu_services_set_updated_at before update on menu_services
  for each row execute function set_menu_services_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Service role (API routes) manages menus. Menus are shown in-app, so allow a
-- public read of active items; tighten to auth_salon_id() once salons self-serve.
alter table menu_services enable row level security;

do $$ begin
  create policy "menu public read" on menu_services
    for select using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "menu service role write" on menu_services
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- FROM seed-salon-menu.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- Hair AI — Fish Net Salon menu seed. GENERATED — do not edit by hand.
-- Source: lib/salonMenu.ts  ·  Regenerate: npx tsx scripts/gen-salon-menu-seed.mjs
-- Requires supabase/add-salon-menu.sql (table) and the Fish Net Salon row
-- (supabase/seed.sql) to exist first.
-- Idempotent: upserts by id. 64 services.
-- ═══════════════════════════════════════════════════════════════════════════

insert into menu_services
  (id, salon_id, slug, category, section, name, gender, kind, variants, targets, note, sort_order)
values
  ('fishnet:kids-girls-cut-basic', '11111111-1111-1111-1111-111111111111', 'kids-girls-cut-basic', 'Hair Care', 'Kids Haircuts', 'Girls Hair Cut - Basic (Below 10 yrs)', 'women', 'haircut', '[{"label":"","price":279,"memberPrice":239,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'with shampoo & conditioner wash', 0),
  ('fishnet:kids-girls-cut-makeover', '11111111-1111-1111-1111-111111111111', 'kids-girls-cut-makeover', 'Hair Care', 'Kids Haircuts', 'Girls Cut - Makeover (Below 10 yrs)', 'women', 'haircut', '[{"label":"","price":389,"memberPrice":349,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'with shampoo & conditioner wash', 1),
  ('fishnet:cut-basic', '11111111-1111-1111-1111-111111111111', 'cut-basic', 'Hair Care', 'Haircuts', 'Basic Cut', 'women', 'haircut', '[{"label":"Stylist","price":419,"memberPrice":349,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'with blast dry', 2),
  ('fishnet:cut-basic-senior', '11111111-1111-1111-1111-111111111111', 'cut-basic-senior', 'Hair Care', 'Haircuts', 'Basic Cut - Senior', 'women', 'haircut', '[{"label":"Senior","price":639,"memberPrice":529,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'with blast dry', 3),
  ('fishnet:cut-advanced', '11111111-1111-1111-1111-111111111111', 'cut-advanced', 'Hair Care', 'Haircuts', 'Advanced Cut', 'women', 'haircut', '[{"label":"Stylist","price":859,"memberPrice":709,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'with in-curls / out-curls blow dry', 4),
  ('fishnet:cut-advanced-senior', '11111111-1111-1111-1111-111111111111', 'cut-advanced-senior', 'Hair Care', 'Haircuts', 'Advanced Cut - Senior', 'women', 'haircut', '[{"label":"Senior","price":1129,"memberPrice":939,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'with in-curls / out-curls blow dry', 5),
  ('fishnet:cut-change-of-style', '11111111-1111-1111-1111-111111111111', 'cut-change-of-style', 'Hair Care', 'Haircuts', 'Change of Style', 'women', 'haircut', '[{"label":"Stylist","price":1209,"memberPrice":1009,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'with in-curls / out-curls blow dry', 6),
  ('fishnet:cut-change-of-style-senior', '11111111-1111-1111-1111-111111111111', 'cut-change-of-style-senior', 'Hair Care', 'Haircuts', 'Change of Style - Senior', 'women', 'haircut', '[{"label":"Senior","price":1599,"memberPrice":1329,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'with in-curls / out-curls blow dry', 7),
  ('fishnet:shampoo-conditioning', '11111111-1111-1111-1111-111111111111', 'shampoo-conditioning', 'Hair Care', 'Styling & Party Makeovers', 'Shampoo and Conditioning (Blast Dry)', 'women', 'styling', '[{"label":"Upto Medium Length","price":399,"memberPrice":329,"lengthBand":"medium"},{"label":"Long","price":509,"memberPrice":419,"lengthBand":"long"}]'::jsonb, ARRAY[]::text[], null, 8),
  ('fishnet:blow-styling', '11111111-1111-1111-1111-111111111111', 'blow-styling', 'Hair Care', 'Styling & Party Makeovers', 'Blow Styling with Shampoo & Conditioning', 'women', 'styling', '[{"label":"Upto Medium Length","price":659,"memberPrice":539,"lengthBand":"medium"},{"label":"Long","price":869,"memberPrice":719,"lengthBand":"long"}]'::jsonb, ARRAY[]::text[], null, 9),
  ('fishnet:ironing', '11111111-1111-1111-1111-111111111111', 'ironing', 'Hair Care', 'Styling & Party Makeovers', 'Ironing', 'women', 'styling', '[{"label":"Upto Medium Length","price":1199,"memberPrice":999,"lengthBand":"medium"},{"label":"Long","price":1469,"memberPrice":1219,"lengthBand":"long"}]'::jsonb, ARRAY['smoothening', 'frizz']::text[], null, 10),
  ('fishnet:roller-setting', '11111111-1111-1111-1111-111111111111', 'roller-setting', 'Hair Care', 'Styling & Party Makeovers', 'Roller Setting', 'women', 'styling', '[{"label":"","price":1319,"memberPrice":1099,"lengthBand":"any"}]'::jsonb, ARRAY['volume']::text[], null, 11),
  ('fishnet:party-makeup', '11111111-1111-1111-1111-111111111111', 'party-makeup', 'Hair Care', 'Styling & Party Makeovers', 'Party Makeup', 'women', 'styling', '[{"label":"Artist","price":1719,"memberPrice":1719,"lengthBand":"any"},{"label":"Sr. Artist","price":2289,"memberPrice":2289,"lengthBand":"any"},{"label":"Expert","price":2859,"memberPrice":2859,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], null, 12),
  ('fishnet:biolage-scalp-cleanup', '11111111-1111-1111-1111-111111111111', 'biolage-scalp-cleanup', 'Hair Care Protocols', 'Biolage Rituals', 'Rejuvenating Scalp Clean Up', 'women', 'treatment', '[{"label":"Upto Medium Length","price":1199,"memberPrice":999,"lengthBand":"medium"},{"label":"Long","price":1439,"memberPrice":1199,"lengthBand":"long"}]'::jsonb, ARRAY['oiliness', 'itchy-scalp', 'dandruff']::text[], null, 13),
  ('fishnet:biolage-anti-frizz', '11111111-1111-1111-1111-111111111111', 'biolage-anti-frizz', 'Hair Care Protocols', 'Biolage Rituals', 'Anti Frizz Ritual', 'women', 'treatment', '[{"label":"Upto Medium Length","price":1559,"memberPrice":1299,"lengthBand":"medium"},{"label":"Long","price":1799,"memberPrice":1499,"lengthBand":"long"}]'::jsonb, ARRAY['frizz']::text[], null, 14),
  ('fishnet:biolage-deep-hydration', '11111111-1111-1111-1111-111111111111', 'biolage-deep-hydration', 'Hair Care Protocols', 'Biolage Rituals', 'Deep Hydration Ritual', 'women', 'treatment', '[{"label":"Upto Medium Length","price":1559,"memberPrice":1299,"lengthBand":"medium"},{"label":"Long","price":1799,"memberPrice":1499,"lengthBand":"long"}]'::jsonb, ARRAY['dryness']::text[], null, 15),
  ('fishnet:biolage-color-last', '11111111-1111-1111-1111-111111111111', 'biolage-color-last', 'Hair Care Protocols', 'Biolage Rituals', 'Color Last Ritual', 'women', 'treatment', '[{"label":"Upto Medium Length","price":1559,"memberPrice":1299,"lengthBand":"medium"},{"label":"Long","price":1799,"memberPrice":1499,"lengthBand":"long"}]'::jsonb, ARRAY['colour-damage']::text[], null, 16),
  ('fishnet:biolage-follicle-fortifying', '11111111-1111-1111-1111-111111111111', 'biolage-follicle-fortifying', 'Hair Care Protocols', 'Biolage Rituals', 'Follicle Fortifying Infusion', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2039,"memberPrice":1699,"lengthBand":"medium"},{"label":"Long","price":2399,"memberPrice":1999,"lengthBand":"long"}]'::jsonb, ARRAY['hairfall']::text[], null, 17),
  ('fishnet:biolage-scalp-facial', '11111111-1111-1111-1111-111111111111', 'biolage-scalp-facial', 'Hair Care Protocols', 'Biolage Rituals', 'Rejuvenating Scalp Facial', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2279,"memberPrice":1899,"lengthBand":"medium"},{"label":"Long","price":2639,"memberPrice":2199,"lengthBand":"long"}]'::jsonb, ARRAY['itchy-scalp', 'dandruff', 'oiliness']::text[], null, 18),
  ('fishnet:loreal-hair-spa', '11111111-1111-1111-1111-111111111111', 'loreal-hair-spa', 'Hair Care Protocols', 'L''Oréal', 'L''Oréal Hair Spa', 'women', 'treatment', '[{"label":"Upto Medium Length","price":1439,"memberPrice":1199,"lengthBand":"medium"},{"label":"Long","price":1779,"memberPrice":1489,"lengthBand":"long"}]'::jsonb, ARRAY['dryness', 'relax']::text[], '3+1 free offer available', 19),
  ('fishnet:loreal-mentho-burst', '11111111-1111-1111-1111-111111111111', 'loreal-mentho-burst', 'Hair Care Protocols', 'L''Oréal', 'Mentho Burst Spa', 'women', 'treatment', '[{"label":"Upto Medium Length","price":1849,"memberPrice":1539,"lengthBand":"medium"},{"label":"Long","price":2129,"memberPrice":1769,"lengthBand":"long"}]'::jsonb, ARRAY['oiliness', 'itchy-scalp', 'relax']::text[], null, 20),
  ('fishnet:loreal-color-sealing', '11111111-1111-1111-1111-111111111111', 'loreal-color-sealing', 'Hair Care Protocols', 'L''Oréal', 'L''Oréal Color Sealing Treatment', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2469,"memberPrice":2059,"lengthBand":"medium"},{"label":"Long","price":3019,"memberPrice":2519,"lengthBand":"long"}]'::jsonb, ARRAY['colour-damage']::text[], null, 21),
  ('fishnet:loreal-deep-nourishing', '11111111-1111-1111-1111-111111111111', 'loreal-deep-nourishing', 'Hair Care Protocols', 'L''Oréal', 'L''Oréal Deep Nourishing Treatment', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2469,"memberPrice":2059,"lengthBand":"medium"},{"label":"Long","price":3019,"memberPrice":2519,"lengthBand":"long"}]'::jsonb, ARRAY['dryness', 'damage']::text[], null, 22),
  ('fishnet:loreal-frizz-control', '11111111-1111-1111-1111-111111111111', 'loreal-frizz-control', 'Hair Care Protocols', 'L''Oréal', 'L''Oréal Frizz Control Treatment', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2469,"memberPrice":2059,"lengthBand":"medium"},{"label":"Long","price":3019,"memberPrice":2519,"lengthBand":"long"}]'::jsonb, ARRAY['frizz']::text[], null, 23),
  ('fishnet:loreal-scalp-soothing', '11111111-1111-1111-1111-111111111111', 'loreal-scalp-soothing', 'Hair Care Protocols', 'L''Oréal', 'L''Oréal Scalp Soothing Treatment', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2469,"memberPrice":2059,"lengthBand":"medium"},{"label":"Long","price":3019,"memberPrice":2519,"lengthBand":"long"}]'::jsonb, ARRAY['scalp-sensitive', 'itchy-scalp']::text[], null, 24),
  ('fishnet:wellaplex-restore-rebuild', '11111111-1111-1111-1111-111111111111', 'wellaplex-restore-rebuild', 'Luxury Hair Care Protocols', 'Wellaplex', 'Restore & Rebuild', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2329,"memberPrice":1999,"lengthBand":"medium"},{"label":"Long","price":2679,"memberPrice":2299,"lengthBand":"long"}]'::jsonb, ARRAY['damage', 'breakage']::text[], null, 25),
  ('fishnet:wellaplex-sleek-strong', '11111111-1111-1111-1111-111111111111', 'wellaplex-sleek-strong', 'Luxury Hair Care Protocols', 'Wellaplex', 'Sleek & Strong', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2329,"memberPrice":1999,"lengthBand":"medium"},{"label":"Long","price":2679,"memberPrice":2299,"lengthBand":"long"}]'::jsonb, ARRAY['frizz', 'breakage']::text[], null, 26),
  ('fishnet:sp-essential', '11111111-1111-1111-1111-111111111111', 'sp-essential', 'Luxury Hair Care Protocols', 'System Professional', 'Essential Service', 'women', 'treatment', '[{"label":"Upto Medium Length","price":3429,"memberPrice":2859,"lengthBand":"medium"},{"label":"Long","price":3839,"memberPrice":3199,"lengthBand":"long"}]'::jsonb, ARRAY['dryness']::text[], null, 27),
  ('fishnet:sp-regenerate', '11111111-1111-1111-1111-111111111111', 'sp-regenerate', 'Luxury Hair Care Protocols', 'System Professional', 'Regenerate Service', 'women', 'treatment', '[{"label":"Upto Medium Length","price":3429,"memberPrice":2859,"lengthBand":"medium"},{"label":"Long","price":3839,"memberPrice":3199,"lengthBand":"long"}]'::jsonb, ARRAY['damage', 'breakage']::text[], null, 28),
  ('fishnet:sp-elixir-pro', '11111111-1111-1111-1111-111111111111', 'sp-elixir-pro', 'Luxury Hair Care Protocols', 'System Professional', 'Elixir Pro - Luxe Oil Treatment', 'women', 'treatment', '[{"label":"Upto Medium Length","price":3429,"memberPrice":2859,"lengthBand":"medium"},{"label":"Long","price":3839,"memberPrice":3199,"lengthBand":"long"}]'::jsonb, ARRAY['dryness', 'frizz', 'shine']::text[], null, 29),
  ('fishnet:sp-anti-hair-loss', '11111111-1111-1111-1111-111111111111', 'sp-anti-hair-loss', 'Luxury Hair Care Protocols', 'System Professional', 'Anti Hair Loss', 'women', 'treatment', '[{"label":"Upto Medium Length","price":4069,"memberPrice":3389,"lengthBand":"medium"},{"label":"Long","price":4669,"memberPrice":3889,"lengthBand":"long"}]'::jsonb, ARRAY['hairfall']::text[], null, 30),
  ('fishnet:sp-shampeeling', '11111111-1111-1111-1111-111111111111', 'sp-shampeeling', 'Luxury Hair Care Protocols', 'System Professional', 'Shampeeling', 'women', 'treatment', '[{"label":"Upto Medium Length","price":4069,"memberPrice":3389,"lengthBand":"medium"},{"label":"Long","price":4669,"memberPrice":3889,"lengthBand":"long"}]'::jsonb, ARRAY['oiliness', 'itchy-scalp']::text[], null, 31),
  ('fishnet:boost-shampeeling', '11111111-1111-1111-1111-111111111111', 'boost-shampeeling', 'Luxury Hair Care Protocols', 'Booster Services', 'Shampeeling (Booster)', 'women', 'treatment', '[{"label":"","price":1299,"memberPrice":1089,"lengthBand":"any"}]'::jsonb, ARRAY['oiliness', 'itchy-scalp']::text[], null, 32),
  ('fishnet:boost-alpha-energy', '11111111-1111-1111-1111-111111111111', 'boost-alpha-energy', 'Luxury Hair Care Protocols', 'Booster Services', 'Alpha Energy', 'women', 'treatment', '[{"label":"","price":1299,"memberPrice":1089,"lengthBand":"any"}]'::jsonb, ARRAY['hairfall', 'volume']::text[], null, 33),
  ('fishnet:boost-molecular-refilling', '11111111-1111-1111-1111-111111111111', 'boost-molecular-refilling', 'Luxury Hair Care Protocols', 'Booster Services', 'Molecular Hair Refilling', 'women', 'treatment', '[{"label":"","price":1299,"memberPrice":1089,"lengthBand":"any"}]'::jsonb, ARRAY['damage', 'breakage']::text[], null, 34),
  ('fishnet:boost-elastic-force', '11111111-1111-1111-1111-111111111111', 'boost-elastic-force', 'Luxury Hair Care Protocols', 'Booster Services', 'Elastic Force', 'women', 'treatment', '[{"label":"","price":1299,"memberPrice":1089,"lengthBand":"any"}]'::jsonb, ARRAY['breakage', 'damage']::text[], null, 35),
  ('fishnet:boost-scalp-energy-serum', '11111111-1111-1111-1111-111111111111', 'boost-scalp-energy-serum', 'Luxury Hair Care Protocols', 'Booster Services', 'Balance Scalp Energy Serum', 'women', 'treatment', '[{"label":"","price":2059,"memberPrice":1719,"lengthBand":"any"}]'::jsonb, ARRAY['itchy-scalp', 'oiliness', 'scalp-sensitive']::text[], null, 36),
  ('fishnet:boost-color-lock', '11111111-1111-1111-1111-111111111111', 'boost-color-lock', 'Luxury Hair Care Protocols', 'Booster Services', 'Color Lock', 'women', 'treatment', '[{"label":"","price":2059,"memberPrice":1719,"lengthBand":"any"}]'::jsonb, ARRAY['colour-damage']::text[], null, 37),
  ('fishnet:aminexil-anti-hair-fall', '11111111-1111-1111-1111-111111111111', 'aminexil-anti-hair-fall', 'Hair Growth & Loss Control', 'Hair Loss Control', 'Aminexil Anti Hair Fall Treatment', 'women', 'treatment', '[{"label":"Upto Medium Length","price":3089,"memberPrice":2569,"lengthBand":"medium"},{"label":"Long","price":3839,"memberPrice":3199,"lengthBand":"long"}]'::jsonb, ARRAY['hairfall']::text[], null, 38),
  ('fishnet:serioxyl-density-activator', '11111111-1111-1111-1111-111111111111', 'serioxyl-density-activator', 'Hair Growth & Loss Control', 'Hair Loss Control', 'Serioxyl Hair Density Activator Treatment', 'women', 'treatment', '[{"label":"Upto Medium Length","price":3089,"memberPrice":2569,"lengthBand":"medium"},{"label":"Long","price":3839,"memberPrice":3199,"lengthBand":"long"}]'::jsonb, ARRAY['hairfall', 'volume']::text[], null, 39),
  ('fishnet:anti-dandruff', '11111111-1111-1111-1111-111111111111', 'anti-dandruff', 'Hair Growth & Loss Control', 'Dandruff Control', 'Anti Dandruff Treatment', 'women', 'treatment', '[{"label":"Upto Medium Length","price":2469,"memberPrice":2059,"lengthBand":"medium"},{"label":"Long","price":3019,"memberPrice":2519,"lengthBand":"long"}]'::jsonb, ARRAY['dandruff', 'itchy-scalp']::text[], null, 40),
  ('fishnet:massage-coconut', '11111111-1111-1111-1111-111111111111', 'massage-coconut', 'Head Massage', 'Head Massage', 'Pure Coconut Nourisher', 'unisex', 'massage', '[{"label":"","price":859,"memberPrice":709,"lengthBand":"any"}]'::jsonb, ARRAY['dryness', 'relax']::text[], 'with shampoo & conditioner wash', 41),
  ('fishnet:massage-menthol', '11111111-1111-1111-1111-111111111111', 'massage-menthol', 'Head Massage', 'Head Massage', 'Menthol Chiller', 'unisex', 'massage', '[{"label":"","price":859,"memberPrice":709,"lengthBand":"any"}]'::jsonb, ARRAY['oiliness', 'itchy-scalp', 'relax']::text[], 'with shampoo & conditioner wash', 42),
  ('fishnet:massage-olive', '11111111-1111-1111-1111-111111111111', 'massage-olive', 'Head Massage', 'Head Massage', 'Olive Bliss', 'unisex', 'massage', '[{"label":"","price":859,"memberPrice":709,"lengthBand":"any"}]'::jsonb, ARRAY['dryness', 'relax']::text[], 'with shampoo & conditioner wash', 43),
  ('fishnet:straightening-smoothening', '11111111-1111-1111-1111-111111111111', 'straightening-smoothening', 'Texture Change', 'Permanent Straight Hair', 'Straightening / Smoothening', 'women', 'texture', '[{"label":"Upto Medium Length","price":7269,"memberPrice":6049,"lengthBand":"medium"},{"label":"Long","price":10439,"memberPrice":8699,"lengthBand":"long"}]'::jsonb, ARRAY['straightening', 'smoothening', 'frizz']::text[], 'wavy hair texture change · result lasts till re-growth', 44),
  ('fishnet:rebonding', '11111111-1111-1111-1111-111111111111', 'rebonding', 'Texture Change', 'Permanent Straight Hair', 'Rebonding', 'women', 'texture', '[{"label":"Upto Medium Length","price":9529,"memberPrice":7939,"lengthBand":"medium"},{"label":"Long","price":13729,"memberPrice":11439,"lengthBand":"long"}]'::jsonb, ARRAY['straightening', 'smoothening']::text[], 'curly hair texture change · result lasts till re-growth', 45),
  ('fishnet:protein-hair-botox', '11111111-1111-1111-1111-111111111111', 'protein-hair-botox', 'Texture Change', 'Natural Straight Hair Texture', 'Protein Hair Botox', 'women', 'texture', '[{"label":"Upto Medium Length","price":8559,"memberPrice":7129,"lengthBand":"medium"},{"label":"Long","price":10919,"memberPrice":9099,"lengthBand":"long"}]'::jsonb, ARRAY['damage', 'frizz', 'shine']::text[], null, 46),
  ('fishnet:nanoplastia', '11111111-1111-1111-1111-111111111111', 'nanoplastia', 'Texture Change', 'Natural Straight Hair Texture', 'Nanoplastia Silky Shine Treatment', 'women', 'texture', '[{"label":"Upto Medium Length","price":8559,"memberPrice":7129,"lengthBand":"medium"},{"label":"Long","price":10919,"memberPrice":9099,"lengthBand":"long"}]'::jsonb, ARRAY['frizz', 'smoothening', 'shine']::text[], null, 47),
  ('fishnet:colour-root-touchup-krone', '11111111-1111-1111-1111-111111111111', 'colour-root-touchup-krone', 'Colouring', 'Root Touch-up', 'Root Touch-up - Krone (Ammonia Free)', 'women', 'colour', '[{"label":"","price":1169,"memberPrice":969,"lengthBand":"any"}]'::jsonb, ARRAY['greying']::text[], null, 48),
  ('fishnet:colour-root-touchup-regular', '11111111-1111-1111-1111-111111111111', 'colour-root-touchup-regular', 'Colouring', 'Root Touch-up', 'Root Touch-up - Regular', 'women', 'colour', '[{"label":"","price":1399,"memberPrice":1149,"lengthBand":"any"}]'::jsonb, ARRAY['greying']::text[], null, 49),
  ('fishnet:colour-root-touchup-af', '11111111-1111-1111-1111-111111111111', 'colour-root-touchup-af', 'Colouring', 'Root Touch-up', 'Root Touch-up - Ammonia Free', 'women', 'colour', '[{"label":"","price":2019,"memberPrice":1679,"lengthBand":"any"}]'::jsonb, ARRAY['greying']::text[], null, 50),
  ('fishnet:colour-global-regular', '11111111-1111-1111-1111-111111111111', 'colour-global-regular', 'Colouring', 'Global Colouring', 'Global Colouring - Regular', 'women', 'colour', '[{"label":"Upto Medium Length","price":3489,"memberPrice":2909,"lengthBand":"medium"},{"label":"Long","price":4809,"memberPrice":3999,"lengthBand":"long"}]'::jsonb, ARRAY['greying']::text[], null, 51),
  ('fishnet:colour-global-krone', '11111111-1111-1111-1111-111111111111', 'colour-global-krone', 'Colouring', 'Global Colouring', 'Global Colouring - Krone (Ammonia Free)', 'women', 'colour', '[{"label":"Upto Medium Length","price":3659,"memberPrice":3039,"lengthBand":"medium"},{"label":"Long","price":4749,"memberPrice":3959,"lengthBand":"long"}]'::jsonb, ARRAY['greying']::text[], null, 52),
  ('fishnet:colour-global-af', '11111111-1111-1111-1111-111111111111', 'colour-global-af', 'Colouring', 'Global Colouring', 'Global Colouring - Ammonia Free', 'women', 'colour', '[{"label":"Upto Medium Length","price":4829,"memberPrice":4019,"lengthBand":"medium"},{"label":"Long","price":6819,"memberPrice":5679,"lengthBand":"long"}]'::jsonb, ARRAY['greying']::text[], null, 53),
  ('fishnet:colour-streaks', '11111111-1111-1111-1111-111111111111', 'colour-streaks', 'Colouring', 'Fashion Colouring', 'Streaks (per streak)', 'women', 'colour', '[{"label":"","price":379,"memberPrice":309,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], null, 54),
  ('fishnet:colour-advanced-streaks', '11111111-1111-1111-1111-111111111111', 'colour-advanced-streaks', 'Colouring', 'Fashion Colouring', 'Advanced Streaks (per streak, min 6)', 'women', 'colour', '[{"label":"","price":609,"memberPrice":499,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], null, 55),
  ('fishnet:colour-partial-highlights', '11111111-1111-1111-1111-111111111111', 'colour-partial-highlights', 'Colouring', 'Fashion Colouring', 'Partial Highlights (12 streaks)', 'women', 'colour', '[{"label":"","price":4119,"memberPrice":3429,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], null, 56),
  ('fishnet:colour-full-highlights', '11111111-1111-1111-1111-111111111111', 'colour-full-highlights', 'Colouring', 'Fashion Colouring', 'Full Highlights (18 streaks)', 'women', 'colour', '[{"label":"","price":5489,"memberPrice":4579,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], null, 57),
  ('fishnet:colour-creative', '11111111-1111-1111-1111-111111111111', 'colour-creative', 'Colouring', 'Fashion Colouring', 'Creative Colouring (Global + Partial Highlights)', 'women', 'colour', '[{"label":"Upto Medium Length","price":7549,"memberPrice":6289,"lengthBand":"medium"},{"label":"Long","price":8929,"memberPrice":7439,"lengthBand":"long"}]'::jsonb, ARRAY[]::text[], null, 58),
  ('fishnet:colour-advanced-creative', '11111111-1111-1111-1111-111111111111', 'colour-advanced-creative', 'Colouring', 'Fashion Colouring', 'Advanced Creative Colouring (Global + Full Highlights)', 'women', 'colour', '[{"label":"Upto Medium Length","price":8929,"memberPrice":7439,"lengthBand":"medium"},{"label":"Long","price":10299,"memberPrice":8579,"lengthBand":"long"}]'::jsonb, ARRAY[]::text[], null, 59),
  ('fishnet:colour-balayage-ombre', '11111111-1111-1111-1111-111111111111', 'colour-balayage-ombre', 'Colouring', 'Fashion Colouring', 'Balayage / Ombre', 'women', 'colour', '[{"label":"Upto Medium Length","price":11089,"memberPrice":8869,"lengthBand":"medium"},{"label":"Long","price":12869,"memberPrice":10299,"lengthBand":"long"}]'::jsonb, ARRAY[]::text[], null, 60),
  ('fishnet:combo-cut-cleanup', '11111111-1111-1111-1111-111111111111', 'combo-cut-cleanup', 'Combos', 'Haircut Combos', 'Haircut Change of Style + Skin Lightening Face Cleanup', 'women', 'combo', '[{"label":"Regular","price":1748,"memberPrice":1469,"lengthBand":"any"},{"label":"Senior","price":2068,"memberPrice":1739,"lengthBand":"any"}]'::jsonb, ARRAY[]::text[], 'save up to 20% · combo code WH1-WH1SR', 61),
  ('fishnet:combo-cut-hairspa', '11111111-1111-1111-1111-111111111111', 'combo-cut-hairspa', 'Combos', 'Haircut Combos', 'Haircut Change of Style + L''Oréal Hair Spa (Medium)', 'women', 'combo', '[{"label":"Regular","price":2208,"memberPrice":1849,"lengthBand":"any"},{"label":"Senior","price":2528,"memberPrice":2119,"lengthBand":"any"}]'::jsonb, ARRAY['dryness']::text[], 'save up to 20% · combo code WH3-WH3SR', 62),
  ('fishnet:combo-cut-deep-nourishing', '11111111-1111-1111-1111-111111111111', 'combo-cut-deep-nourishing', 'Combos', 'Haircut Combos', 'Haircut Change of Style + L''Oréal Deep Nourishing Treatment (Medium)', 'women', 'combo', '[{"label":"Regular","price":3068,"memberPrice":2579,"lengthBand":"any"},{"label":"Senior","price":3388,"memberPrice":2849,"lengthBand":"any"}]'::jsonb, ARRAY['dryness', 'damage']::text[], 'save up to 20% · combo code WH4-WH4SR', 63)
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

