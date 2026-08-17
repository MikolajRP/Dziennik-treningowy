-- Two coach-feedback additions, both athlete-visible (unlike coach_notes,
-- which stays private):
--   1. A coach remark on a workout the athlete has already logged.
--   2. A second, longer "guidance" field on a plan entry, alongside its
--      existing short `notes` description.

-- ---------- plan entries: guidance field ----------
alter table public.plan_entries add column if not exists guidance text not null default '';

-- ---------- workout coach comments ----------
-- One remark per workout (upserted by workout_id, like coach_notes is one
-- per (athlete, date)) — feedback meant for the athlete to read, so unlike
-- coach_notes this DOES get an athlete-facing select policy.
create table if not exists public.workout_coach_comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  athlete_user_id uuid not null references auth.users(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_id)
);

create index if not exists workout_coach_comments_athlete_idx on public.workout_coach_comments (athlete_user_id);

alter table public.workout_coach_comments enable row level security;

drop trigger if exists workout_coach_comments_set_updated_at on public.workout_coach_comments;
create trigger workout_coach_comments_set_updated_at
  before update on public.workout_coach_comments
  for each row execute function public.set_updated_at();

drop policy if exists "workout_coach_comments_athlete_select" on public.workout_coach_comments;
create policy "workout_coach_comments_athlete_select" on public.workout_coach_comments
  for select using (auth.uid() = athlete_user_id);

drop policy if exists "workout_coach_comments_coach_manage" on public.workout_coach_comments;
create policy "workout_coach_comments_coach_manage" on public.workout_coach_comments
  for all using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = workout_coach_comments.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  )
  with check (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = workout_coach_comments.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  );
