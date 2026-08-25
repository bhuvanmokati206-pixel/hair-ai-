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
