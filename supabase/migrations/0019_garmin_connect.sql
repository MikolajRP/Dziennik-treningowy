-- Garmin Connect integration: unlike Strava, Garmin's real developer API
-- needs a business-partnership approval, so this talks to Garmin Connect's
-- own (undocumented, unofficial) web API using the athlete's own login —
-- there is no OAuth authorize/callback dance to piggyback on, so the
-- username/password have to be stored (encrypted at rest by the app,
-- server-side, before ever touching this table — see lib/crypto.ts).
-- OAuth1/OAuth2 tokens obtained after a successful login are cached too, so
-- most syncs can reuse a session instead of re-authenticating from scratch.

create table if not exists public.garmin_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username_encrypted text not null,
  password_encrypted text not null,
  oauth1_token jsonb,
  oauth2_token jsonb,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.garmin_connections enable row level security;

create policy "garmin_connections_select_own" on public.garmin_connections
  for select using (auth.uid() = user_id);
create policy "garmin_connections_insert_own" on public.garmin_connections
  for insert with check (auth.uid() = user_id);
create policy "garmin_connections_update_own" on public.garmin_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "garmin_connections_delete_own" on public.garmin_connections
  for delete using (auth.uid() = user_id);

drop trigger if exists garmin_connections_set_updated_at on public.garmin_connections;
create trigger garmin_connections_set_updated_at
  before update on public.garmin_connections
  for each row execute function public.set_updated_at();
