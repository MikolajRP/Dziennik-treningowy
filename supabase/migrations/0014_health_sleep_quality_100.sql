-- Sleep quality is now scored the way Garmin (and most wearables) report it
-- — 1-100 — instead of a plain 1-10 scale, so it lines up with what people
-- actually see on their watch/app and can just copy over.
alter table public.health_entries drop constraint if exists health_entries_sleep_quality_check;
alter table public.health_entries add constraint health_entries_sleep_quality_check
  check (sleep_quality between 1 and 100);
