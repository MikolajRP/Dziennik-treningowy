import type {
  Circuit,
  Cycle,
  LeafExercise,
  Period,
  Workout,
  WorkoutExercise,
} from "./types";

// ---------- id / date helpers ----------
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const fmtShort = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
};

export const startOfWeek = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};

export const num = (v: unknown) =>
  v === "" || v === null || v === undefined || isNaN(Number(v)) ? 0 : Number(v);

// ---------- Strava-oriented formatting helpers ----------
export function fmtDurationShort(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
export function fmtPaceMinPerKm(mps: number): string {
  if (!mps) return "–";
  const secPerKm = 1000 / mps;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}
export function fmtKm(meters: number, digits = 2): string {
  return (
    (meters / 1000).toLocaleString("pl-PL", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " km"
  );
}
export function fmtMinutesLong(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h > 0) return `${h} godz. ${m} min`;
  return `${m} min`;
}

export const emptyDraft = (categories: string[]): Workout => ({
  id: "",
  date: todayISO(),
  category: categories[0] || "Nogi",
  notes: "",
  exercises: [],
});

// ---------- pure "leaf" exercise factory + list helpers ----------
// A leaf exercise is one of: strength | plyo | isometric | functional | aerobic.
// These helpers work identically whether the list is the top-level
// draft.exercises array, or the .elements array nested inside a circuit.
export function makeLeafExercise(kind: LeafExercise["kind"]): LeafExercise {
  const base = { id: uid(), name: "" };
  if (kind === "strength")
    return { ...base, kind, unilateral: false, sets: [{ reps: "", weight: "", side: "L" }] };
  if (kind === "plyo")
    return { ...base, kind, unilateral: false, sets: [{ reps: "", side: "L" }] };
  if (kind === "isometric")
    return { ...base, kind, unilateral: false, sets: [{ seconds: "", weight: "", side: "L" }] };
  return { ...base, kind, minutes: "" }; // functional | aerobic
}
export function makeCircuit(): Circuit {
  return { id: uid(), kind: "circuit", name: "", rounds: "1", elements: [] };
}
export const addExerciseToList = (
  list: WorkoutExercise[],
  kind: LeafExercise["kind"] | "circuit"
): WorkoutExercise[] => [...list, kind === "circuit" ? makeCircuit() : makeLeafExercise(kind)];

export const updateExerciseInList = (
  list: WorkoutExercise[],
  id: string,
  patch: Partial<WorkoutExercise>
): WorkoutExercise[] =>
  list.map((ex) => (ex.id === id ? ({ ...ex, ...patch } as WorkoutExercise) : ex));

export const removeExerciseFromList = (list: WorkoutExercise[], id: string): WorkoutExercise[] =>
  list.filter((ex) => ex.id !== id);

export const blankSetFor = (kind: LeafExercise["kind"]) => {
  if (kind === "plyo") return { reps: "", side: "L" as const };
  if (kind === "isometric") return { seconds: "", weight: "", side: "L" as const };
  return { reps: "", weight: "", side: "L" as const };
};

// adding a set copies the previous set's values (like a real paper logbook —
// most sets repeat weight/reps)
export const addSetInList = (list: LeafExercise[], exId: string): LeafExercise[] =>
  list.map((ex) => {
    if (ex.id !== exId) return ex;
    if (ex.kind === "functional" || ex.kind === "aerobic") return ex;
    const sets = ex.sets as Array<{ side: "L" | "P" }>;
    const blank = blankSetFor(ex.kind);
    const last = sets[sets.length - 1] || blank;
    const nextSide = ex.unilateral ? (last.side === "L" ? "P" : "L") : last.side;
    return { ...ex, sets: [...sets, { ...last, side: nextSide }] } as LeafExercise;
  });

export const updateSetInList = (
  list: LeafExercise[],
  exId: string,
  idx: number,
  field: string,
  value: string
): LeafExercise[] =>
  list.map((ex) => {
    if (ex.id !== exId) return ex;
    if (ex.kind === "functional" || ex.kind === "aerobic") return ex;
    return {
      ...ex,
      sets: ex.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    } as LeafExercise;
  });

export const removeSetInList = (list: LeafExercise[], exId: string, idx: number): LeafExercise[] =>
  list.map((ex) => {
    if (ex.id !== exId) return ex;
    if (ex.kind === "functional" || ex.kind === "aerobic") return ex;
    return { ...ex, sets: ex.sets.filter((_, i) => i !== idx) } as LeafExercise;
  });

export const toggleUnilateralInList = (list: LeafExercise[], exId: string): LeafExercise[] =>
  list.map((ex) => {
    if (ex.id !== exId) return ex;
    if (ex.kind === "functional" || ex.kind === "aerobic") return ex;
    return { ...ex, unilateral: !ex.unilateral } as LeafExercise;
  });

export function cleanLeafExercise(ex: LeafExercise): LeafExercise {
  if (ex.kind === "strength")
    return { ...ex, sets: ex.sets.filter((s) => s.reps !== "" || s.weight !== "") };
  if (ex.kind === "plyo") return { ...ex, sets: ex.sets.filter((s) => s.reps !== "") };
  if (ex.kind === "isometric")
    return { ...ex, sets: ex.sets.filter((s) => s.seconds !== "" || s.weight !== "") };
  return ex;
}
export function isLeafExerciseValid(ex: LeafExercise): boolean {
  if (ex.kind === "strength" || ex.kind === "plyo" || ex.kind === "isometric")
    return ex.name.trim() !== "" && ex.sets.length > 0;
  return ex.name.trim() !== "";
}

// ---------- computation ----------
export const computeExerciseTonnage = (ex: LeafExercise) =>
  ex.kind === "strength" ? ex.sets.reduce((sum, s) => sum + num(s.reps) * num(s.weight), 0) : 0;
export const computePlyoReps = (ex: LeafExercise) =>
  ex.kind === "plyo" ? ex.sets.reduce((sum, s) => sum + num(s.reps), 0) : 0;
export const computeIsometricLoad = (ex: LeafExercise) =>
  ex.kind === "isometric" ? ex.sets.reduce((sum, s) => sum + num(s.weight) * num(s.seconds), 0) : 0;
export const computeFunctionalMinutes = (ex: LeafExercise) =>
  ex.kind === "functional" ? num(ex.minutes) : 0;
export const computeAerobicMinutes = (ex: LeafExercise) =>
  ex.kind === "aerobic" ? num(ex.minutes) : 0;

export const circuitMultiplier = (c: Circuit) => num(c.rounds) || 1;
export const circuitTonnage = (c: Circuit) =>
  circuitMultiplier(c) * c.elements.reduce((s, e) => s + computeExerciseTonnage(e), 0);
export const circuitPlyoReps = (c: Circuit) =>
  circuitMultiplier(c) * c.elements.reduce((s, e) => s + computePlyoReps(e), 0);
export const circuitIsometricLoad = (c: Circuit) =>
  circuitMultiplier(c) * c.elements.reduce((s, e) => s + computeIsometricLoad(e), 0);
export const circuitFunctionalMinutes = (c: Circuit) =>
  circuitMultiplier(c) * c.elements.reduce((s, e) => s + computeFunctionalMinutes(e), 0);
export const circuitAerobicMinutes = (c: Circuit) =>
  circuitMultiplier(c) * c.elements.reduce((s, e) => s + computeAerobicMinutes(e), 0);

function sumAcrossWorkout(
  w: Workout,
  leafFn: (ex: LeafExercise) => number,
  circuitFn: (c: Circuit) => number
) {
  return w.exercises.reduce(
    (sum, ex) => sum + (ex.kind === "circuit" ? circuitFn(ex) : leafFn(ex)),
    0
  );
}
export const computeWorkoutTonnage = (w: Workout) =>
  sumAcrossWorkout(w, computeExerciseTonnage, circuitTonnage);
export const computeWorkoutPlyoReps = (w: Workout) =>
  sumAcrossWorkout(w, computePlyoReps, circuitPlyoReps);
export const computeWorkoutIsometricLoad = (w: Workout) =>
  sumAcrossWorkout(w, computeIsometricLoad, circuitIsometricLoad);
export const computeWorkoutFunctionalMinutes = (w: Workout) =>
  sumAcrossWorkout(w, computeFunctionalMinutes, circuitFunctionalMinutes);
export const computeWorkoutAerobicMinutes = (w: Workout) =>
  sumAcrossWorkout(w, computeAerobicMinutes, circuitAerobicMinutes);

// Optional manual distance on functional/aerobic entries — lets cardio
// logged without Strava (e.g. treadmill, no watch) still count in km stats.
const computeExerciseDistanceKm = (ex: LeafExercise) =>
  ex.kind === "functional" || ex.kind === "aerobic" ? num(ex.distanceKm) : 0;
const circuitDistanceKm = (c: Circuit) =>
  circuitMultiplier(c) * c.elements.reduce((s, e) => s + computeExerciseDistanceKm(e), 0);
export const computeWorkoutManualDistanceKm = (w: Workout) =>
  sumAcrossWorkout(w, computeExerciseDistanceKm, circuitDistanceKm);

// side (L/P) breakdown for unilateral strength, plyo, or isometric exercises
export const computeSideBreakdown = (ex: LeafExercise) => {
  if (ex.kind === "functional" || ex.kind === "aerobic" || !ex.unilateral) return null;
  const val = (s: { reps?: string; weight?: string; seconds?: string }) => {
    if (ex.kind === "plyo") return num(s.reps);
    if (ex.kind === "isometric") return num(s.weight) * num(s.seconds);
    return num(s.reps) * num(s.weight);
  };
  const totals = { L: 0, P: 0 };
  ex.sets.forEach((s) => (totals[s.side === "P" ? "P" : "L"] += val(s)));
  return totals;
};

export function groupByCategory(workouts: Workout[], valueFn: (w: Workout) => number) {
  const map: Record<string, number> = {};
  workouts.forEach((w) => {
    const v = valueFn(w);
    if (v > 0) map[w.category] = (map[w.category] || 0) + v;
  });
  return Object.entries(map)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);
}

