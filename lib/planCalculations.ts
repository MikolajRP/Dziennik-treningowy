import { todayISO } from "./calculations";
import type { PlanEntry, Workout } from "./types";

// Whether a plan entry was actually done is never stored — it's inferred at
// read time by matching its date against the athlete's real `workouts`.
export type PlanEntryStatus = "planned" | "done" | "missed";

export interface PlanEntryWithStatus {
  entry: PlanEntry;
  status: PlanEntryStatus;
  matchedWorkoutId: string | null;
}

const SLOT_ORDER: Record<PlanEntry["slot"], number> = { am: 0, full: 1, pm: 2 };

// Best-effort: if a day has N planned entries and M real workouts, entries
// are zipped to workouts in slot order (am, full, pm) so a click can jump
// somewhere reasonable even when the counts don't line up 1:1.
export function entriesForDate(planEntries: PlanEntry[], workouts: Workout[], date: string): PlanEntryWithStatus[] {
  const dayEntries = planEntries
    .filter((e) => e.date === date)
    .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
  const dayWorkouts = workouts.filter((w) => w.date === date);
  const today = todayISO();

  return dayEntries.map((entry, i) => {
    if (dayWorkouts.length > 0) {
      const matched = dayWorkouts[i] ?? dayWorkouts[0];
      return { entry, status: "done" as const, matchedWorkoutId: matched.id };
    }
    if (date < today) return { entry, status: "missed" as const, matchedWorkoutId: null };
    return { entry, status: "planned" as const, matchedWorkoutId: null };
  });
}
