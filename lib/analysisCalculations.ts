import type { Cycle, HealthEntry, StravaActivity, Workout } from "./types";
import {
  addDays,
  computeWorkoutAerobicMinutes,
  computeWorkoutFunctionalMinutes,
  computeWorkoutIsometricTUT,
  computeWorkoutPlyoReps,
  computeWorkoutTonnage,
  fmtDate,
  fmtDurationShort,
  fmtHoursMinutes,
  fmtMinutesLong,
  fmtPaceMinPerKm,
  fmtShort,
  startOfWeek,
  todayISO,
} from "./calculations";
import {
  aggregateHrZones,
  collectStravaActivities,
  computeWorkoutRunningDistanceM,
  computeWorkoutRunningTimeS,
  computeWorkoutStravaElevationM,
  computeWorkoutTotalMinutes,
  groupDistanceByActivityType,
  type HrZoneDatum,
} from "./stravaCalculations";

export type AnalysisDomain = "training" | "health";
export type AnalysisMode = "single" | "cycle" | "range" | "week";

// A one-off, never-persisted description of "what to compare" — the whole
// Analiza tab is built around resolving one of these into a summary, purely
// client-side over data the page already loaded.
export interface AnalysisSelection {
  domain: AnalysisDomain;
  mode: AnalysisMode;
  workoutId: string | null; // mode "single", domain "training"
  date: string; // mode "single" domain "health"; anchor date for mode "week"
  cycleId: string | null; // mode "cycle"
  rangeStart: string; // mode "range"
  rangeEnd: string; // mode "range"
}

export function defaultSelection(domain: AnalysisDomain = "training"): AnalysisSelection {
  return {
    domain,
    mode: "single",
    workoutId: null,
    date: todayISO(),
    cycleId: null,
    rangeStart: addDays(todayISO(), -6),
    rangeEnd: todayISO(),
  };
}

export function resolveSelectionRange(sel: AnalysisSelection, cycles: Cycle[]): [string, string] | null {
  if (sel.mode === "cycle") {
    const c = cycles.find((c) => c.id === sel.cycleId);
    return c ? [c.start, c.end] : null;
  }
  if (sel.mode === "range") {
    return sel.rangeStart && sel.rangeEnd ? [sel.rangeStart, sel.rangeEnd] : null;
  }
  if (sel.mode === "week") {
    const start = startOfWeek(sel.date || todayISO());
    return [start, addDays(start, 6)];
  }
  if (sel.mode === "single" && sel.domain === "health") {
    return sel.date ? [sel.date, sel.date] : null;
  }
  return null;
}

// The workouts a training selection resolves to — shared by
// summarizeSelection (for the totals) and the UI (to drill into any linked
// Strava activities). Returns null for a domain "health" selection or an
// unset selection.
export function resolveSelectionWorkouts(sel: AnalysisSelection, workouts: Workout[], cycles: Cycle[]): Workout[] | null {
  if (sel.domain !== "training") return null;
  if (sel.mode === "single") {
    const w = workouts.find((w) => w.id === sel.workoutId);
    return w ? [w] : null;
  }
  const range = resolveSelectionRange(sel, cycles);
  if (!range) return null;
  return workouts.filter((w) => w.date >= range[0] && w.date <= range[1]);
}

function selectionLabel(sel: AnalysisSelection, cycles: Cycle[], workouts: Workout[]): string {
  if (sel.mode === "single") {
    if (sel.domain === "training") {
      const w = workouts.find((w) => w.id === sel.workoutId);
      return w ? `${fmtDate(w.date)} — ${w.name || w.category}` : "—";
    }
    return sel.date ? fmtDate(sel.date) : "—";
  }
  if (sel.mode === "cycle") {
    const c = cycles.find((c) => c.id === sel.cycleId);
    return c ? c.name : "—";
  }
  const range = resolveSelectionRange(sel, cycles);
  return range ? `${fmtShort(range[0])} – ${fmtShort(range[1])}` : "—";
}

export interface TrainingSummary {
  kind: "training";
  label: string;
  workoutCount: number;
  totalTonnage: number;
  totalPlyoReps: number;
  totalIsometricTUT: number;
  totalFunctionalMinutes: number;
  totalAerobicMinutes: number;
  totalRunningKm: number;
  totalRunningMinutes: number;
  totalMinutes: number;
}

