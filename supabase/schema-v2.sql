-- Hair AI — schema v2
-- Adds: multi-salon tenancy, barbers, service type, and persisted visit photos.
-- Run in Supabase SQL Editor. Written as a fresh create (the old project is gone),
-- not as a migration — see schema.sql for what this replaces.

create extension if not exists vector;

-- ── Salons (tenant root) ──────────────────────────────────────────────────────
-- Everything below hangs off a salon. Without this, two salons cannot share a
-- customer phone number and WhatsApp sends have no credentials to route to.
create table if not exists salons (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  phone              text,
  -- WhatsApp Business credentials, one set per salon
  whatsapp_phone_id  text,
  whatsapp_token     text,
  rebook_after_days  int  default 45,
  timezone           text default 'Asia/Kolkata',
  created_at         timestamptz default now()
);

-- ── Barbers ───────────────────────────────────────────────────────────────────
-- A table rather than a text column on visits: the review message names the
-- barber ("how was your cut with Arjun?"), and per-barber ratings fall out free.
create table if not exists barbers (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid references salons(id) on delete cascade,
  name        text not null,
  phone       text,
  active      boolean default true,
  created_at  timestamptz default now(),
  unique (salon_id, name)
);

-- ── Customers ─────────────────────────────────────────────────────────────────
create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid references salons(id) on delete cascade,
  phone         text not null,
  name          text,

  -- WhatsApp consent. Meta requires recorded opt-in before the first message,
  -- and marketing sends must honour opt-out.
  wa_opt_in     boolean default false,
  wa_opt_in_at  timestamptz,
  opted_out_at  timestamptz,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  -- Was `phone text unique` (global). Scoped to the salon so two salons can
  -- each have the same customer.
  unique (salon_id, phone)
);

-- ── Visits ────────────────────────────────────────────────────────────────────
create table if not exists visits (
  id               uuid primary key default gen_random_uuid(),
  salon_id         uuid references salons(id)   on delete cascade,
  customer_id      uuid references customers(id) on delete cascade,
  barber_id        uuid references barbers(id)   on delete set null,

  -- 'both' covers a combined hair + beard appointment
  service_type     text not null check (service_type in ('haircut','beard','both')),

  created_at       timestamptz default now(),
  -- Set when the barber taps "Done". The 1-hour review message counts from here,
  -- not from created_at (a visit can run well over an hour).
  ended_at         timestamptz,

  analysis         jsonb not null,

  chosen_style      text,   -- hair, when service_type is 'haircut' or 'both'
  chosen_beard_style text,  -- beard, when service_type is 'beard' or 'both'
  barber_notes      text,
  customer_rating   smallint check (customer_rating between 1 and 5),

  embedding        vector(1536)
);

create index if not exists visits_customer_idx on visits (customer_id, created_at desc);
create index if not exists visits_salon_idx    on visits (salon_id, created_at desc);
create index if not exists visits_embedding_idx
  on visits using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- ── Visit photos ──────────────────────────────────────────────────────────────
-- storage_path points into a Supabase Storage bucket. Do NOT put base64 here:
-- one generated image is ~160 KB raw / ~220 KB base64, and four angles per visit
-- would put ~880 KB of text in a single row.
create table if not exists visit_photos (
  id            uuid primary key default gen_random_uuid(),
  visit_id      uuid references visits(id) on delete cascade,

  kind          text not null check (kind in ('original','generated')),
  angle         text check (angle in ('front','left','right','back')),
  -- which edit this image belongs to, so hair and beard results stay separable
  service_type  text check (service_type in ('haircut','beard')),
  style_name    text,

  storage_path  text not null,   -- e.g. 'visits/<visit_id>/generated-front.jpg'
  url           text,            -- public or signed URL, cached for message sends

  -- The single image the 45-day WhatsApp message shows. One per visit.
  is_hero       boolean default false,

  created_at    timestamptz default now()
);

create index if not exists visit_photos_visit_idx on visit_photos (visit_id);
create unique index if not exists visit_photos_one_hero_idx
  on visit_photos (visit_id) where is_hero;

-- ── Message queue ─────────────────────────────────────────────────────────────
-- Outbound WhatsApp lives here rather than in a delayed job runner. A row with a
-- future send_at costs nothing to hold, survives restarts, and a 45-day delay is
-- the same as a 1-hour one. n8n's Wait node would park a live execution for the
-- whole duration instead.
create table if not exists messages (
  id             uuid primary key default gen_random_uuid(),
  salon_id       uuid references salons(id)    on delete cascade,
  customer_id    uuid references customers(id) on delete cascade,
  visit_id       uuid references visits(id)    on delete cascade,

  type           text not null check (type in ('review','rebook','booking_confirm','custom')),
  template_name  text,
  -- Template variables resolved at enqueue time (customer name, salon name,
  -- barber name, hero image URL...). Kept here so a send never has to re-query.
  payload        jsonb default '{}'::jsonb,

  send_at        timestamptz not null,
  status         text not null default 'pending'
                 check (status in ('pending','sending','sent','failed','cancelled')),

  attempts       int  default 0,
  last_error     text,
  wa_message_id  text,
  sent_at        timestamptz,
  created_at     timestamptz default now()
);

