-- Run in the SQL Editor. Adds contact + photo to barbers for the profile page's
-- barber management.

alter table barbers add column if not exists email     text;
alter table barbers add column if not exists photo_url text;

select id, name, phone, email, photo_url from barbers order by name;
