-- ---------- personal_events (Planner tab's day feed) ----------
-- Deliberately minimal: title, optional time, a color tag, a done checkbox.
-- Coach-planned training and races already live in their own tables
-- (plan_entries / races) and are pulled into the same feed read-only on the
-- client, not duplicated here. Personal, athlete-only — no coach RLS policy.
create table if not exists public.personal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  time time,
  title text not null,
  color text not null default '#3E8EDE',
  notes text not null default '',
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personal_events_user_date_idx on public.personal_events (user_id, date);

alter table public.personal_events enable row level security;

create policy "personal_events_select_own" on public.personal_events
  for select using (auth.uid() = user_id);
create policy "personal_events_insert_own" on public.personal_events
  for insert with check (auth.uid() = user_id);
create policy "personal_events_update_own" on public.personal_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "personal_events_delete_own" on public.personal_events
  for delete using (auth.uid() = user_id);

drop trigger if exists personal_events_set_updated_at on public.personal_events;
create trigger personal_events_set_updated_at
  before update on public.personal_events
  for each row execute function public.set_updated_at();
