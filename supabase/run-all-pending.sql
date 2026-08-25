-- ═══════════════════════════════════════════════════════════════════════════
-- Hair AI — all pending migrations, in one paste.
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Every statement is idempotent (safe to run more than once).
-- Unblocks: customer gender/terms, barber email+photo, billing, salon codes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Customer gender + terms ───────────────────────────────────────────────
alter table customers add column if not exists gender            text;
alter table customers add column if not exists terms_accepted_at timestamptz;
do $$ begin
  alter table customers add constraint customers_gender_check
    check (gender in ('male','female','other'));
exception when duplicate_object then null; end $$;

-- ── 2 · Barber contact + photo ────────────────────────────────────────────────
alter table barbers add column if not exists email     text;
alter table barbers add column if not exists photo_url text;

-- ── 3 · Salon code auto-generate + backfill ───────────────────────────────────
create or replace function set_salon_code()
returns trigger language plpgsql as $$
begin
  if new.code is null then new.code := generate_salon_code(new.name); end if;
  return new;
end; $$;
drop trigger if exists salons_set_code on salons;
create trigger salons_set_code before insert on salons
  for each row execute function set_salon_code();
update salons set code = generate_salon_code(name) where code is null;

-- ── 4 · Bills ─────────────────────────────────────────────────────────────────
create table if not exists bills (
  id             uuid primary key default gen_random_uuid(),
  salon_id       uuid references salons(id)    on delete cascade,
  visit_id       uuid references visits(id)    on delete set null,
  customer_id    uuid references customers(id) on delete set null,
  barber_id      uuid references barbers(id)   on delete set null,
  invoice_no     text,
  items          jsonb not null default '[]'::jsonb,
  subtotal_paise bigint not null default 0,
  discount_paise bigint not null default 0,
  gst_percent    numeric not null default 0,
  gst_paise      bigint not null default 0,
  total_paise    bigint not null default 0,
  payment_method text,
  created_at     timestamptz default now()
);
create index if not exists bills_salon_idx on bills (salon_id, created_at desc);
create index if not exists bills_visit_idx on bills (visit_id);

alter table bills enable row level security;
do $$ begin
  create policy "service role full access" on bills for all using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "salon reads own bills" on bills for select using (salon_id = auth_salon_id() or is_platform_admin());
exception when duplicate_object then null; end $$;

-- ── Confirm ───────────────────────────────────────────────────────────────────
select
  (select count(*) from information_schema.columns where table_name='customers' and column_name='gender') as customer_gender,
  (select count(*) from information_schema.columns where table_name='barbers'   and column_name='photo_url') as barber_photo,
  (select count(*) from information_schema.tables  where table_name='bills') as bills_table,
  (select count(*) from salons where code is null) as salons_without_code;
