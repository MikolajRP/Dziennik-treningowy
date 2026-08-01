-- Optional title (bold) + subtitle (smaller, not bold) shown on a workout's
-- card in the journal.
alter table public.workouts
  add column if not exists name text,
  add column if not exists subtitle text;
