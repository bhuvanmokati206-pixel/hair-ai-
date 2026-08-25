-- Demo data: Fish Net Salon + 3 barbers + one test customer and visit.
-- Run AFTER schema-v2.sql. Safe to re-run — every insert is idempotent.
--
-- IDs are fixed rather than generated so you can copy them straight into API
-- calls and .env.local while testing.

-- ── Salon ─────────────────────────────────────────────────────────────────────
-- WhatsApp credentials are placeholders. Fill them in once Meta registration
-- clears: whatsapp_phone_id = "Phone number ID", whatsapp_token = access token.
insert into salons (id, name, phone, whatsapp_phone_id, whatsapp_token, rebook_after_days, timezone)
values (
  '11111111-1111-1111-1111-111111111111',
  'Fish Net Salon',
  '919876500000',
  null,
  null,
  45,
  'Asia/Kolkata'
)
on conflict (id) do update
  set name = excluded.name,
      rebook_after_days = excluded.rebook_after_days;

-- ── Barbers ───────────────────────────────────────────────────────────────────
insert into barbers (id, salon_id, name, phone, active) values
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-111111111111', 'Arjun Nair',      '919876500001', true),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-111111111111', 'Rohit Deshmukh',  '919876500002', true),
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-111111111111', 'Imran Sheikh',    '919876500003', true)
on conflict (id) do update
  set name = excluded.name, active = excluded.active;

-- ── Test customer ─────────────────────────────────────────────────────────────
-- Replace the phone with YOUR number before testing sends — the Meta sandbox
-- only delivers to numbers registered as test recipients.
insert into customers (id, salon_id, phone, name, wa_opt_in, wa_opt_in_at)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '919999900001',
  'Test Customer',
  true,
  now()
)
on conflict (id) do update
  set name = excluded.name, wa_opt_in = excluded.wa_opt_in;

-- ── Test visit ────────────────────────────────────────────────────────────────
-- ended_at is set, so this visit looks checked-out and is eligible for both the
-- review and rebook messages.
insert into visits (
  id, salon_id, customer_id, barber_id, service_type,
  ended_at, analysis, chosen_style, barber_notes
)
values (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-000000000001',   -- Arjun Nair
  'haircut',
  now(),
  '{
     "gender": "male",
     "skinTone": "brown",
     "undertone": "warm",
     "hairLength": "medium",
     "hairMeasurements": {
       "topLength": "medium", "sideLength": "short", "napeLength": "very_short",
       "topCm": "~6cm", "sideCm": "~2cm", "napeCm": "~1cm"
     },
     "hairDensity": "thick",
     "hairTexture": "wavy",
     "hairColor": "black",
     "faceShape": "oval",
     "faceLength": "average",
     "currentStyle": "Short faded sides with a longer textured top",
     "feasibleStyles": ["textured crop","fade with quiff","french crop","side part","buzz cut","caesar cut"],
     "bestMatch": "textured crop",
     "bestMatchReason": "An oval face suits most cuts; thick wavy hair holds a textured crop with minimal product.",
     "stylingTips": "Matte clay on damp hair, scrunch upward for texture."
   }'::jsonb,
  'textured crop',
  'Wants it kept short on the sides next time.'
)
on conflict (id) do update
  set chosen_style = excluded.chosen_style, ended_at = excluded.ended_at;

-- ── Check it landed ───────────────────────────────────────────────────────────
select
  s.name              as salon,
  b.name              as barber,
  c.name              as customer,
  v.service_type,
  v.chosen_style,
  v.ended_at
from visits v
join salons    s on s.id = v.salon_id
join customers c on c.id = v.customer_id
left join barbers b on b.id = v.barber_id
where v.id = '44444444-4444-4444-4444-444444444444';
