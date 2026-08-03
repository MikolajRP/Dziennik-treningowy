"use client";

import { useMemo } from "react";
import {
  addDays,
  collectKnownExerciseNames,
  computePRIds,
  computeWorkoutAerobicMinutes,
  computeWorkoutFunctionalMinutes,
  computeWorkoutIsometricTUT,
  computeWorkoutPlyoReps,
  computeWorkoutTonnage,
  fmtShort,
  getRange,
  groupByCategory,
  startOfWeek,
  todayISO,
} from "./calculations";
import {
  aggregateHrZones,
  computeLast12WeeksRunning,
  computeThisWeekRunning,
  computeWorkoutRunningDistanceM,
  computeWorkoutRunningTimeS,
  computeWorkoutTotalMinutes,
  groupDistanceByActivityType,
  groupTimeByActivityType,
} from "./stravaCalculations";
import { computeTonnageByMuscleGroup } from "./muscleGroups";
import type { Cycle, Period, Workout } from "./types";

// Every derived report number, shared between the athlete's own Journal and
// a coach's read-only view of an athlete — both start from the same raw
// `workouts` list and the same period filter, so this is the one place
// that math lives.
export function useReportsData(
  workouts: Workout[],
  cycles: Cycle[],
  period: Period,
  selectedCycleId: string | null,
  customStart: string,
  customEnd: string
) {
  const prIds = useMemo(() => computePRIds(workouts), [workouts]);
  const knownExerciseNames = useMemo(() => collectKnownExerciseNames(workouts), [workouts]);
  const sortedWorkouts = useMemo(() => [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)), [workouts]);

  const [rangeStart, rangeEnd] = useMemo(
    () => getRange(period, cycles, selectedCycleId, customStart, customEnd),
    [period, cycles, selectedCycleId, customStart, customEnd]
  );
  const filtered = useMemo(() => workouts.filter((w) => w.date >= rangeStart && w.date <= rangeEnd), [workouts, rangeStart, rangeEnd]);

  const tonnageByCat = useMemo(() => groupByCategory(filtered, computeWorkoutTonnage), [filtered]);
  const plyoByCat = useMemo(() => groupByCategory(filtered, computeWorkoutPlyoReps), [filtered]);
  const isometricByCat = useMemo(() => groupByCategory(filtered, computeWorkoutIsometricTUT), [filtered]);
  const functionalByCat = useMemo(() => groupByCategory(filtered, computeWorkoutFunctionalMinutes), [filtered]);
  const aerobicByCat = useMemo(() => groupByCategory(filtered, computeWorkoutAerobicMinutes), [filtered]);

  const totalTonnage = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutTonnage(w), 0), [filtered]);
  const totalPlyoReps = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutPlyoReps(w), 0), [filtered]);
  const totalIsometricTUT = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutIsometricTUT(w), 0), [filtered]);
  const totalFunctionalMinutes = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutFunctionalMinutes(w), 0), [filtered]);
  const totalAerobicMinutes = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutAerobicMinutes(w), 0), [filtered]);

  const weeklySeries = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((w) => {
      const key = startOfWeek(w.date);
      map[key] = (map[key] || 0) + computeWorkoutTonnage(w);
    });
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([week, tonnage]) => ({ week: fmtShort(week), tonnage: Math.round(tonnage) }));
  }, [filtered]);

  const thisWeekTonnage = useMemo(() => {
    const start = addDays(todayISO(), -6);
    return workouts.filter((w) => w.date >= start).reduce((s, w) => s + computeWorkoutTonnage(w), 0);
  }, [workouts]);

  const totalRunningKm = useMemo(
    () => filtered.reduce((s, w) => s + computeWorkoutRunningDistanceM(w), 0) / 1000,
    [filtered]
  );
  const totalRunningMinutes = useMemo(
    () => filtered.reduce((s, w) => s + computeWorkoutRunningTimeS(w), 0) / 60,
    [filtered]
  );
  const weeklyRunningKmSeries = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((w) => {
      const km = computeWorkoutRunningDistanceM(w) / 1000;
      if (km <= 0) return;
      const key = startOfWeek(w.date);
      map[key] = (map[key] || 0) + km;
    });
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([week, km]) => ({ week: fmtShort(week), km: Math.round(km * 10) / 10 }));
  }, [filtered]);
  const kmByActivityType = useMemo(() => groupDistanceByActivityType(filtered), [filtered]);
  const timeByActivityType = useMemo(() => groupTimeByActivityType(filtered), [filtered]);
  const hrZones = useMemo(() => aggregateHrZones(filtered), [filtered]);
  const totalOverallMinutes = useMemo(
    () => filtered.reduce((s, w) => s + computeWorkoutTotalMinutes(w), 0),
    [filtered]
  );
  const tonnageByMuscleGroup = useMemo(() => computeTonnageByMuscleGroup(filtered), [filtered]);

  // Independent of the period filter — always "this calendar week" and
  // "the trailing 12 weeks", matching Strava's own progress widget.
  const thisWeekRunning = useMemo(() => computeThisWeekRunning(workouts), [workouts]);
  const last12WeeksRunning = useMemo(() => computeLast12WeeksRunning(workouts), [workouts]);

  return {
    prIds,
    knownExerciseNames,
    sortedWorkouts,
    rangeStart,
    rangeEnd,
    filtered,
    tonnageByCat,
    plyoByCat,
    isometricByCat,
    functionalByCat,
    aerobicByCat,
    totalTonnage,
    totalPlyoReps,
    totalIsometricTUT,
    totalFunctionalMinutes,
    totalAerobicMinutes,
    weeklySeries,
    thisWeekTonnage,
    totalRunningKm,
    totalRunningMinutes,
    weeklyRunningKmSeries,
    kmByActivityType,
    timeByActivityType,
    hrZones,
    totalOverallMinutes,
    tonnageByMuscleGroup,
    thisWeekRunning,
    last12WeeksRunning,
  };
}
