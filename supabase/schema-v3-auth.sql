-- Hair AI — schema v3: auth, roles, salon records, transactions, audit.
-- Run AFTER schema-v2.sql.
--
-- Security model in one line: the database is the boundary, not the app code.
-- Every table is scoped by salon_id through RLS, so a bug in a React component
-- cannot leak Salon A's customers to Salon B.

-- ── Salon record: address, contact, code, status ──────────────────────────────
alter table salons add column if not exists code           text;
alter table salons add column if not exists email          text;
alter table salons add column if not exists address_line1  text;
alter table salons add column if not exists address_line2  text;
alter table salons add column if not exists city           text;
alter table salons add column if not exists state          text;
alter table salons add column if not exists pincode        text;
alter table salons add column if not exists gst_number     text;
alter table salons add column if not exists status         text default 'trial';
alter table salons add column if not exists credit_paise   bigint default 0;
alter table salons add column if not exists onboarded_at   timestamptz;

do $$ begin
  alter table salons add constraint salons_status_check
    check (status in ('trial','active','suspended','cancelled'));
exception when duplicate_object then null; end $$;

create unique index if not exists salons_code_idx on salons (code);

-- Human-readable salon code: 'FNS-4821'. UUIDs are unusable over the phone;
-- support conversations need something a person can read out loud.
create or replace function generate_salon_code(salon_name text)
returns text
language plpgsql
as $$
declare
  initials text;
  candidate text;
  tries int := 0;
begin
  -- First letter of up to 3 words, e.g. 'Fish Net Salon' -> 'FNS'
  select string_agg(upper(left(word, 1)), '')
  into   initials
  from  (select unnest(string_to_array(regexp_replace(salon_name, '[^a-zA-Z ]', '', 'g'), ' ')) as word
         limit 3) w
  where word <> '';

  initials := coalesce(nullif(initials, ''), 'SLN');

  loop
    candidate := initials || '-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    exit when not exists (select 1 from salons where code = candidate);
    tries := tries + 1;
    if tries > 20 then
      candidate := initials || '-' || substr(gen_random_uuid()::text, 1, 6);
      exit;
    end if;
  end loop;

  return candidate;
end;
$$;

-- Generate the code automatically on insert. Without this every salon created
-- through signup gets code = null, since the app never sets it.
create or replace function set_salon_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null then
    new.code := generate_salon_code(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists salons_set_code on salons;
create trigger salons_set_code
  before insert on salons
  for each row execute function set_salon_code();

-- Backfill any salon created before codes existed.
update salons set code = generate_salon_code(name) where code is null;

-- ── Profiles: links Supabase auth users to a role and a salon ─────────────────
-- auth.users is managed by Supabase (passwords, sessions, hashing). Never store
-- a password here — Supabase bcrypts them in a schema the API cannot read.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('platform_admin','salon_owner','salon_staff')),
  -- null for platform_admin: they are not scoped to any one salon
  salon_id    uuid references salons(id) on delete cascade,
  full_name   text,
  phone       text,
  is_active   boolean default true,
  last_seen_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  -- A salon user without a salon, or a platform admin pinned to one, are both bugs.
  constraint profiles_salon_scope check (
    (role = 'platform_admin' and salon_id is null) or
    (role <> 'platform_admin' and salon_id is not null)
  )
);

create index if not exists profiles_salon_idx on profiles (salon_id);

-- ── Transactions ──────────────────────────────────────────────────────────────
-- Money is stored in PAISE as bigint, never as float/numeric-with-decimals.
-- 0.1 + 0.2 <> 0.3 in floating point; a billing ledger that drifts by a paise
-- per row becomes unreconcilable.
create table if not exists transactions (
  id                  uuid primary key default gen_random_uuid(),
  salon_id            uuid references salons(id) on delete restrict,

  type                text not null check (type in
                        ('scan','generation','whatsapp','subscription','topup','refund','adjustment')),
  direction           text not null check (direction in ('debit','credit')),
  amount_paise        bigint not null check (amount_paise >= 0),
  balance_after_paise bigint,

  description         text,
  -- visit_id / message_id / razorpay payment id, depending on type
  reference_id        text,
  metadata            jsonb default '{}'::jsonb,

  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz default now()
);

create index if not exists transactions_salon_idx on transactions (salon_id, created_at desc);
create index if not exists transactions_type_idx  on transactions (type, created_at desc);

-- Stops the same Razorpay payment being credited twice on a retried webhook.
create unique index if not exists transactions_topup_ref_idx
  on transactions (reference_id) where type in ('topup','refund');

