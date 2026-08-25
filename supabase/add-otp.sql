-- OTP phone verification for owner self-signup + one-account-per-phone gate.
-- Paste into Supabase → SQL Editor → Run.

-- ── One code per phone; upserted on each send ────────────────────────────────────
create table if not exists otp_codes (
  phone         text primary key,          -- normalised digits, incl. country code
  code          text not null,             -- 6-digit code
  expires_at    timestamptz not null,      -- code valid until
  attempts      int not null default 0,    -- wrong-code tries (locks at 5)
  verified      boolean not null default false,
  last_sent_at  timestamptz not null default now(),  -- for resend rate limiting
  created_at    timestamptz not null default now()
);

-- Service-role only. The API talks to this table with the service key (which
-- bypasses RLS); enabling RLS with no policies blocks anon/authenticated clients.
alter table otp_codes enable row level security;

-- ── One salon account per phone number ───────────────────────────────────────────
-- This is what actually PREVENTS multiple accounts: a verified phone can back only
-- one salon. Partial index so existing null phones don't collide.
create unique index if not exists salons_phone_unique
  on salons (phone) where phone is not null;

-- Housekeeping: drop expired, unverified codes (optional, run anytime).
-- delete from otp_codes where verified = false and expires_at < now();
