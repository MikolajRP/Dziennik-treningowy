import { addDays, startOfWeek } from "./calculations";
import type { PersonalEvent, PlanEntry, Race } from "./types";

// The Monday-Sunday week containing `date` — used for both the week-view's
// day strip and the month grid's row layout.
export function weekDatesFor(date: string): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function timedEventsForDate(events: PersonalEvent[], date: string): PersonalEvent[] {
  return events
    .filter((e) => e.date === date && e.time)
    .sort((a, b) => (a.time! < b.time! ? -1 : a.time! > b.time! ? 1 : 0));
}

export function untimedEventsForDate(events: PersonalEvent[], date: string): PersonalEvent[] {
  return events.filter((e) => e.date === date && !e.time).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Dates that have anything at all — feeds the small activity dots in the
// month grid and week strip.
export function datesWithActivity(personalEvents: PersonalEvent[], planEntries: PlanEntry[], races: Race[]): Set<string> {
  const set = new Set<string>();
  personalEvents.forEach((e) => set.add(e.date));
  planEntries.forEach((e) => set.add(e.date));
  races.forEach((r) => set.add(r.date));
  return set;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Falls back to a 60-minute block when there's no explicit end time (or a
// nonsensical one) — the form always sets one, this is just a safety net.
export function eventDurationMinutes(event: PersonalEvent): number {
  if (!event.time) return 0;
  if (!event.endTime) return 60;
  const start = timeToMinutes(event.time);
  const end = timeToMinutes(event.endTime);
  return end > start ? end - start : 60;
}

export interface TimedLayoutItem {
  event: PersonalEvent;
  col: number;
  cols: number;
}

// Positions same-day timed events into side-by-side columns wherever their
// time ranges overlap — the classic "calendar week view" layout: events are
// swept in start-time order, each placed in the first column whose previous
// occupant has already ended, and every mutually-overlapping cluster shares
// one column count so unrelated events elsewhere in the day stay full-width.
export function layoutTimedEvents(events: PersonalEvent[]): TimedLayoutItem[] {
  const withRange = events
    .filter((e) => e.time)
    .map((e) => ({ event: e, start: timeToMinutes(e.time!), end: timeToMinutes(e.time!) + eventDurationMinutes(e) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: TimedLayoutItem[] = [];
  let group: typeof withRange = [];
  let groupEnd = -1;

  function flushGroup() {
    if (group.length === 0) return;
    const columnEnds: number[] = [];
    const colByIndex: number[] = [];
    group.forEach((item, i) => {
      let placed = -1;
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= item.start) {
          columnEnds[c] = item.end;
          placed = c;
          break;
        }
      }
      if (placed === -1) {
        columnEnds.push(item.end);
        placed = columnEnds.length - 1;
      }
      colByIndex[i] = placed;
    });
    const cols = columnEnds.length;
    group.forEach((item, i) => result.push({ event: item.event, col: colByIndex[i], cols }));
    group = [];
  }

  for (const item of withRange) {
    if (group.length === 0 || item.start < groupEnd) {
      group.push(item);
      groupEnd = Math.max(groupEnd, item.end);
    } else {
      flushGroup();
      group = [item];
      groupEnd = item.end;
    }
  }
  flushGroup();

  return result;
}
