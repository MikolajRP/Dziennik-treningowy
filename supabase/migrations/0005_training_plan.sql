-- Training plan: a coach can pencil in planned workouts for an athlete on a
-- calendar (optionally split into an AM/PM pair per day). The athlete only
-- ever reads this table; whether a planned entry is "done" is inferred at
-- read time by matching its date against the athlete's real `workouts` rows
-- (no explicit link is stored) — the app computes that client-side.

alter table public.coach_access add column if not exists can_edit_plan boolean not null default true;

create table if not exists public.plan_entries (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  date date not null,
  slot text not null default 'full' check (slot in ('full', 'am', 'pm')),
  category text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_entries_athlete_date_idx on public.plan_entries (athlete_user_id, date);

alter table public.plan_entries enable row level security;

drop trigger if exists plan_entries_set_updated_at on public.plan_entries;
create trigger plan_entries_set_updated_at
  before update on public.plan_entries
  for each row execute function public.set_updated_at();

-- Athlete: read-only access to their own plan.
create policy "plan_entries_athlete_select" on public.plan_entries
  for select using (auth.uid() = athlete_user_id);

-- Coach: full read/write access to an athlete's plan, gated by an active
-- grant with can_edit_plan.
create policy "plan_entries_coach_manage" on public.plan_entries
  for all using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = plan_entries.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  )
  with check (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = plan_entries.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  );

-- Let an authorized coach also manage the athlete's training cycles
-- (mezocykl/makrocykl) — same permission gate as the plan, since cycles are
-- part of the same periodization planning. The athlete keeps their existing
-- "cycles_select_via_coach" read policy from 0004 regardless of this flag.
create policy "cycles_coach_manage" on public.cycles
  for all using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = cycles.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  )
  with check (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = cycles.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  );
