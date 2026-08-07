-- Manual within-day display order for workouts, so drag-reordering two
-- entries on the same date has somewhere persistent to live. Workouts are
-- still primarily sorted by date; this only breaks ties. Existing rows all
-- default to 0 (no regression — matches the previous undefined tie order)
-- until a day's workouts are actually drag-reordered once, at which point
-- the app renumbers that whole day's group sequentially.
alter table public.workouts add column if not exists sort_order integer not null default 0;
