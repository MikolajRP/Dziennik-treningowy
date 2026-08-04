import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES } from "./design";
import type { CoachAccess, CoachNote, Cycle, PlanEntry, StravaActivity, Workout, WorkoutExercise } from "./types";

const WORKOUT_SELECT =
  "id, date, category, name, subtitle, notes, exercises, duration_minutes, time_of_day, strava_activities(id, strava_activity_id, name, type, start_date, distance_m, moving_time_s, elapsed_time_s, elevation_gain_m, average_speed_mps, average_heartrate, max_heartrate, splits_metric, hr_zones, polyline)";

interface StravaActivityRow {
  id: string;
  strava_activity_id: number;
  name: string;
  type: string;
  start_date: string;
  distance_m: number;
  moving_time_s: number;
  elapsed_time_s: number;
  elevation_gain_m: number;
  average_speed_mps: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  splits_metric: StravaActivity["splitsMetric"];
  hr_zones: StravaActivity["hrZones"];
  polyline: string | null;
}
interface WorkoutRow {
  id: string;
  date: string;
  category: string;
  name: string | null;
  subtitle: string | null;
  notes: string | null;
  exercises: WorkoutExercise[];
  duration_minutes: number | null;
  time_of_day: Workout["timeOfDay"] | null;
  strava_activities: StravaActivityRow[] | null;
}
interface CycleRow {
  id: string;
  name: string;
  type: Cycle["type"];
  start_date: string;
  end_date: string;
  color: string | null;
  notes: string;
  visible_to_athlete: boolean;
  created_by: string | null;
}

const stravaActivityFromRow = (r: StravaActivityRow): StravaActivity => ({
  id: r.id,
  stravaActivityId: r.strava_activity_id,
  name: r.name,
  type: r.type,
  startDate: r.start_date,
  distanceM: r.distance_m,
  movingTimeS: r.moving_time_s,
  elapsedTimeS: r.elapsed_time_s,
  elevationGainM: r.elevation_gain_m,
  averageSpeedMps: r.average_speed_mps,
  averageHeartrate: r.average_heartrate,
  maxHeartrate: r.max_heartrate,
  splitsMetric: r.splits_metric,
  hrZones: r.hr_zones,
  polyline: r.polyline,
});

const workoutFromRow = (r: WorkoutRow): Workout => ({
  id: r.id,
  date: r.date,
  category: r.category,
  name: r.name ?? undefined,
  subtitle: r.subtitle ?? undefined,
  notes: r.notes ?? "",
  exercises: r.exercises ?? [],
  durationMinutes: r.duration_minutes ?? undefined,
  timeOfDay: r.time_of_day ?? undefined,
  stravaActivities: (r.strava_activities ?? []).map(stravaActivityFromRow),
});

const CYCLE_SELECT = "id, name, type, start_date, end_date, color, notes, visible_to_athlete, created_by";

const cycleFromRow = (r: CycleRow): Cycle => ({
  id: r.id,
  name: r.name,
  type: r.type,
  start: r.start_date,
  end: r.end_date,
  color: r.color,
  notes: r.notes,
  visibleToAthlete: r.visible_to_athlete,
  createdBy: r.created_by ?? undefined,
});

export async function fetchWorkouts(supabase: SupabaseClient, forUserId?: string): Promise<Workout[]> {
  let query = supabase.from("workouts").select(WORKOUT_SELECT).order("date", { ascending: false });
  if (forUserId) query = query.eq("user_id", forUserId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as WorkoutRow[]).map(workoutFromRow);
}

export async function saveWorkout(
  supabase: SupabaseClient,
  userId: string,
  workout: Workout,
  editingId: string | null
): Promise<Workout> {
  if (editingId) {
    const { data, error } = await supabase
      .from("workouts")
      .update({
        date: workout.date,
        category: workout.category,
        name: workout.name || null,
        subtitle: workout.subtitle || null,
        notes: workout.notes,
        exercises: workout.exercises,
        duration_minutes: workout.durationMinutes ?? null,
        time_of_day: workout.timeOfDay ?? null,
      })
      .eq("id", editingId)
      .select(WORKOUT_SELECT)
      .single();
    if (error) throw error;
    return workoutFromRow(data as unknown as WorkoutRow);
  }
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      date: workout.date,
      category: workout.category,
      name: workout.name || null,
      subtitle: workout.subtitle || null,
      notes: workout.notes,
      exercises: workout.exercises,
      duration_minutes: workout.durationMinutes ?? null,
      time_of_day: workout.timeOfDay ?? null,
    })
    .select(WORKOUT_SELECT)
    .single();
  if (error) throw error;
  return workoutFromRow(data as unknown as WorkoutRow);
}

