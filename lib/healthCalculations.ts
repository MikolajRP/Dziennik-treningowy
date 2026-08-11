import { addDays, fmtShort } from "./calculations";
import type { HealthEntry } from "./types";

// Most recent entry (any date, not necessarily yesterday — the athlete may
// have skipped a day) — used to prefill a new day's gate card so there's as
// little re-typing as possible.
export function latestHealthEntry(entries: HealthEntry[]): HealthEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((latest, e) => (e.date > latest.date ? e : latest));
}

export interface HealthSeriesPoint {
  date: string;
  tickLabel: string;
  sleepHours: number;
  sleepQuality: number;
  hrv: number;
  restingHr: number;
  weightKg: number;
  wellbeing: number;
}

// Entries within the last `days` days (inclusive of today), oldest first —
// feeds the trend charts on the Statystyki sub-tab.
export function healthSeriesForLastDays(entries: HealthEntry[], days: number, today: string): HealthSeriesPoint[] {
  const cutoff = addDays(today, -(days - 1));
  return entries
    .filter((e) => e.date >= cutoff && e.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((e) => ({
      date: e.date,
      tickLabel: fmtShort(e.date),
      sleepHours: e.sleepHours,
      sleepQuality: e.sleepQuality,
      hrv: e.hrv,
      restingHr: e.restingHr,
      weightKg: e.weightKg,
      wellbeing: e.wellbeing,
    }));
}
