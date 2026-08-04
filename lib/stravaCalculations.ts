import type { StravaActivity, Workout } from "./types";
import {
  addDays,
  computeWorkoutAerobicMinutes,
  computeWorkoutFunctionalMinutes,
  computeWorkoutManualDistanceKm,
  startOfWeek,
  todayISO,
} from "./calculations";

const MANUAL_LABEL = "Ręczne (bez GPS)";

export const TYPE_LABEL_PL: Record<string, string> = {
  Run: "Bieganie",
  TrailRun: "Bieganie (trail)",
  Ride: "Kolarstwo",
  VirtualRide: "Kolarstwo (wirtualne)",
  Swim: "Pływanie",
  Walk: "Marsz",
  Hike: "Wędrówka",
  WeightTraining: "Trening siłowy",
  Workout: "Trening",
};
export const stravaTypeLabel = (type: string) => TYPE_LABEL_PL[type] ?? type;

export const computeWorkoutStravaDistanceM = (w: Workout) =>
  (w.stravaActivities ?? []).reduce((s, a) => s + a.distanceM, 0);
export const computeWorkoutStravaMovingTimeS = (w: Workout) =>
  (w.stravaActivities ?? []).reduce((s, a) => s + a.movingTimeS, 0);
export const computeWorkoutStravaElevationM = (w: Workout) =>
  (w.stravaActivities ?? []).reduce((s, a) => s + a.elevationGainM, 0);

const RUNNING_TYPES = new Set(["Run", "TrailRun"]);
export const isRunningActivityType = (type: string) => RUNNING_TYPES.has(type);

const CYCLING_TYPES = new Set(["Ride", "VirtualRide", "EBikeRide", "Velomobile", "Handcycle"]);
export const isCyclingActivityType = (type: string) => CYCLING_TYPES.has(type);
export const computeWorkoutRunningDistanceM = (w: Workout) =>
  (w.stravaActivities ?? []).filter((a) => isRunningActivityType(a.type)).reduce((s, a) => s + a.distanceM, 0);
export const computeWorkoutRunningTimeS = (w: Workout) =>
  (w.stravaActivities ?? []).filter((a) => isRunningActivityType(a.type)).reduce((s, a) => s + a.movingTimeS, 0);
export const computeWorkoutRunningElevationM = (w: Workout) =>
  (w.stravaActivities ?? []).filter((a) => isRunningActivityType(a.type)).reduce((s, a) => s + a.elevationGainM, 0);

// Overall average pace (m/s) across every linked Strava activity, weighted
// by distance rather than averaging each activity's own average speed.
export const computeWorkoutStravaAvgSpeedMps = (w: Workout) => {
  const distance = computeWorkoutStravaDistanceM(w);
  const time = computeWorkoutStravaMovingTimeS(w);
  return time > 0 ? distance / time : 0;
};

// Every minute this workout represents, from every source: manual duration
// (mainly for strength days), manual functional/aerobic minutes, and Strava
// moving time. This is the "ogólny czas treningu" building block.
export const computeWorkoutTotalMinutes = (w: Workout) =>
  (w.durationMinutes ?? 0) +
  computeWorkoutFunctionalMinutes(w) +
  computeWorkoutAerobicMinutes(w) +
  computeWorkoutStravaMovingTimeS(w) / 60;

interface TypeDatum {
  type: string;
  label: string;
  km: number;
}
// Running is always first (it's the priority sport), everything else
// sorted by distance. Distances come straight from linked Strava
// activities — independent of whatever `category` a workout ends up under,
// so merges/attaches don't distort the breakdown.
export function groupDistanceByActivityType(workouts: Workout[]): TypeDatum[] {
  const meters: Record<string, number> = {};
  workouts.forEach((w) => {
    (w.stravaActivities ?? []).forEach((a) => {
      meters[a.type] = (meters[a.type] ?? 0) + a.distanceM;
    });
  });
  const entries = Object.entries(meters).map(([type, m]) => ({
    type,
    label: stravaTypeLabel(type),
    km: m / 1000,
  }));
  const manualKm = workouts.reduce((s, w) => s + computeWorkoutManualDistanceKm(w), 0);
  if (manualKm > 0) entries.push({ type: "manual", label: MANUAL_LABEL, km: manualKm });
  entries.sort((a, b) => (a.type === "Run" ? -1 : b.type === "Run" ? 1 : b.km - a.km));
  return entries;
}

