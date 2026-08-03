-- Coach accounts: a coach is just another Supabase Auth user, granted
-- read access to a specific athlete's data through this table rather than
-- sharing a login. Permissions are per-grant booleans so more can be added
-- later (e.g. a future can_view_notes) without changing the shape of
-- anything else.

create table if not exists public.coach_access (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid not null references auth.users(id) on delete cascade,
  athlete_email text not null,
  coach_email text not null,
  coach_user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  can_view_workouts boolean not null default true,
  can_view_reports boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_user_id, coach_email)
);

create index if not exists coach_access_coach_idx on public.coach_access (coach_user_id);
create index if not exists coach_access_athlete_idx on public.coach_access (athlete_user_id);

alter table public.coach_access enable row level security;

drop trigger if exists coach_access_set_updated_at on public.coach_access;
create trigger coach_access_set_updated_at
  before update on public.coach_access
  for each row execute function public.set_updated_at();

-- Athletes manage their own grants (invite, change permissions, revoke).
create policy "coach_access_athlete_manage" on public.coach_access
  for all using (auth.uid() = athlete_user_id) with check (auth.uid() = athlete_user_id);

-- An invited coach can see a pending invite addressed to their own email
-- (needed before they've claimed it — coach_user_id is still null then),
-- and can see grants once claimed.
create policy "coach_access_select_as_coach" on public.coach_access
  for select using (auth.uid() = coach_user_id or (status = 'pending' and coach_email = auth.email()));

-- Claiming: an invited coach may attach their own user id to a pending
-- invite addressed to their email, flipping it to active. This is the
-- only column change this policy allows in practice (the UI never asks
-- the coach to edit the permission flags themselves).
create policy "coach_access_claim" on public.coach_access
  for update using (status = 'pending' and coach_email = auth.email())
  with check (coach_user_id = auth.uid() and status = 'active');

-- ---------- extend existing tables so an active coach grant can read them ----------

create policy "workouts_select_via_coach" on public.workouts
  for select using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = workouts.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_view_workouts
    )
  );

create policy "strava_activities_select_via_coach" on public.strava_activities
  for select using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = strava_activities.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_view_workouts
    )
  );

create policy "categories_select_via_coach" on public.categories
  for select using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = categories.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_view_workouts
    )
  );

create policy "cycles_select_via_coach" on public.cycles
  for select using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = cycles.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_view_workouts
    )
  );

-- Note on can_view_reports: reports are computed client-side from the same
-- workout rows (there's no separate aggregated data source), so it can't be
-- an independent RLS gate the way can_view_workouts is — it's enforced as a
-- page-level toggle (hides the Raporty tab in the coach's read-only view)
-- rather than a database-level one. A truly independent "stats only, no
-- log detail" split would need server-side aggregation (a view/RPC), which
-- is future work if that distinction ever matters in practice.

-- Note: strava_connections (OAuth tokens) deliberately has no coach policy —
-- a coach should never be able to read an athlete's Strava tokens.