export function computePRIds(workouts: Workout[]) {
  const best: Record<string, { id: string; tonnage: number }> = {};
  workouts.forEach((w) => {
    const t = computeWorkoutTonnage(w);
    if (t <= 0) return;
    if (!best[w.category] || t > best[w.category].tonnage) best[w.category] = { id: w.id, tonnage: t };
  });
  return new Set(Object.values(best).map((b) => b.id));
}

// unique exercise names seen so far (top-level and inside circuits), for
// name-input suggestions
export function collectKnownExerciseNames(workouts: Workout[]) {
  const names = new Set<string>();
  workouts.forEach((w) => {
    w.exercises.forEach((ex) => {
      if (ex.kind === "circuit") ex.elements.forEach((el) => el.name && names.add(el.name.trim()));
      else if (ex.name) names.add(ex.name.trim());
    });
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, "pl"));
}

export function getRange(
  period: Period,
  cycles: Cycle[],
  selectedCycleId: string | null,
  customStart: string,
  customEnd: string
): [string, string] {
  const today = todayISO();
  if (period === "week") return [addDays(today, -6), today];
  if (period === "month") return [addDays(today, -29), today];
  if (period === "cycle") {
    const c = cycles.find((c) => c.id === selectedCycleId);
    return c ? [c.start, c.end] : ["0000-01-01", "9999-12-31"];
  }
  if (period === "custom") return [customStart || today, customEnd || today];
  return ["0000-01-01", "9999-12-31"];
}