interface TimeDatum {
  type: string;
  label: string;
  minutes: number;
}
export function groupTimeByActivityType(workouts: Workout[]): TimeDatum[] {
  const seconds: Record<string, number> = {};
  workouts.forEach((w) => {
    (w.stravaActivities ?? []).forEach((a) => {
      seconds[a.type] = (seconds[a.type] ?? 0) + a.movingTimeS;
    });
  });
  const entries = Object.entries(seconds).map(([type, s]) => ({
    type,
    label: stravaTypeLabel(type),
    minutes: s / 60,
  }));
  const manualMinutes = workouts.reduce(
    (s, w) => s + computeWorkoutFunctionalMinutes(w) + computeWorkoutAerobicMinutes(w),
    0
  );
  if (manualMinutes > 0) entries.push({ type: "manual", label: MANUAL_LABEL, minutes: manualMinutes });
  entries.sort((a, b) => (a.type === "Run" ? -1 : b.type === "Run" ? 1 : b.minutes - a.minutes));
  return entries;
}

export interface HrZoneDatum {
  zone: number;
  min: number;
  max: number;
  seconds: number;
  pct: number;
}
// Buckets are matched by index (Zone 1, Zone 2, ...) since that's stable
// even if the athlete's exact bpm thresholds shift over time on Strava.
// Each zone is labeled with the most recent activity's bpm range for it.
export function aggregateHrZones(workouts: Workout[]): HrZoneDatum[] {
  const totals: { min: number; max: number; seconds: number }[] = [];
  workouts.forEach((w) => {
    (w.stravaActivities ?? []).forEach((a) => {
      (a.hrZones ?? []).forEach((bucket, i) => {
        if (!totals[i]) totals[i] = { min: bucket.min, max: bucket.max, seconds: 0 };
        totals[i].min = bucket.min;
        totals[i].max = bucket.max;
        totals[i].seconds += bucket.time;
      });
    });
  });
  const grandTotal = totals.reduce((s, z) => s + z.seconds, 0);
  if (grandTotal === 0) return [];
  return totals.map((z, i) => ({
    zone: i + 1,
    min: z.min,
    max: z.max,
    seconds: z.seconds,
    pct: (z.seconds / grandTotal) * 100,
  }));
}

export function collectStravaActivities(workouts: Workout[]): StravaActivity[] {
  return workouts.flatMap((w) => w.stravaActivities ?? []);
}

// ---------- Strava-style "this week" / "last 12 weeks" running widget ----------
// Deliberately independent of the report's period filter — like Strava's
// own progress view, this always means "the current calendar week" and
// "the trailing 12 weeks", regardless of what period is selected elsewhere.

export interface ThisWeekRunning {
  km: number;
  minutes: number;
  elevationM: number;
  // Total training time this calendar week across every activity, not
  // just running — used by the Dziennik tab's "ten tydzień" card.
  totalMinutes: number;
}
export function computeThisWeekRunning(allWorkouts: Workout[]): ThisWeekRunning {
  const today = todayISO();
  const start = startOfWeek(today);
  const inWeek = allWorkouts.filter((w) => w.date >= start && w.date <= today);
  return {
    km: inWeek.reduce((s, w) => s + computeWorkoutRunningDistanceM(w), 0) / 1000,
    minutes: inWeek.reduce((s, w) => s + computeWorkoutRunningTimeS(w), 0) / 60,
    elevationM: inWeek.reduce((s, w) => s + computeWorkoutRunningElevationM(w), 0),
    totalMinutes: inWeek.reduce((s, w) => s + computeWorkoutTotalMinutes(w), 0),
  };
}

const MONTH_ABBR_PL = ["STY", "LUT", "MAR", "KWI", "MAJ", "CZE", "LIP", "SIE", "WRZ", "PAŹ", "LIS", "GRU"];

export interface WeeklyRunningDatum {
  weekStart: string;
  weekEnd: string;
  km: number;
  tickLabel: string;
}
export function computeLast12WeeksRunning(allWorkouts: Workout[]): WeeklyRunningDatum[] {
  const currentWeekStart = startOfWeek(todayISO());
  let lastMonth = -1;
  const weeks: WeeklyRunningDatum[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -7 * i);
    const weekEnd = addDays(weekStart, 6);
    const km =
      allWorkouts
        .filter((w) => w.date >= weekStart && w.date <= weekEnd)
        .reduce((s, w) => s + computeWorkoutRunningDistanceM(w), 0) / 1000;
    const month = new Date(weekStart + "T00:00:00").getMonth();
    const tickLabel = month !== lastMonth ? MONTH_ABBR_PL[month] : "";
    lastMonth = month;
    weeks.push({ weekStart, weekEnd, km: Math.round(km * 10) / 10, tickLabel });
  }
  return weeks;
}
