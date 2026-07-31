-- Strava integration — connections, imported activities, and manual
-- workout duration.

-- ---------- workouts: manual duration ----------
alter table public.workouts
  add column if not exists duration_minutes integer;

-- ---------- strava_connections (one row per user) ----------
create table if not exists public.strava_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id bigint not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strava_connections enable row level security;

create policy "strava_connections_select_own" on public.strava_connections
  for select using (auth.uid() = user_id);
create policy "strava_connections_insert_own" on public.strava_connections
  for insert with check (auth.uid() = user_id);
create policy "strava_connections_update_own" on public.strava_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "strava_connections_delete_own" on public.strava_connections
  for delete using (auth.uid() = user_id);

drop trigger if exists strava_connections_set_updated_at on public.strava_connections;
create trigger strava_connections_set_updated_at
  before update on public.strava_connections
  for each row execute function public.set_updated_at();

-- ---------- strava_activities (one row per imported activity) ----------
-- Splits and HR-zone distribution are fetched once at import time and
-- stored here so report aggregation never has to re-hit Strava. Time-series
-- streams (pace/HR/elevation curves) are fetched on demand instead — see
-- lib/strava.ts — since they're only needed when a single run is expanded.
create table if not exists public.strava_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  strava_activity_id bigint not null unique,
  name text not null default '',
  type text not null,
  start_date timestamptz not null,
  distance_m numeric not null default 0,
  moving_time_s integer not null default 0,
  elapsed_time_s integer not null default 0,
  elevation_gain_m numeric not null default 0,
  average_speed_mps numeric not null default 0,
  average_heartrate numeric,
  max_heartrate numeric,
  splits_metric jsonb,
  hr_zones jsonb,
  polyline text,
  created_at timestamptz not null default now()
);

create index if not exists strava_activities_workout_idx on public.strava_activities (workout_id);
create index if not exists strava_activities_user_idx on public.strava_activities (user_id);

alter table public.strava_activities enable row level security;

create policy "strava_activities_select_own" on public.strava_activities
  for select using (auth.uid() = user_id);
create policy "strava_activities_insert_own" on public.strava_activities
  for insert with check (auth.uid() = user_id);
create policy "strava_activities_update_own" on public.strava_activities
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "strava_activities_delete_own" on public.strava_activities
  for delete using (auth.uid() = user_id);
