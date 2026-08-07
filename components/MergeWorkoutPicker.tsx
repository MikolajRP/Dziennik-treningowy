"use client";

import { X } from "lucide-react";
import { fmtDate } from "@/lib/calculations";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE } from "@/lib/design";
import type { Workout } from "@/lib/types";
import { IconBtn } from "./atoms";

export function MergeWorkoutPicker({
  sourceWorkout,
  candidates,
  onPick,
  onCancel,
}: {
  sourceWorkout: Workout;
  candidates: Workout[];
  onPick: (targetWorkoutId: string) => void;
  onCancel: () => void;
}) {
  const sourceTime = new Date(sourceWorkout.date + "T00:00:00").getTime();
  const sorted = [...candidates].sort((a, b) => {
    const da = Math.abs(new Date(a.date + "T00:00:00").getTime() - sourceTime);
    const db = Math.abs(new Date(b.date + "T00:00:00").getTime() - sourceTime);
    return da - db;
  });

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(27,42,58,0.45)" }}>
      <div className="w-full max-w-sm max-h-[80vh] flex flex-col rounded-md" style={{ background: CARD, border: `1px solid ${INK}` }}>
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: LINE }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600 }}>
            Połącz z treningiem
          </div>
          <IconBtn onClick={onCancel} title="Zamknij">
            <X size={16} />
          </IconBtn>
        </div>

        <div className="overflow-y-auto p-2 space-y-1.5">
          {sorted.length === 0 && (
            <div className="text-center py-6 text-xs" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
              Brak innych treningów do połączenia.
            </div>
          )}
          {sorted.map((w) => (
            <button
              key={w.id}
              onClick={() => onPick(w.id)}
              className="w-full text-left p-2.5 rounded-md"
              style={{ background: "#fff", border: `1px solid ${LINE}` }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>{fmtDate(w.date)}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {w.category && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px]"
                    style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}
                  >
                    {w.category}
                  </span>
                )}
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>
                  {w.exercises.length > 0 ? `${w.exercises.length} ćwiczeń` : ""}
                  {w.stravaActivities && w.stravaActivities.length > 0
                    ? ` ${w.exercises.length > 0 ? "· " : ""}${w.stravaActivities.length} akt. Strava`
                    : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