export interface HealthSummary {
  kind: "health";
  label: string;
  entryCount: number;
  avgSleepHours: number;
  avgSleepQuality: number;
  avgHrv: number;
  avgRestingHr: number;
  avgWeightKg: number;
  avgWellbeing: number;
}

export type AnalysisSummary = TrainingSummary | HealthSummary;

export function summarizeSelection(
  sel: AnalysisSelection,
  workouts: Workout[],
  healthEntries: HealthEntry[],
  cycles: Cycle[]
): AnalysisSummary | null {
  const label = selectionLabel(sel, cycles, workouts);

  if (sel.domain === "training") {
    const inRange = resolveSelectionWorkouts(sel, workouts, cycles);
    if (!inRange) return null;
    return {
      kind: "training",
      label,
      workoutCount: inRange.length,
      totalTonnage: inRange.reduce((s, w) => s + computeWorkoutTonnage(w), 0),
      totalPlyoReps: inRange.reduce((s, w) => s + computeWorkoutPlyoReps(w), 0),
      totalIsometricTUT: inRange.reduce((s, w) => s + computeWorkoutIsometricTUT(w), 0),
      totalFunctionalMinutes: inRange.reduce((s, w) => s + computeWorkoutFunctionalMinutes(w), 0),
      totalAerobicMinutes: inRange.reduce((s, w) => s + computeWorkoutAerobicMinutes(w), 0),
      totalRunningKm: inRange.reduce((s, w) => s + computeWorkoutRunningDistanceM(w), 0) / 1000,
      totalRunningMinutes: inRange.reduce((s, w) => s + computeWorkoutRunningTimeS(w), 0) / 60,
      totalMinutes: inRange.reduce((s, w) => s + computeWorkoutTotalMinutes(w), 0),
    };
  }

  const range = resolveSelectionRange(sel, cycles);
  if (!range) return null;
  const inRange = healthEntries.filter((h) => h.date >= range[0] && h.date <= range[1]);
  const avg = (fn: (h: HealthEntry) => number) => (inRange.length === 0 ? 0 : inRange.reduce((s, h) => s + fn(h), 0) / inRange.length);
  return {
    kind: "health",
    label,
    entryCount: inRange.length,
    avgSleepHours: avg((h) => h.sleepHours),
    avgSleepQuality: avg((h) => h.sleepQuality),
    avgHrv: avg((h) => h.hrv),
    avgRestingHr: avg((h) => h.restingHr),
    avgWeightKg: avg((h) => h.weightKg),
    avgWellbeing: avg((h) => h.wellbeing),
  };
}

export interface MetricRow {
  label: string;
  value: number;
  format: (v: number) => string;
}

export function trainingMetrics(s: TrainingSummary): MetricRow[] {
  return [
    { label: "Treningi", value: s.workoutCount, format: (v) => `${v}` },
    { label: "Łączny czas", value: s.totalMinutes, format: fmtMinutesLong },
    { label: "Km biegowe", value: s.totalRunningKm, format: (v) => `${v.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km` },
    { label: "Czas biegowy", value: s.totalRunningMinutes, format: fmtMinutesLong },
    { label: "Tonaż", value: s.totalTonnage, format: (v) => `${Math.round(v).toLocaleString("pl-PL")} kg` },
    { label: "Plyo", value: s.totalPlyoReps, format: (v) => `${Math.round(v)} powt.` },
    { label: "TUT izometria", value: s.totalIsometricTUT, format: fmtDurationShort },
    { label: "Funkcjonalne", value: s.totalFunctionalMinutes, format: (v) => `${Math.round(v)} min` },
    { label: "Aerobowe", value: s.totalAerobicMinutes, format: (v) => `${Math.round(v)} min` },
  ];
}

export function healthMetrics(s: HealthSummary): MetricRow[] {
  return [
    { label: "Wpisy", value: s.entryCount, format: (v) => `${v}` },
    { label: "Sen", value: s.avgSleepHours, format: fmtHoursMinutes },
    { label: "Ocena snu", value: s.avgSleepQuality, format: (v) => `${Math.round(v)}/100` },
    { label: "HRV", value: s.avgHrv, format: (v) => `${Math.round(v)} ms` },
    { label: "Tętno spocz.", value: s.avgRestingHr, format: (v) => `${Math.round(v)} bpm` },
    { label: "Masa", value: s.avgWeightKg, format: (v) => `${v.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} kg` },
    { label: "Samopoczucie", value: s.avgWellbeing, format: (v) => `${v.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}/10` },
  ];
}

