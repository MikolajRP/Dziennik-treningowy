import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES } from "./design";
import type { Cycle, StravaActivity, Workout, WorkoutExercise } from "./types";

const WORKOUT_SELECT =
  "id, date, category, notes, exercises, duration_minutes, strava_activities(id, strava_activity_id, name, type, start_date, distance_m, moving_time_s, elapsed_time_s, elevation_gain_m, average_speed_mps, average_heartrate, max_heartrate, splits_metric, hr_zones, polyline)";

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
  notes: string | null;
  exercises: WorkoutExercise[];
  duration_minutes: number | null;
  strava_activities: StravaActivityRow[] | null;
}
interface CycleRow {
  id: string;
  name: string;
  type: Cycle["type"];
  start_date: string;
  end_date: string;
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
  notes: r.notes ?? "",
  exercises: r.exercises ?? [],
  durationMinutes: r.duration_minutes ?? undefined,
  stravaActivities: (r.strava_activities ?? []).map(stravaActivityFromRow),
});

const cycleFromRow = (r: CycleRow): Cycle => ({
  id: r.id,
  name: r.name,
  type: r.type,
  start: r.start_date,
  end: r.end_date,
});

export async function fetchWorkouts(supabase: SupabaseClient): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .order("date", { ascending: false });
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
        notes: workout.notes,
        exercises: workout.exercises,
        duration_minutes: workout.durationMinutes ?? null,
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
      notes: workout.notes,
      exercises: workout.exercises,
      duration_minutes: workout.durationMinutes ?? null,
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

export async function fetchCycles(supabase: SupabaseClient): Promise<Cycle[]> {
  const { data, error } = await supabase
    .from("cycles")
    .select("id, name, type, start_date, end_date")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data as CycleRow[]).map(cycleFromRow);
}

export async function saveCycleRow(
  supabase: SupabaseClient,
  userId: string,
  cycle: Cycle
): Promise<Cycle> {
  if (cycle.id) {
    const { data, error } = await supabase
      .from("cycles")
      .update({ name: cycle.name, type: cycle.type, start_date: cycle.start, end_date: cycle.end })
      .eq("id", cycle.id)
      .select("id, name, type, start_date, end_date")
      .single();
    if (error) throw error;
    return cycleFromRow(data as CycleRow);
  }
  const { data, error } = await supabase
    .from("cycles")
    .insert({
      user_id: userId,
      name: cycle.name,
      type: cycle.type,
      start_date: cycle.start,
      end_date: cycle.end,
    })
    .select("id, name, type, start_date, end_date")
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
