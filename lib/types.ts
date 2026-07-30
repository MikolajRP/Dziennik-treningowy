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
}
export interface AerobicExercise {
  id: string;
  kind: "aerobic";
  name: string;
  minutes: string;
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
