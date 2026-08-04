-- Optional time-of-day tag on a real workout ("rano" / "popołudnie"), so two
-- workouts logged on the same date can be told apart in the Dziennik view.
alter table public.workouts
  add column if not exists time_of_day text check (time_of_day in ('rano', 'popołudnie'));
