-- ---------- health entries (daily wellness check-in) ----------
-- One row per (user, date) — filled once per day via the mandatory gate
-- shown on first app open that day. All fields required except notes; see
-- lib/types.ts HealthEntry.
create table if not exists public.health_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_hours numeric(4, 2) not null,
  sleep_quality smallint not null check (sleep_quality between 1 and 10),
  hrv smallint not null,
  resting_hr smallint not null,
  weight_kg numeric(5, 2) not null,
  wellbeing smallint not null check (wellbeing between 1 and 10),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists health_entries_user_date_idx on public.health_entries (user_id, date desc);

alter table public.health_entries enable row level security;

create policy "health_entries_select_own" on public.health_entries
  for select using (auth.uid() = user_id);
create policy "health_entries_insert_own" on public.health_entries
  for insert with check (auth.uid() = user_id);
create policy "health_entries_update_own" on public.health_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_entries_delete_own" on public.health_entries
  for delete using (auth.uid() = user_id);

drop trigger if exists health_entries_set_updated_at on public.health_entries;
create trigger health_entries_set_updated_at
  before update on public.health_entries
  for each row execute function public.set_updated_at();

-- Coach can read basic wellness data for an athlete they actively coach —
-- same gate as workouts (can_view_workouts), no separate permission toggle.
create policy "health_entries_select_via_coach" on public.health_entries
  for select using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = health_entries.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_view_workouts
    )
  );
