"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { shouldShowExportReminder, snoozeExportReminder } from "@/lib/exportReminder";
import { CARD, FONT_MONO, INK, INK_SOFT, MUSTARD } from "@/lib/design";
import type { Category, Cycle, HealthEntry, PersonalEvent, PlanEntry, Race, Workout } from "@/lib/types";
import { ExportDataButton } from "./ExportDataButton";

// A non-blocking nudge, not a gate: shows once a month (per lib/exportReminder.ts)
// if there's anything worth backing up, and disappears for another month
// whether the user exports or just dismisses it.
export function ExportReminderBanner({
  userId,
  workouts,
  healthEntries,
  cycles,
  planEntries,
  races,
  personalEvents,
  categories,
}: {
  userId: string;
  workouts: Workout[];
  healthEntries: HealthEntry[];
  cycles: Cycle[];
  planEntries: PlanEntry[];
  races: Race[];
  personalEvents: PersonalEvent[];
  categories: Category[];
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (workouts.length > 0 && shouldShowExportReminder(userId)) setVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!visible) return null;

  return (
    <div className="mx-4 mt-3 p-3 rounded-md flex items-center justify-between gap-3" style={{ background: CARD, border: `1px solid ${MUSTARD}` }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>
        Dawno nie robiłeś kopii zapasowej danych — warto ją zrobić co jakiś czas.
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <ExportDataButton
          userId={userId}
          workouts={workouts}
          healthEntries={healthEntries}
          cycles={cycles}
          planEntries={planEntries}
          races={races}
          personalEvents={personalEvents}
          categories={categories}
          label="Eksportuj teraz"
          onExported={() => setVisible(false)}
        />
        <button
          onClick={() => {
            snoozeExportReminder(userId);
            setVisible(false);
          }}
          title="Przypomnij za miesiąc"
        >
          <X size={16} color={INK_SOFT} />
        </button>
      </div>
    </div>
  );
}
