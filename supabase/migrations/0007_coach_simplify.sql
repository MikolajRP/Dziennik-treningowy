-- Coach-side simplification: draft plan entries, private per-day coach
-- notes, an athlete display name, and richer training cycles (visibility,
-- private notes, a calendar highlight color).

-- ---------- plan entries: draft mode ----------
-- A draft is planned but not yet shared with the athlete. The athlete's own
-- select policy is the enforcement point — drafts are excluded there, not
-- just hidden in the UI.
alter table public.plan_entries add column if not exists is_draft boolean not null default false;

drop policy if exists "plan_entries_athlete_select" on public.plan_entries;
create policy "plan_entries_athlete_select" on public.plan_entries
  for select using (auth.uid() = athlete_user_id and is_draft = false);

-- ---------- coach notes ----------
-- Purely private coach annotations, one per (athlete, date). Deliberately
-- has NO athlete-facing policy at all — unlike plan_entries, there is no
-- "share this" step; the athlete must never be able to read these.
create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  athlete_user_id uuid not null references auth.users(id) on delete cascade,
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_notes_athlete_date_idx on public.coach_notes (athlete_user_id, date);

alter table public.coach_notes enable row level security;

drop trigger if exists coach_notes_set_updated_at on public.coach_notes;
create trigger coach_notes_set_updated_at
  before update on public.coach_notes
  for each row execute function public.set_updated_at();

drop policy if exists "coach_notes_coach_manage" on public.coach_notes;
create policy "coach_notes_coach_manage" on public.coach_notes
  for all using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = coach_notes.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  )
  with check (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = coach_notes.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  );

-- ---------- athlete display name (coach-set label) ----------
alter table public.coach_access add column if not exists athlete_name text;

-- A coach may update their own active grant row, but only to set
-- athlete_name — the trigger below reverts any attempted change to every
-- other column, so a coach can never use this to self-grant permissions
-- or otherwise tamper with the grant.
drop policy if exists "coach_access_coach_update_name" on public.coach_access;
create policy "coach_access_coach_update_name" on public.coach_access
  for update using (auth.uid() = coach_user_id and status = 'active')
  with check (auth.uid() = coach_user_id and status = 'active');

create or replace function public.coach_access_restrict_coach_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.coach_user_id then
    new.athlete_user_id := old.athlete_user_id;
    new.athlete_email := old.athlete_email;
    new.coach_email := old.coach_email;
    new.coach_user_id := old.coach_user_id;
    new.status := old.status;
    new.can_view_workouts := old.can_view_workouts;
    new.can_view_reports := old.can_view_reports;
    new.can_edit_plan := old.can_edit_plan;
  end if;
  return new;
end;
$$;

drop trigger if exists coach_access_restrict_coach_update_trg on public.coach_access;
create trigger coach_access_restrict_coach_update_trg
  before update on public.coach_access
  for each row execute function public.coach_access_restrict_coach_update();

-- ---------- cycles: visibility, private notes, highlight color ----------
alter table public.cycles add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.cycles add column if not exists visible_to_athlete boolean not null default true;
alter table public.cycles add column if not exists notes text not null default '';
alter table public.cycles add column if not exists color text;

update public.cycles set created_by = user_id where created_by is null;

-- `notes` is coach-only by app convention (like coach_access.can_view_reports
-- before it) — RLS can't hide a single column, so the athlete-facing UI
-- simply never renders it, even though a visible row's notes technically
-- ride along in the query result.

drop policy if exists "cycles_select_own" on public.cycles;
create policy "cycles_select_own" on public.cycles
  for select using (auth.uid() = user_id and (visible_to_athlete or created_by = auth.uid()));

drop policy if exists "cycles_update_own" on public.cycles;
create policy "cycles_update_own" on public.cycles
  for update using (auth.uid() = user_id and (visible_to_athlete or created_by = auth.uid()))
  with check (auth.uid() = user_id);

drop policy if exists "cycles_delete_own" on public.cycles;
create policy "cycles_delete_own" on public.cycles
  for delete using (auth.uid() = user_id and (visible_to_athlete or created_by = auth.uid()));

-- cycles_insert_own (auth.uid() = user_id) from 0001 is unchanged — a new
-- row can't fail a visibility check that only matters for reading it back.
