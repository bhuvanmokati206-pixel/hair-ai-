-- Run this in the SQL Editor. Fixes salons created through signup getting
-- code = null, because nothing called generate_salon_code() on insert.
-- Already folded into schema-v3-auth.sql for fresh installs.

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

-- Backfill anything already created without one.
update salons set code = generate_salon_code(name) where code is null;

select code, name, status from salons order by name;
