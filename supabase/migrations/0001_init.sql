-- Dziennik Treningowy — initial schema
-- Tables are scoped per-user via Supabase Auth (auth.uid()) and protected with RLS.

create extension if not exists "pgcrypto";

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- ---------- cycles (mezocykl / makrocykl) ----------
create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('mezocykl', 'makrocykl')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

alter table public.cycles enable row level security;

create policy "cycles_select_own" on public.cycles
  for select using (auth.uid() = user_id);
create policy "cycles_insert_own" on public.cycles
  for insert with check (auth.uid() = user_id);
create policy "cycles_update_own" on public.cycles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cycles_delete_own" on public.cycles
  for delete using (auth.uid() = user_id);

-- ---------- workouts ----------
-- `exercises` stores the ordered list of leaf exercises / circuits exactly as
-- edited in the form (see lib/types.ts) — kept as jsonb to preserve the
-- nested circuit structure 1:1 with the prototype's data model.
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  category text not null,
  notes text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);

alter table public.workouts enable row level security;

create policy "workouts_select_own" on public.workouts
  for select using (auth.uid() = user_id);
create policy "workouts_insert_own" on public.workouts
  for insert with check (auth.uid() = user_id);
create policy "workouts_update_own" on public.workouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workouts_delete_own" on public.workouts
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();