-- The dispatcher's only query.
create index if not exists messages_due_idx
  on messages (status, send_at) where status = 'pending';
create index if not exists messages_salon_idx on messages (salon_id, created_at desc);

-- Idempotency: one review and one rebook per visit, ever. Without this a retried
-- checkout enqueues a second copy and the customer gets the same message twice.
create unique index if not exists messages_one_per_visit_idx
  on messages (visit_id, type)
  where visit_id is not null and type in ('review','rebook');

-- Atomically claim due messages. FOR UPDATE SKIP LOCKED is what stops two
-- overlapping cron runs from sending the same row twice — supabase-js cannot
-- express that, so it lives here and is called via rpc().
create or replace function claim_due_messages(batch_size int default 25)
returns setof messages
language sql
as $$
  update messages m
  set    status = 'sending',
         attempts = m.attempts + 1
  where  m.id in (
    select id from messages
    where  status = 'pending'
      and  send_at <= now()
    order  by send_at
    limit  batch_size
    for update skip locked
  )
  returning m.*;
$$;

-- ── Bookings ──────────────────────────────────────────────────────────────────
create table if not exists bookings (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid references salons(id)    on delete cascade,
  customer_id   uuid references customers(id) on delete cascade,
  barber_id     uuid references barbers(id)   on delete set null,

  slot_at       timestamptz not null,
  service_type  text check (service_type in ('haircut','beard','both')),
  status        text not null default 'pending'
                check (status in ('pending','confirmed','cancelled','completed','no_show')),
  source        text default 'whatsapp' check (source in ('whatsapp','walk_in','app')),
  notes         text,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists bookings_salon_slot_idx on bookings (salon_id, slot_at);
create index if not exists bookings_customer_idx   on bookings (customer_id, slot_at desc);

-- ── Style library ─────────────────────────────────────────────────────────────
create table if not exists style_library (
  id           uuid primary key default gen_random_uuid(),
  name         text unique not null,
  description  text,
  suits_faces  text[],
  min_length   text,
  gender       text,
  tags         text[],
  embedding    vector(1536)
);

create index if not exists style_library_embedding_idx
  on style_library using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- ── Similar-visit search ──────────────────────────────────────────────────────
-- Unchanged from v1 except that matching is already customer-scoped, and
-- customers are now salon-scoped — so one salon's history cannot leak into
-- another's recommendations.
create or replace function match_visits(
  query_embedding vector(1536),
  match_customer  uuid,
  match_count     int default 3
)
returns table (
  id              uuid,
  created_at      timestamptz,
  analysis        jsonb,
  chosen_style    text,
  barber_notes    text,
  customer_rating smallint,
  similarity      float
)
language sql stable
as $$
  select
    id, created_at, analysis, chosen_style, barber_notes, customer_rating,
    1 - (embedding <=> query_embedding) as similarity
  from visits
  where customer_id = match_customer
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_styles(
  query_embedding vector(1536),
  match_count     int default 6
)
returns table (
  id          uuid,
  name        text,
  description text,
  suits_faces text[],
  min_length  text,
  similarity  float
)
language sql stable
as $$
  select
    id, name, description, suits_faces, min_length,
    1 - (embedding <=> query_embedding) as similarity
  from style_library
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Service role only for now (API routes use SUPABASE_SERVICE_KEY). When salons
-- get their own logins, every policy here needs a salon_id check.
alter table salons        enable row level security;
alter table barbers       enable row level security;
alter table customers     enable row level security;
alter table visits        enable row level security;
alter table visit_photos  enable row level security;
alter table messages      enable row level security;
alter table bookings      enable row level security;
alter table style_library enable row level security;

create policy "service role full access" on salons
  for all using (auth.role() = 'service_role');
create policy "service role full access" on barbers
  for all using (auth.role() = 'service_role');
create policy "service role full access" on customers
  for all using (auth.role() = 'service_role');
create policy "service role full access" on visits
  for all using (auth.role() = 'service_role');
create policy "service role full access" on visit_photos
  for all using (auth.role() = 'service_role');
create policy "service role full access" on messages
  for all using (auth.role() = 'service_role');
create policy "service role full access" on bookings
  for all using (auth.role() = 'service_role');
create policy "service role full access" on style_library
  for all using (auth.role() = 'service_role');
