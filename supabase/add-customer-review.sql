-- Adds a short free-text customer review to visits (the star rating already exists
-- as visits.customer_rating). Surfaced in the home "Before & after" gallery.
-- Safe to run more than once.
alter table visits add column if not exists customer_review text;