// ---------- readable summary line for history view (works for leaf or
// nested-in-circuit exercises) ----------
export function exerciseSummaryText(ex: LeafExercise): { text: string; color: string } {
  if (ex.kind === "strength") {
    const sets = ex.sets
      .map((s) => `${s.reps}×${s.weight}kg${ex.unilateral ? ` (${s.side})` : ""}`)
      .join(", ");
    return { text: `${sets}  = ${Math.round(computeExerciseTonnage(ex))} kg`, color: "ink-soft" };
  }
  if (ex.kind === "plyo") {
    const sets = ex.sets.map((s) => `${s.reps}p${ex.unilateral ? ` (${s.side})` : ""}`).join(", ");
    return { text: `${sets}  = ${computePlyoReps(ex)} powt.`, color: "plyo" };
  }
  if (ex.kind === "isometric") {
    const sets = ex.sets
      .map((s) => `${s.seconds}s×${s.weight}kg${ex.unilateral ? ` (${s.side})` : ""}`)
      .join(", ");
    return { text: `${sets}  = ${Math.round(computeIsometricLoad(ex))} kg·s`, color: "iso" };
  }
  if (ex.kind === "functional") return { text: `${ex.minutes} min`, color: "teal" };
  if (ex.kind === "aerobic") return { text: `${ex.minutes} min`, color: "aero" };
  return { text: "", color: "ink-soft" };
}
