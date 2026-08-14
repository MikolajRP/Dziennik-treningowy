"use client";

import { Download } from "lucide-react";
import { buildExportPayload, downloadExport } from "@/lib/exportData";
import { snoozeExportReminder } from "@/lib/exportReminder";
import { FONT_MONO, INK, INK_SOFT } from "@/lib/design";
import type { Category, Cycle, HealthEntry, PersonalEvent, PlanEntry, Race, Workout } from "@/lib/types";

// A personal backup independent of Supabase — downloads everything the
// account owns as one JSON file. Deliberately a plain client-side
// download (Blob + object URL): no new API route, no server round-trip,
// just the data the page already has loaded.
export function ExportDataButton({
  userId,
  workouts,
  healthEntries,
  cycles,
  planEntries,
  races,
  personalEvents,
  categories,
  onExported,
  label,
}: {
  userId: string;
  workouts: Workout[];
  healthEntries: HealthEntry[];
  cycles: Cycle[];
  planEntries: PlanEntry[];
  races: Race[];
  personalEvents: PersonalEvent[];
  categories: Category[];
  onExported?: () => void;
  label?: string;
}) {
  function handleExport() {
    const payload = buildExportPayload({ workouts, healthEntries, cycles, planEntries, races, personalEvents, categories });
    downloadExport(payload);
    snoozeExportReminder(userId);
    onExported?.();
  }

  if (label) {
    return (
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm shrink-0"
        style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}
      >
        <Download size={14} /> {label}
      </button>
    );
  }

  return (
    <button onClick={handleExport} title="Eksportuj wszystkie dane do pliku JSON" className="p-1">
      <Download size={18} color={INK_SOFT} />
    </button>
  );
}
