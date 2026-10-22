-- ==============================================================================
-- ML TRAINING & FEEDBACK DATA PIPELINE
-- Purpose: Collects training samples for CatBoost (Classifier) & LightGBM (Ranker)
-- ==============================================================================

-- 1. Table: ml_scan_logs
-- Stores each scan's feature inputs, Gemini's teacher predictions, and status.
create table if not exists ml_scan_logs (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  
  -- Raw input metadata
  gender_hint text, -- 'male' | 'female' | null
  preferences jsonb, -- Customer survey answers from lib/preferences.ts
  
  -- Extracted numerical features (for CatBoost & LightGBM)
  -- e.g. face aspect ratios, jaw curvature, texture variance, hair length measurements
  features jsonb,
  
  -- Teacher model predictions (from Gemini)
  gemini_analysis jsonb not null,
  
  -- Model execution metadata
  latency_ms integer,
  engine_used text default 'gemini', -- 'gemini' | 'catboost' | 'hybrid'
  
  created_at timestamptz default now()
);

-- 2. Table: ml_barber_feedback
-- Stores ground-truth overrides when a barber or customer corrects attributes or chooses a style.
create table if not exists ml_barber_feedback (
  id uuid primary key default gen_random_uuid(),
  scan_log_id uuid references ml_scan_logs(id) on delete cascade,
  visit_id uuid references visits(id) on delete cascade,
  
  -- Attribute corrections (Supervised targets for CatBoost)
  corrected_face_shape text,
  corrected_hair_texture text,
  corrected_hair_density text,
  corrected_hair_length text,
  corrected_top_cm numeric,
  corrected_side_cm numeric,
  corrected_nape_cm numeric,
  
  -- Ranking feedback (Supervised targets for LightGBM LambdaMART)
  -- The style the customer actually selected & barber cut
  chosen_style text not null,
  -- Relevance label for LightGBM: 3 = customer rated 5★, 2 = barber shortlisted, 1 = feasible, 0 = rejected
  relevance_grade smallint default 2 check (relevance_grade between 0 and 3),
  customer_rating smallint check (customer_rating between 1 and 5),
  
  barber_notes text,
  created_at timestamptz default now()
);

-- Enable indexes for fast lookup and ML export queries
create index if not exists idx_ml_scan_logs_created on ml_scan_logs (created_at desc);
create index if not exists idx_ml_barber_feedback_style on ml_barber_feedback (chosen_style);

-- RLS: Service role full access
alter table ml_scan_logs enable row level security;
alter table ml_barber_feedback enable row level security;

create policy "service role full access ml_scan_logs" on ml_scan_logs
  for all using (auth.role() = 'service_role');

create policy "service role full access ml_barber_feedback" on ml_barber_feedback
  for all using (auth.role() = 'service_role');
