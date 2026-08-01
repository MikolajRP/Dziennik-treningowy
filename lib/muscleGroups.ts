import { computeExerciseTonnage } from "./calculations";
import type { LeafExercise, Workout } from "./types";

// Best-effort inference of which body part a strength exercise trains,
// from its free-text name — there's no dedicated field for this, so it's a
// keyword match against common Polish (and a few English/gym-slang) names.
// Order matters: more specific keywords are checked first to avoid an
// exercise matching the wrong group (e.g. "wyciskanie nad głową" should hit
// Barki, not Klatka, even though it also contains "wyciskanie").
const MUSCLE_GROUP_KEYWORDS: [string, string[]][] = [
  [
    "Barki",
    [
      "nad głow",
      "ohp",
      "arnold",
      "bark",
      "unoszenie hantli bokiem",
      "unoszenie w opadzie",
      "unoszenie w bok",
      "przyciąganie linki do brody",
      "military press",
      "shoulder press",
    ],
  ],
  [
    "Klatka piersiowa",
    ["wyciskanie", "rozpiętk", "rozpiętek", "pompk", "dip", "bench", "fly", "przenoszenie hantli", "klatk"],
  ],
  [
    "Plecy",
    [
      "martwy ciąg",
      "wiosłow",
      "podciąg",
      "ściąganie drążka",
      "ściąganie linki",
      "łata",
      "wyciąg",
      "pull-up",
      "pulldown",
      "row",
      "plecy",
    ],
  ],
  [
    "Ręce",
    ["biceps", "triceps", "uginanie ramion", "prostowanie ramion", "modlitewnik", "francusk", "curl", "ramion"],
  ],
  [
    "Pośladki",
    ["pośladk", "hip thrust", "glute", "odwodzenie bioder", "przywodzenie bioder"],
  ],
  [
    "Brzuch",
    ["brzusz", "plank", "deska", "core", "skręty tułowia", "russian twist", "unoszenie nóg w zwisie", "crunch"],
  ],
  [
    "Nogi",
    [
      "przysiad",
      "wykrok",
      "uda",
      "czworogłow",
      "dwugłow uda",
      "łydk",
      "prostowanie nóg",
      "uginanie nóg",
      "wyprost bioder",
      "rumuński",
      "spięci",
      "leg press",
      "leg curl",
      "leg extension",
      "squat",
      "lunge",
      "nog",
    ],
  ],
];

export function inferMuscleGroup(exerciseName: string): string {
  const n = exerciseName.toLowerCase();
  for (const [group, keywords] of MUSCLE_GROUP_KEYWORDS) {
    if (keywords.some((k) => n.includes(k))) return group;
  }
  return "Inne / nieznane";
}

function flattenStrengthExercises(w: Workout): LeafExercise[] {
  const out: LeafExercise[] = [];
  w.exercises.forEach((ex) => {
    if (ex.kind === "circuit") ex.elements.forEach((el) => el.kind === "strength" && out.push(el));
    else if (ex.kind === "strength") out.push(ex);
  });
  return out;
}

export interface MuscleGroupDatum {
  group: string;
  kg: number;
}

// Tonnage per body part, inferred from exercise names — independent of
// whatever `category` the workout itself is filed under, so it works even
// for "Full Body" days or ad-hoc naming.
export function computeTonnageByMuscleGroup(workouts: Workout[]): MuscleGroupDatum[] {
  const totals: Record<string, number> = {};
  workouts.forEach((w) => {
    flattenStrengthExercises(w).forEach((ex) => {
      if (!ex.name.trim()) return;
      const group = inferMuscleGroup(ex.name);
      totals[group] = (totals[group] ?? 0) + computeExerciseTonnage(ex);
    });
  });
  return Object.entries(totals)
    .filter(([, kg]) => kg > 0)
    .map(([group, kg]) => ({ group, kg }))
    .sort((a, b) => (a.group === "Inne / nieznane" ? 1 : b.group === "Inne / nieznane" ? -1 : b.kg - a.kg));
}
