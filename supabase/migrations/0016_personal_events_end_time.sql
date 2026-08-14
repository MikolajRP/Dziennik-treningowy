-- Personal events now get a start AND end time (rendered as a positioned
-- block on the Planner's hour-ruled week/day view) instead of just a start.
alter table public.personal_events add column if not exists end_time time;
