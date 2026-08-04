import { todayISO } from "./calculations";
import type { Cycle, PlanEntry, Workout } from "./types";

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

// Distinct, previously-written plan descriptions — feeds the same kind of
// autocomplete suggestion dropdown exercise names already get.
export function collectKnownPlanNotes(planEntries: PlanEntry[]): string[] {
  const names = new Set<string>();
  planEntries.forEach((e) => e.notes.trim() && names.add(e.notes.trim()));
  return Array.from(names).sort((a, b) => a.localeCompare(b, "pl"));
}

// The cycle (if any) whose range covers `date`, for calendar highlighting.
// A mezocykl is more specific than a makrocykl, so it wins when both match.
export function cycleForDate(cycles: Cycle[], date: string): Cycle | null {
  const matches = cycles.filter((c) => date >= c.start && date <= c.end);
  if (matches.length === 0) return null;
  return matches.find((c) => c.type === "mezocykl") ?? matches[0];
}