export async function deleteWorkoutRow(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCategories(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (data.length === 0) {
    const { error: seedError } = await supabase
      .from("categories")
      .insert(DEFAULT_CATEGORIES.map((name) => ({ user_id: userId, name })));
    if (seedError) throw seedError;
    return DEFAULT_CATEGORIES;
  }
  return data.map((r) => r.name as string);
}

export async function addCategoryRow(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<void> {
  const { error } = await supabase.from("categories").insert({ user_id: userId, name });
  if (error) throw error;
}

export async function fetchCycles(supabase: SupabaseClient, forUserId?: string): Promise<Cycle[]> {
  let query = supabase.from("cycles").select(CYCLE_SELECT).order("start_date", { ascending: false });
  if (forUserId) query = query.eq("user_id", forUserId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as CycleRow[]).map(cycleFromRow);
}

// Read-only variant for a coach viewing an athlete — no seeding (a coach's
// session can never insert rows owned by the athlete, RLS would reject it).
export async function fetchCategoriesReadOnly(supabase: SupabaseClient, forUserId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", forUserId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((r) => r.name as string);
}

export async function saveCycleRow(
  supabase: SupabaseClient,
  userId: string,
  createdBy: string,
  cycle: Cycle
): Promise<Cycle> {
  if (cycle.id) {
    const { data, error } = await supabase
      .from("cycles")
      .update({
        name: cycle.name,
        type: cycle.type,
        start_date: cycle.start,
        end_date: cycle.end,
        color: cycle.color || null,
        notes: cycle.notes ?? "",
        visible_to_athlete: cycle.visibleToAthlete ?? true,
      })
      .eq("id", cycle.id)
      .select(CYCLE_SELECT)
      .single();
    if (error) throw error;
    return cycleFromRow(data as CycleRow);
  }
  const { data, error } = await supabase
    .from("cycles")
    .insert({
      user_id: userId,
      created_by: createdBy,
      name: cycle.name,
      type: cycle.type,
      start_date: cycle.start,
      end_date: cycle.end,
      color: cycle.color || null,
      notes: cycle.notes ?? "",
      visible_to_athlete: cycle.visibleToAthlete ?? true,
    })
    .select(CYCLE_SELECT)
    .single();
  if (error) throw error;
  return cycleFromRow(data as CycleRow);
}

export async function deleteCycleRow(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("cycles").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Strava ----------

export async function fetchStravaConnected(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.from("strava_connections").select("user_id").maybeSingle();
  return !!data;
}

export async function disconnectStrava(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from("strava_connections").delete().not("user_id", "is", null);
  if (error) throw error;
}

// Moves every Strava activity from `sourceWorkoutId` onto `targetWorkoutId`,
// then deletes the now-empty source workout. Covers both "attach a run to a
// strength day" and "combine two runs" — the target just determines which
// shape the result is.
export async function attachStravaActivities(
  supabase: SupabaseClient,
  sourceWorkoutId: string,
  targetWorkoutId: string
): Promise<Workout> {
  const { error: moveError } = await supabase
    .from("strava_activities")
    .update({ workout_id: targetWorkoutId })
    .eq("workout_id", sourceWorkoutId);
  if (moveError) throw moveError;

  const { error: deleteError } = await supabase.from("workouts").delete().eq("id", sourceWorkoutId);
  if (deleteError) throw deleteError;

  const { data, error } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("id", targetWorkoutId)
    .single();
  if (error) throw error;
  return workoutFromRow(data as unknown as WorkoutRow);
}

// Pulls one Strava activity back out into its own standalone workout —
// the undo for attachStravaActivities. If the workout it's leaving becomes
// empty (no exercises, no other Strava activities), that workout is deleted.
export async function detachStravaActivity(
  supabase: SupabaseClient,
  userId: string,
  activityRowId: string,
  category: string
): Promise<{ newWorkout: Workout; sourceWorkoutId: string; sourceDeleted: boolean }> {
  const { data: activityRow, error: activityError } = await supabase
    .from("strava_activities")
    .select("start_date, workout_id")
    .eq("id", activityRowId)
    .single();
  if (activityError) throw activityError;
  const sourceWorkoutId = activityRow.workout_id as string;

  const { data: newWorkoutRow, error: insertError } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      date: (activityRow.start_date as string).slice(0, 10),
      category,
      notes: "",
      exercises: [],
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const { error: moveError } = await supabase
    .from("strava_activities")
    .update({ workout_id: newWorkoutRow.id })
    .eq("id", activityRowId);
  if (moveError) throw moveError;

  const { data: newWorkout, error: fetchNewError } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("id", newWorkoutRow.id)
    .single();
  if (fetchNewError) throw fetchNewError;

  const { data: remaining } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("id", sourceWorkoutId)
    .maybeSingle();
  let sourceDeleted = false;
  if (remaining) {
    const r = remaining as unknown as WorkoutRow;
    const hasExercises = (r.exercises ?? []).length > 0;
    const hasOtherActivities = (r.strava_activities ?? []).length > 0;
    if (!hasExercises && !hasOtherActivities) {
      await supabase.from("workouts").delete().eq("id", sourceWorkoutId);
      sourceDeleted = true;
    }
  }

  return {
    newWorkout: workoutFromRow(newWorkout as unknown as WorkoutRow),
    sourceWorkoutId,
    sourceDeleted,
  };
}

// ---------- coach access ----------

interface CoachAccessRow {
  id: string;
  athlete_user_id: string;
  athlete_email: string;
  athlete_name: string | null;
  coach_email: string;
  coach_user_id: string | null;
  status: CoachAccess["status"];
  can_view_workouts: boolean;
  can_view_reports: boolean;
  can_edit_plan: boolean;
}

const COACH_ACCESS_SELECT =
  "id, athlete_user_id, athlete_email, athlete_name, coach_email, coach_user_id, status, can_view_workouts, can_view_reports, can_edit_plan";

const coachAccessFromRow = (r: CoachAccessRow): CoachAccess => ({
  id: r.id,
  athleteUserId: r.athlete_user_id,
  athleteEmail: r.athlete_email,
  athleteName: r.athlete_name,
  coachEmail: r.coach_email,
  coachUserId: r.coach_user_id,
  status: r.status,
  canViewWorkouts: r.can_view_workouts,
  canViewReports: r.can_view_reports,
  canEditPlan: r.can_edit_plan,
});

// Grants this athlete has handed out (to coaches), for the athlete's own
// management screen.
export async function fetchCoachGrantsAsAthlete(
  supabase: SupabaseClient,
  athleteUserId: string
): Promise<CoachAccess[]> {
  const { data, error } = await supabase
    .from("coach_access")
    .select(COACH_ACCESS_SELECT)
    .eq("athlete_user_id", athleteUserId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as CoachAccessRow[]).map(coachAccessFromRow);
}

// Pending invites addressed to the current user's own email — shown as
// "accept this invite" prompts.
export async function fetchPendingInvitesForMe(
  supabase: SupabaseClient,
  myEmail: string
): Promise<CoachAccess[]> {
  const { data, error } = await supabase
    .from("coach_access")
    .select(COACH_ACCESS_SELECT)
    .eq("coach_email", myEmail)
    .eq("status", "pending");
  if (error) throw error;
  return (data as CoachAccessRow[]).map(coachAccessFromRow);
}

// Athletes this user has accepted a coach invite for — populates the
// "podopieczni" picker.
export async function fetchAthletesForCoach(supabase: SupabaseClient, coachUserId: string): Promise<CoachAccess[]> {
  const { data, error } = await supabase
    .from("coach_access")
    .select(COACH_ACCESS_SELECT)
    .eq("coach_user_id", coachUserId)
    .eq("status", "active");
  if (error) throw error;
  return (data as CoachAccessRow[]).map(coachAccessFromRow);
}

// The specific grant a coach is viewing an athlete under — used to gate
// the read-only view and decide which tabs to show.
export async function fetchCoachGrantForAthlete(
  supabase: SupabaseClient,
  coachUserId: string,
  athleteUserId: string
): Promise<CoachAccess | null> {
  const { data, error } = await supabase
    .from("coach_access")
    .select(COACH_ACCESS_SELECT)
    .eq("coach_user_id", coachUserId)
    .eq("athlete_user_id", athleteUserId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data ? coachAccessFromRow(data as CoachAccessRow) : null;
}

export async function inviteCoach(
  supabase: SupabaseClient,
  athleteUserId: string,
  athleteEmail: string,
  coachEmail: string
): Promise<CoachAccess> {
  const { data, error } = await supabase
    .from("coach_access")
    .insert({
      athlete_user_id: athleteUserId,
      athlete_email: athleteEmail,
      coach_email: coachEmail.trim().toLowerCase(),
    })
    .select(COACH_ACCESS_SELECT)
    .single();
  if (error) throw error;
  return coachAccessFromRow(data as CoachAccessRow);
}

export async function acceptCoachInvite(
  supabase: SupabaseClient,
  id: string,
  coachUserId: string
): Promise<CoachAccess> {
  const { data, error } = await supabase
    .from("coach_access")
    .update({ coach_user_id: coachUserId, status: "active" })
    .eq("id", id)
    .select(COACH_ACCESS_SELECT)
    .single();
  if (error) throw error;
  return coachAccessFromRow(data as CoachAccessRow);
}

export async function updateCoachPermissions(
  supabase: SupabaseClient,
  id: string,
  patch: { canViewWorkouts?: boolean; canViewReports?: boolean; canEditPlan?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from("coach_access")
    .update({
      ...(patch.canViewWorkouts !== undefined && { can_view_workouts: patch.canViewWorkouts }),
      ...(patch.canViewReports !== undefined && { can_view_reports: patch.canViewReports }),
      ...(patch.canEditPlan !== undefined && { can_edit_plan: patch.canEditPlan }),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function revokeCoachAccess(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("coach_access").delete().eq("id", id);
  if (error) throw error;
}

// Coach-only label for an athlete, shown instead of their email. A DB
// trigger locks this update to just this column even if the app sent more.
export async function updateAthleteName(supabase: SupabaseClient, id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("coach_access")
    .update({ athlete_name: name.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

// ---------- training plan ----------

interface PlanEntryRow {
  id: string;
  athlete_user_id: string;
  created_by: string;
  date: string;
  slot: PlanEntry["slot"];
  category: string;
  notes: string;
  is_draft: boolean;
}

const PLAN_ENTRY_SELECT = "id, athlete_user_id, created_by, date, slot, category, notes, is_draft";

const planEntryFromRow = (r: PlanEntryRow): PlanEntry => ({
  id: r.id,
  athleteUserId: r.athlete_user_id,
  createdBy: r.created_by,
  date: r.date,
  slot: r.slot,
  category: r.category,
  notes: r.notes,
  isDraft: r.is_draft,
});

export async function fetchPlanEntries(supabase: SupabaseClient, athleteUserId: string): Promise<PlanEntry[]> {
  const { data, error } = await supabase
    .from("plan_entries")
    .select(PLAN_ENTRY_SELECT)
    .eq("athlete_user_id", athleteUserId)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data as PlanEntryRow[]).map(planEntryFromRow);
}

export async function addPlanEntry(
  supabase: SupabaseClient,
  athleteUserId: string,
  coachUserId: string,
  entry: { date: string; slot: PlanEntry["slot"]; category: string; notes: string; isDraft?: boolean }
): Promise<PlanEntry> {
  const { data, error } = await supabase
    .from("plan_entries")
    .insert({
      athlete_user_id: athleteUserId,
      created_by: coachUserId,
      date: entry.date,
      slot: entry.slot,
      category: entry.category,
      notes: entry.notes,
      is_draft: entry.isDraft ?? false,
    })
    .select(PLAN_ENTRY_SELECT)
    .single();
  if (error) throw error;
  return planEntryFromRow(data as PlanEntryRow);
}

export async function updatePlanEntry(
  supabase: SupabaseClient,
  id: string,
  patch: { slot?: PlanEntry["slot"]; category?: string; notes?: string; isDraft?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from("plan_entries")
    .update({
      ...(patch.isDraft !== undefined && { is_draft: patch.isDraft }),
      ...(patch.slot !== undefined && { slot: patch.slot }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePlanEntry(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("plan_entries").delete().eq("id", id);
  if (error) throw error;
}

// ---------- coach notes (private, never read by the athlete) ----------

interface CoachNoteRow {
  id: string;
  athlete_user_id: string;
  coach_user_id: string;
  date: string;
  text: string;
}

const COACH_NOTE_SELECT = "id, athlete_user_id, coach_user_id, date, text";

const coachNoteFromRow = (r: CoachNoteRow): CoachNote => ({
  id: r.id,
  athleteUserId: r.athlete_user_id,
  coachUserId: r.coach_user_id,
  date: r.date,
  text: r.text,
});

export async function fetchCoachNotes(supabase: SupabaseClient, athleteUserId: string): Promise<CoachNote[]> {
  const { data, error } = await supabase
    .from("coach_notes")
    .select(COACH_NOTE_SELECT)
    .eq("athlete_user_id", athleteUserId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as CoachNoteRow[]).map(coachNoteFromRow);
}

// One note per (athlete, date) by convention — pass the existing note's id
// to update it, or omit it to create a new one.
export async function saveCoachNote(
  supabase: SupabaseClient,
  athleteUserId: string,
  coachUserId: string,
  note: { id?: string; date: string; text: string }
): Promise<CoachNote> {
  if (note.id) {
    const { data, error } = await supabase
      .from("coach_notes")
      .update({ text: note.text })
      .eq("id", note.id)
      .select(COACH_NOTE_SELECT)
      .single();
    if (error) throw error;
    return coachNoteFromRow(data as CoachNoteRow);
  }
  const { data, error } = await supabase
    .from("coach_notes")
    .insert({ athlete_user_id: athleteUserId, coach_user_id: coachUserId, date: note.date, text: note.text })
    .select(COACH_NOTE_SELECT)
    .single();
  if (error) throw error;
  return coachNoteFromRow(data as CoachNoteRow);
}

export async function deleteCoachNote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("coach_notes").delete().eq("id", id);
  if (error) throw error;
}