-- ── Audit log ─────────────────────────────────────────────────────────────────
-- You can read every salon's data. That power needs a record — both for trust
-- and because "who deleted this customer?" is unanswerable without it.
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references profiles(id) on delete set null,
  actor_role   text,
  action       text not null,          -- 'login','salon.create','customer.delete', ...
  target_table text,
  target_id    text,
  salon_id     uuid references salons(id) on delete set null,
  metadata     jsonb default '{}'::jsonb,
  ip_address   inet,
  created_at   timestamptz default now()
);

create index if not exists audit_log_actor_idx on audit_log (actor_id, created_at desc);
create index if not exists audit_log_salon_idx on audit_log (salon_id, created_at desc);

-- ── Auth helpers ──────────────────────────────────────────────────────────────
-- SECURITY DEFINER is required, not optional. These read `profiles`, and RLS on
-- `profiles` would re-enter the same policy that called them — Postgres raises
-- "infinite recursion detected in policy". Running as owner bypasses that.
-- `search_path` is pinned so the function cannot be hijacked by a rogue schema.

create or replace function auth_salon_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select salon_id from profiles where id = auth.uid() and is_active $$;

create or replace function is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'platform_admin' and is_active
  );
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- v2 shipped service-role-only policies, which is correct while the app is the
-- only client. These add the logged-in user paths on top; the service role
-- policies from v2 still apply for server-side API routes.

alter table profiles     enable row level security;
alter table transactions enable row level security;
alter table audit_log    enable row level security;

create policy "service role full access" on profiles
  for all using (auth.role() = 'service_role');
create policy "service role full access" on transactions
  for all using (auth.role() = 'service_role');
create policy "service role full access" on audit_log
  for all using (auth.role() = 'service_role');

-- A user reads their own profile; an admin reads everyone's.
create policy "read own profile" on profiles
  for select using (id = auth.uid() or is_platform_admin());

-- Deliberately no user-facing UPDATE policy on profiles: role and salon_id are
-- privilege boundaries. Letting a user write their own row means letting them
-- set role='platform_admin'. Those changes go through a server route only.

create policy "salon reads own transactions" on transactions
  for select using (salon_id = auth_salon_id() or is_platform_admin());

create policy "admin reads audit log" on audit_log
  for select using (is_platform_admin());

-- Salon-scoped reads on the operational tables.
create policy "salon scoped read" on salons
  for select using (id = auth_salon_id() or is_platform_admin());
create policy "salon scoped read" on barbers
  for select using (salon_id = auth_salon_id() or is_platform_admin());
create policy "salon scoped read" on customers
  for select using (salon_id = auth_salon_id() or is_platform_admin());
create policy "salon scoped read" on visits
  for select using (salon_id = auth_salon_id() or is_platform_admin());
create policy "salon scoped read" on messages
  for select using (salon_id = auth_salon_id() or is_platform_admin());
create policy "salon scoped read" on bookings
  for select using (salon_id = auth_salon_id() or is_platform_admin());

-- visit_photos has no salon_id of its own — scope it through its visit.
create policy "salon scoped read" on visit_photos
  for select using (
    is_platform_admin() or exists (
      select 1 from visits v
      where v.id = visit_photos.visit_id and v.salon_id = auth_salon_id()
    )
  );

-- ── Balance view ──────────────────────────────────────────────────────────────
create or replace view salon_balances as
select
  s.id,
  s.code,
  s.name,
  s.status,
  coalesce(sum(case when t.direction = 'credit' then t.amount_paise else 0 end), 0)
    - coalesce(sum(case when t.direction = 'debit' then t.amount_paise else 0 end), 0)
    as balance_paise,
  count(t.id) as transaction_count,
  max(t.created_at) as last_transaction_at
from salons s
left join transactions t on t.salon_id = s.id
group by s.id, s.code, s.name, s.status;

-- ── Seed: give Fish Net Salon a code and an address ───────────────────────────
update salons set
  code          = coalesce(code, generate_salon_code(name)),
  email         = 'owner@fishnetsalon.in',
  address_line1 = '2nd Floor, Sai Arcade',
  address_line2 = 'MG Road',
  city          = 'Bengaluru',
  state         = 'Karnataka',
  pincode       = '560001',
  status        = 'active',
  onboarded_at  = coalesce(onboarded_at, now())
where id = '11111111-1111-1111-1111-111111111111';

select code, name, city, status from salons;
