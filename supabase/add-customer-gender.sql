-- Run in the SQL Editor. Adds gender + a terms-accepted timestamp to customers,
-- collected on the entry form.

alter table customers add column if not exists gender          text;
alter table customers add column if not exists terms_accepted_at timestamptz;

do $$ begin
  alter table customers add constraint customers_gender_check
    check (gender in ('male','female','other'));
exception when duplicate_object then null; end $$;

select id, name, gender, terms_accepted_at from customers limit 5;
