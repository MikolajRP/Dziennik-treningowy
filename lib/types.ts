export type Side = "L" | "P";

export type LeafKind = "strength" | "plyo" | "isometric" | "functional" | "aerobic";

export interface StrengthSet {
  reps: string;
  weight: string;
  side: Side;
}
export interface PlyoSet {
  reps: string;
  side: Side;
}
export interface IsometricSet {
  seconds: string;
  weight: string;
  side: Side;
}

export interface StrengthExercise {
  id: string;
  kind: "strength";
  name: string;
  unilateral: boolean;
  sets: StrengthSet[];
}
export interface PlyoExercise {
  id: string;
  kind: "plyo";
  name: string;
  unilateral: boolean;
  sets: PlyoSet[];
}
export interface IsometricExercise {
  id: string;
  kind: "isometric";
  name: string;
  unilateral: boolean;
  sets: IsometricSet[];
}
export interface FunctionalExercise {
  id: string;
  kind: "functional";
  name: string;
  minutes: string;
  distanceKm?: string;
}
export interface AerobicExercise {
  id: string;
  kind: "aerobic";
  name: string;
  minutes: string;
  distanceKm?: string;
}

export type LeafExercise =
  | StrengthExercise
  | PlyoExercise
  | IsometricExercise
  | FunctionalExercise
  | AerobicExercise;

export interface Circuit {
  id: string;
  kind: "circuit";
  name: string;
  rounds: string;
  elements: LeafExercise[];
}

export type WorkoutExercise = LeafExercise | Circuit;

export interface Workout {
  id: string;
  date: string; // ISO yyyy-mm-dd
  category: string;
  notes: string;
  exercises: WorkoutExercise[];
  durationMinutes?: number;
  stravaActivities?: StravaActivity[];
}

// A single per-km (or per-mile, but we always request metric) split, as
// returned by Strava's detailed activity endpoint.
export interface StravaSplit {
  split: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_difference?: number;
  average_heartrate?: number;
  average_speed?: number;
}

// One bucket of Strava's heart-rate zone distribution for an activity —
// "time" is seconds spent with bpm between min and max.
export interface StravaHrZoneBucket {
  min: number;
  max: number;
  time: number;
}

export interface StravaActivity {
  id: string; // our strava_activities row id
  stravaActivityId: number;
  name: string;
  type: string; // Strava's activity type: "Run", "Ride", "Swim", ...
  startDate: string; // ISO datetime
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  elevationGainM: number;
  averageSpeedMps: number;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  splitsMetric: StravaSplit[] | null;
  hrZones: StravaHrZoneBucket[] | null;
  polyline: string | null;
}

export type CycleType = "mezocykl" | "makrocykl";

export interface Cycle {
  id: string;
  name: string;
  type: CycleType;
  start: string;
  end: string;
}

export type Period = "week" | "month" | "all" | "cycle" | "custom";
