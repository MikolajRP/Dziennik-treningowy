-- Tracks whether the athlete has seen a coach's remark on a workout, so
-- the Dziennik can show/hide an "unread" badge. Unread is simply
-- `read_at is null` — the app resets it to null whenever the coach
-- (re)saves the remark's text, and the athlete sets it once they've
-- opened the workout card and seen it.

alter table public.workout_coach_comments add column if not exists read_at timestamptz;

-- The athlete may update their own comment rows (to mark them read), but
-- must never be able to alter the remark itself — enforced the same way
-- 0007's coach_access_restrict_coach_update trigger protects coach_access:
-- a permissive RLS policy for the UPDATE, then a trigger that snaps every
-- other column back to its old value whenever the athlete is the actor.
drop policy if exists "workout_coach_comments_athlete_mark_read" on public.workout_coach_comments;
create policy "workout_coach_comments_athlete_mark_read" on public.workout_coach_comments
  for update using (auth.uid() = athlete_user_id)
  with check (auth.uid() = athlete_user_id);

create or replace function public.workout_coach_comments_restrict_athlete_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.athlete_user_id then
    new.workout_id := old.workout_id;
    new.athlete_user_id := old.athlete_user_id;
    new.coach_user_id := old.coach_user_id;
    new.text := old.text;
  end if;
  return new;
end;
$$;

drop trigger if exists workout_coach_comments_restrict_athlete_update_trg on public.workout_coach_comments;
create trigger workout_coach_comments_restrict_athlete_update_trg
  before update on public.workout_coach_comments
  for each row execute function public.workout_coach_comments_restrict_athlete_update();
