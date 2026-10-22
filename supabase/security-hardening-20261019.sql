-- Run once in the Supabase SQL editor after deploying the application changes.
-- Makes the existing bucket private, clears stale public visit-photo URLs, and
-- migrates barber image values from public URLs to storage paths.

update storage.buckets
set public = false
where id = 'visit-photos';

update public.visit_photos
set url = null
where storage_path is not null;

update public.barbers
set photo_url = regexp_replace(photo_url, '^.*/visit-photos/', '')
where photo_url like '%/visit-photos/%';
