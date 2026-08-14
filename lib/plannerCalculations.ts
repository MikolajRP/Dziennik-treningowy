import { addDays } from "./calculations";
import type { PersonalEvent, PlanEntry, Race } from "./types";

// Timed events first (chronological), then untimed ones in their manual
// drag order at the end — like a to-do list appended below a day's
// schedule, the same convention most day-planner apps use.
export function sortDayFeedEvents(events: PersonalEvent[]): PersonalEvent[] {
  return [...events].sort((a, b) => {
    if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    return a.sortOrder - b.sortOrder;
  });
}

export function eventsForDate(events: PersonalEvent[], date: string): PersonalEvent[] {
  return sortDayFeedEvents(events.filter((e) => e.date === date));
}

// A rolling 7-day window centered on the selected day (3 before, 3 after)
// for the horizontal day-strip nav — keeps the selected day visible in the
// middle rather than snapping to a rigid Mon-Sun week.
export function plannerWeekStrip(selectedDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i - 3));
}

// Dates that have anything at all — feeds the small activity dot under
// each day in the strip nav.
export function datesWithActivity(personalEvents: PersonalEvent[], planEntries: PlanEntry[], races: Race[]): Set<string> {
  const set = new Set<string>();
  personalEvents.forEach((e) => set.add(e.date));
  planEntries.forEach((e) => set.add(e.date));
  races.forEach((r) => set.add(r.date));
  return set;
}
