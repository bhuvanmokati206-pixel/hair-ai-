-- Run in the SQL Editor. Stores finalized bills. Money in PAISE (bigint).

create table if not exists bills (
  id             uuid primary key default gen_random_uuid(),
  salon_id       uuid references salons(id)    on delete cascade,
  visit_id       uuid references visits(id)    on delete set null,
  customer_id    uuid references customers(id) on delete set null,
  barber_id      uuid references barbers(id)   on delete set null,

  invoice_no     text,
  -- [{ id, name, pricePaise, qty }]
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
create policy "service role full access" on bills
  for all using (auth.role() = 'service_role');
create policy "salon reads own bills" on bills
  for select using (salon_id = auth_salon_id() or is_platform_admin());

select 'bills table ready' as status;
