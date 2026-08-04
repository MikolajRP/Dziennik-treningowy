-- Coach-private data: drafts, coach notes, and hidden cycles were only ever
-- scoped to "does this coach have an active grant on this athlete", not to
-- "did THIS coach create it" — so if an athlete has two active coaches, they
-- could see each other's unpublished drafts, private notes, and hidden
-- cycles. This tightens those three to the creating coach only. Published
-- plan entries and athlete-visible cycles stay shared across coaches, since
-- that's team-coordination info the athlete themselves already sees.

-- ---------- coach_notes: creator-only, always ----------
drop policy if exists "coach_notes_coach_manage" on public.coach_notes;
create policy "coach_notes_coach_manage" on public.coach_notes
  for all using (
    coach_user_id = auth.uid()
    and exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = coach_notes.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  )
  with check (
    coach_user_id = auth.uid()
    and exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = coach_notes.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
  );

-- ---------- plan_entries: drafts are creator-only, published stays shared ----------
drop policy if exists "plan_entries_coach_manage" on public.plan_entries;
create policy "plan_entries_coach_manage" on public.plan_entries
  for all using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = plan_entries.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
    and (is_draft = false or created_by = auth.uid())
  )
  with check (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = plan_entries.athlete_user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
    and (is_draft = false or created_by = auth.uid())
  );

-- ---------- cycles: hidden-from-athlete cycles are creator-only, visible ones stay shared ----------
drop policy if exists "cycles_select_via_coach" on public.cycles;
create policy "cycles_select_via_coach" on public.cycles
  for select using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = cycles.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_view_workouts
    )
    and (visible_to_athlete = true or created_by = auth.uid())
  );

drop policy if exists "cycles_coach_manage" on public.cycles;
create policy "cycles_coach_manage" on public.cycles
  for all using (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = cycles.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
    and (visible_to_athlete = true or created_by = auth.uid())
  )
  with check (
    exists (
      select 1 from public.coach_access ca
      where ca.athlete_user_id = cycles.user_id
        and ca.coach_user_id = auth.uid()
        and ca.status = 'active'
        and ca.can_edit_plan
    )
    and (visible_to_athlete = true or created_by = auth.uid())
  );
