-- Manual display order for the individual Strava activities attached to a
-- single (merged) workout — same pattern as workouts.sort_order.
alter table public.strava_activities add column if not exists sort_order integer not null default 0;
