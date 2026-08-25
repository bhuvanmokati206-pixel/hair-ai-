-- Run in the SQL Editor. Adds a lifecycle status to visits so the dashboard can
-- show a queue (scanning -> choosing -> in_progress -> completed) rather than
-- just "has ended_at or not".
--
-- ended_at stays the source of truth for "completed" — the WhatsApp review timer
-- counts from it. status is the finer-grained UI state layered on top.

alter table visits add column if not exists status text not null default 'scanning';

do $$ begin
  alter table visits add constraint visits_status_check
    check (status in ('scanning','choosing','in_progress','completed','abandoned'));
exception when duplicate_object then null; end $$;

-- Backfill existing rows: anything checked out is completed, the rest are
-- treated as in_progress so they surface in the queue rather than vanishing.
update visits set status = 'completed'   where ended_at is not null and status = 'scanning';
update visits set status = 'in_progress' where ended_at is null     and status = 'scanning' and chosen_style is not null;

-- The dashboard's in-progress query.
create index if not exists visits_status_idx on visits (salon_id, status, created_at desc);

select status, count(*) from visits group by status;