export const TRAINING_METRIC_LABELS = trainingMetrics({
  kind: "training",
  label: "",
  workoutCount: 0,
  totalTonnage: 0,
  totalPlyoReps: 0,
  totalIsometricTUT: 0,
  totalFunctionalMinutes: 0,
  totalAerobicMinutes: 0,
  totalRunningKm: 0,
  totalRunningMinutes: 0,
  totalMinutes: 0,
}).map((r) => r.label);

export const HEALTH_METRIC_LABELS = healthMetrics({
  kind: "health",
  label: "",
  entryCount: 0,
  avgSleepHours: 0,
  avgSleepQuality: 0,
  avgHrv: 0,
  avgRestingHr: 0,
  avgWeightKg: 0,
  avgWellbeing: 0,
}).map((r) => r.label);

// ---------- Strava drill-down ----------
// When a training selection contains any Strava-imported activities, the
// Analiza tab expands full Strava-sourced stats for it (distance,
// elevation, heart rate, per-activity splits/zones) rather than just the
// generic training totals above.

export interface StravaSummary {
  distanceKm: number;
  elevationM: number;
  avgHeartrate: number | null;
  maxHeartrate: number | null;
  runningKm: number;
  runningMinutes: number;
  avgRunningPaceMps: number;
  kmByType: { type: string; label: string; km: number }[];
  hrZones: HrZoneDatum[];
  activities: StravaActivity[];
}

export function computeStravaSummary(workouts: Workout[]): StravaSummary | null {
  const activities = collectStravaActivities(workouts);
  if (activities.length === 0) return null;

  const distanceM = activities.reduce((s, a) => s + a.distanceM, 0);
  const elevationM = workouts.reduce((s, w) => s + computeWorkoutStravaElevationM(w), 0);
  const hrWeightedSum = activities.reduce((s, a) => s + (a.averageHeartrate ?? 0) * a.movingTimeS, 0);
  const hrWeightBase = activities.reduce((s, a) => s + (a.averageHeartrate ? a.movingTimeS : 0), 0);
  const maxHeartrate = activities.reduce((m, a) => (a.maxHeartrate && a.maxHeartrate > m ? a.maxHeartrate : m), 0);
  const runningKm = workouts.reduce((s, w) => s + computeWorkoutRunningDistanceM(w), 0) / 1000;
  const runningMinutes = workouts.reduce((s, w) => s + computeWorkoutRunningTimeS(w), 0) / 60;

  return {
    distanceKm: distanceM / 1000,
    elevationM,
    avgHeartrate: hrWeightBase > 0 ? hrWeightedSum / hrWeightBase : null,
    maxHeartrate: maxHeartrate > 0 ? maxHeartrate : null,
    runningKm,
    runningMinutes,
    avgRunningPaceMps: runningKm > 0 && runningMinutes > 0 ? (runningKm * 1000) / (runningMinutes * 60) : 0,
    kmByType: groupDistanceByActivityType(workouts),
    hrZones: aggregateHrZones(workouts),
    activities: [...activities].sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
  };
}

export function stravaMetrics(s: StravaSummary): MetricRow[] {
  return [
    { label: "Aktywności Strava", value: s.activities.length, format: (v) => `${v}` },
    { label: "Dystans (Strava)", value: s.distanceKm, format: (v) => `${v.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km` },
    { label: "Przewyższenie", value: s.elevationM, format: (v) => `${Math.round(v)} m` },
    { label: "Śr. tętno", value: s.avgHeartrate ?? 0, format: (v) => (v > 0 ? `${Math.round(v)} bpm` : "–") },
    { label: "Maks. tętno", value: s.maxHeartrate ?? 0, format: (v) => (v > 0 ? `${Math.round(v)} bpm` : "–") },
    { label: "Km biegowe (Strava)", value: s.runningKm, format: (v) => `${v.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km` },
    { label: "Czas biegowy (Strava)", value: s.runningMinutes, format: fmtMinutesLong },
    { label: "Śr. tempo (bieg)", value: s.avgRunningPaceMps, format: (v) => (v > 0 ? fmtPaceMinPerKm(v) : "–") },
  ];
}

export const STRAVA_METRIC_LABELS = stravaMetrics({
  distanceKm: 0,
  elevationM: 0,
  avgHeartrate: null,
  maxHeartrate: null,
  runningKm: 0,
  runningMinutes: 0,
  avgRunningPaceMps: 0,
  kmByType: [],
  hrZones: [],
  activities: [],
}).map((r) => r.label);
