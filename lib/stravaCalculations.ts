import type { StravaActivity, Workout } from "./types";
import { computeWorkoutAerobicMinutes, computeWorkoutFunctionalMinutes } from "./calculations";

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
