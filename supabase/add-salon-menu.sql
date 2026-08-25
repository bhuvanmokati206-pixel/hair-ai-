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
