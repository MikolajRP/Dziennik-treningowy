import type { Category, Cycle, HealthEntry, PersonalEvent, PlanEntry, Race, Workout } from "./types";
import { todayISO } from "./calculations";

// A full, human-readable snapshot of everything the athlete's account
// owns — meant as a personal backup independent of Supabase, not as an
// API contract. `version` exists so a future importer can tell old
// exports apart if the shape ever changes.
export interface ExportPayload {
  app: "Dziennik Treningowy";
  version: 1;
  exportedAt: string;
  workouts: Workout[];
  healthEntries: HealthEntry[];
  cycles: Cycle[];
  planEntries: PlanEntry[];
  races: Race[];
  personalEvents: PersonalEvent[];
  categories: Category[];
}

export function buildExportPayload(data: {
  workouts: Workout[];
  healthEntries: HealthEntry[];
  cycles: Cycle[];
  planEntries: PlanEntry[];
  races: Race[];
  personalEvents: PersonalEvent[];
  categories: Category[];
}): ExportPayload {
  return {
    app: "Dziennik Treningowy",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
}

export function downloadExport(payload: ExportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dziennik-treningowy-eksport-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
