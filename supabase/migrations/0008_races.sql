-- Races: a single named event on a date, highlighted strongly on the plan
-- calendar. Unlike coach notes, these ARE meant to be visible to the
-- athlete — it's their race day — so the athlete gets a standing select
-- policy, not a coach-only one.

create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  date date not null,
  name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists races_athlete_date_idx on public.races (athlete_user_id, date);

alter table public.races enable row level security;

drop trigger if exists races_set_updated_at on public.races;
create trigger races_set_updated_at
  before update on public.races
  for each row execute function public.set_updated_at();

drop policy if exists "races_athlete_select" on public.races;
create policy "races_athlete_select" on public.races
  for select using (auth.uid() = athlete_user_id);

drop policy if exists "races_coach_manage" on public.races;
create policy "races_coach_manage" on public.races
  for all using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = races.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  )
  with check (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = races.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  );
