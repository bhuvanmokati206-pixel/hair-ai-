-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Enable pgvector extension for semantic search
create extension if not exists vector;

-- ── Customers ─────────────────────────────────────────────────────────────────
create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  phone        text unique not null,           -- identifier barber enters
  name         text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Visits ────────────────────────────────────────────────────────────────────
-- One row per salon visit. Stores the full analysis JSON + chosen style.
create table if not exists visits (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references customers(id) on delete cascade,
  created_at      timestamptz default now(),

  -- Raw analysis from Claude vision
  analysis        jsonb not null,

  -- What the customer actually chose
  chosen_style    text,
  barber_notes    text,
  customer_rating smallint check (customer_rating between 1 and 5),

  -- Embedding of the visit summary for semantic search
  -- 1536 dims = OpenAI text-embedding-3-small (free tier friendly)
  -- 768 dims  = if you use a local/Supabase embedding model
  embedding       vector(1536)
);

-- Index for fast nearest-neighbour search
create index if not exists visits_embedding_idx
  on visits using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- ── Style Library ─────────────────────────────────────────────────────────────
-- Your curated hairstyle knowledge base
create table if not exists style_library (
  id           uuid primary key default gen_random_uuid(),
  name         text unique not null,
  description  text,
  suits_faces  text[],    -- ['oval','round','square']
  min_length   text,      -- 'short' | 'medium' | 'long'
  gender       text,      -- 'male' | 'female' | 'any'
  tags         text[],    -- ['fade','textured','low-maintenance']
  embedding    vector(1536)
);

create index if not exists style_library_embedding_idx
  on style_library using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- ── Helper function: match similar visits ─────────────────────────────────────
create or replace function match_visits(
  query_embedding vector(1536),
  match_customer  uuid,
  match_count     int default 3
)
returns table (
  id           uuid,
  created_at   timestamptz,
  analysis     jsonb,
  chosen_style text,
  barber_notes text,
  customer_rating smallint,
  similarity   float
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

-- ── Helper function: match styles ─────────────────────────────────────────────
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

-- ── RLS (Row Level Security) ───────────────────────────────────────────────────
-- For now: service role only (server-side API routes use service key)
alter table customers enable row level security;
alter table visits enable row level security;
alter table style_library enable row level security;

-- Allow service role full access (your API routes use SUPABASE_SERVICE_KEY)
create policy "service role full access" on customers
  for all using (auth.role() = 'service_role');
create policy "service role full access" on visits
  for all using (auth.role() = 'service_role');
create policy "service role full access" on style_library
  for all using (auth.role() = 'service_role');
