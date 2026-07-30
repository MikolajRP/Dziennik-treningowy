import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES } from "./design";
import type { Cycle, Workout, WorkoutExercise } from "./types";

interface WorkoutRow {
  id: string;
  date: string;
  category: string;
  notes: string | null;
  exercises: WorkoutExercise[];
}
interface CycleRow {
  id: string;
  name: string;
  type: Cycle["type"];
  start_date: string;
  end_date: string;
}

const workoutFromRow = (r: WorkoutRow): Workout => ({
  id: r.id,
  date: r.date,
  category: r.category,
  notes: r.notes ?? "",
  exercises: r.exercises ?? [],
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
    .select("id, date, category, notes, exercises")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as WorkoutRow[]).map(workoutFromRow);
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
      })
      .eq("id", editingId)
      .select("id, date, category, notes, exercises")
      .single();
    if (error) throw error;
    return workoutFromRow(data as WorkoutRow);
  }
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      date: workout.date,
      category: workout.category,
      notes: workout.notes,
      exercises: workout.exercises,
    })
    .select("id, date, category, notes, exercises")
    .single();
  if (error) throw error;
  return workoutFromRow(data as WorkoutRow);
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
