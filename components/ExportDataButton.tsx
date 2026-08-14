"use client";

import { Download } from "lucide-react";
import { buildExportPayload, downloadExport } from "@/lib/exportData";
import { INK_SOFT } from "@/lib/design";
import type { Category, Cycle, HealthEntry, PersonalEvent, PlanEntry, Race, Workout } from "@/lib/types";

// A personal backup independent of Supabase — downloads everything the
// account owns as one JSON file. Deliberately a plain client-side
// download (Blob + object URL): no new API route, no server round-trip,
// just the data the page already has loaded.
export function ExportDataButton({
  workouts,
  healthEntries,
  cycles,
  planEntries,
  races,
  personalEvents,
  categories,
}: {
  workouts: Workout[];
  healthEntries: HealthEntry[];
  cycles: Cycle[];
  planEntries: PlanEntry[];
  races: Race[];
  personalEvents: PersonalEvent[];
  categories: Category[];
}) {
  function handleExport() {
    const payload = buildExportPayload({ workouts, healthEntries, cycles, planEntries, races, personalEvents, categories });
    downloadExport(payload);
  }

  return (
    <button onClick={handleExport} title="Eksportuj wszystkie dane do pliku JSON" className="p-1">
      <Download size={18} color={INK_SOFT} />
    </button>
  );
}
