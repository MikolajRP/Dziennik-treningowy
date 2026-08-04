"use client";

import { ChevronDown, ChevronUp, Copy, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  computeWorkoutAerobicMinutes,
  computeWorkoutFunctionalMinutes,
  computeWorkoutIsometricTUT,
  computeWorkoutPlyoReps,
  computeWorkoutTonnage,
  fmtDate,
  fmtDurationShort,
  fmtMinutesLong,
} from "@/lib/calculations";
import {
  computeWorkoutStravaAvgSpeedMps,
  computeWorkoutStravaDistanceM,
  computeWorkoutStravaMovingTimeS,
  isCyclingActivityType,
} from "@/lib/stravaCalculations";
import { AERO, CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, ISO, LINE, PLYO, RUST, TEAL } from "@/lib/design";
import type { LeafKind, Workout, WorkoutExercise } from "@/lib/types";
import { IconBtn } from "./atoms";
import { WorkoutForm } from "./WorkoutForm";
import type { CircuitElementHandlers } from "./CircuitEditor";
import { WorkoutExerciseSummary } from "./WorkoutExerciseSummary";
import { StravaCollapsedSummary, StravaSingleActivity } from "./StravaActivityCard";
import { MergeWorkoutPicker } from "./MergeWorkoutPicker";

export function LogTab({
  showForm,
  startNew,
  draft,
  setDraft,
  categories,
  newCategory,
  setNewCategory,
  addCategory,
  addExercise,
  updateExercise,
  removeExercise,
  addSet,
  updateSet,
  removeSet,
  toggleUnilateral,
  circuitElementHandlers,
  saveWorkout,
  cancelForm,
  editingId,
  sortedWorkouts,
  expandedId,
  setExpandedId,
  startEdit,
  startDuplicate,
  confirmDeleteId,
  setConfirmDeleteId,
  deleteWorkout,
  prIds,
  thisWeekKm,
  thisWeekTotalMinutes,
  formError,
  saveStatus,
  knownExerciseNames,
  mergeSourceId,
  setMergeSourceId,
  onMergeConfirm,
  onDetachActivity,
  readOnly = false,
}: {
  showForm: boolean;
  startNew: () => void;
  draft: Workout;
  setDraft: (updater: (d: Workout) => Workout) => void;
  categories: string[];
  newCategory: string;
  setNewCategory: (v: string) => void;
  addCategory: () => void;
  addExercise: (kind: LeafKind | "circuit") => void;
  updateExercise: (id: string, patch: Partial<WorkoutExercise>) => void;
  removeExercise: (id: string) => void;
  addSet: (id: string) => void;
  updateSet: (id: string, idx: number, field: string, value: string) => void;
  removeSet: (id: string, idx: number) => void;
  toggleUnilateral: (id: string) => void;
  circuitElementHandlers: (circuitId: string) => CircuitElementHandlers;
  saveWorkout: () => void;
  cancelForm: () => void;
  editingId: string | null;
  sortedWorkouts: Workout[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  startEdit: (w: Workout) => void;
  startDuplicate: (w: Workout) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  deleteWorkout: (id: string) => void;
  prIds: Set<string>;
  thisWeekKm: number;
  thisWeekTotalMinutes: number;
  formError: string | null;
  saveStatus: "saving" | null;
  knownExerciseNames: string[];
  mergeSourceId: string | null;
  setMergeSourceId: (id: string | null) => void;
  onMergeConfirm: (sourceId: string, targetId: string) => void;
  onDetachActivity: (activityRowId: string) => void;
  readOnly?: boolean;
}) {
  const mergeSource = sortedWorkouts.find((w) => w.id === mergeSourceId) || null;

  // sortedWorkouts is sorted by date, so equal dates are always contiguous —
  // safe to group sequentially without re-sorting.
  const dayGroups: { date: string; items: Workout[] }[] = [];
  sortedWorkouts.forEach((w) => {
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.date === w.date) last.items.push(w);
    else dayGroups.push({ date: w.date, items: [w] });
  });

  return (
    <div>
      {!showForm && (
        <div className="mb-4 p-3 rounded-md flex items-center justify-between" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 12 }}>
            TEN TYDZIEŃ
            <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
              <span style={{ fontFamily: FONT_DISPLAY, color: INK, fontSize: 20, fontWeight: 600 }}>
                Dystans: {thisWeekKm.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km
              </span>
              <span style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 11 }}>
                czas treningów: {fmtMinutesLong(thisWeekTotalMinutes)}
              </span>
            </div>
          </div>
          {!readOnly && (
            <button onClick={startNew} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm" style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}>
              <Plus size={16} /> Nowy trening
            </button>
          )}
        </div>
      )}

      {showForm && !readOnly && (
        <WorkoutForm
          draft={draft}
          setDraft={setDraft}
          categories={categories}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          addCategory={addCategory}
          addExercise={addExercise}
          updateExercise={updateExercise}
          removeExercise={removeExercise}
          addSet={addSet}
          updateSet={updateSet}
          removeSet={removeSet}
          toggleUnilateral={toggleUnilateral}
          circuitElementHandlers={circuitElementHandlers}
          saveWorkout={saveWorkout}
          cancelForm={cancelForm}
          editingId={editingId}
          formError={formError}
          saveStatus={saveStatus}
          knownExerciseNames={knownExerciseNames}
        />
      )}

      {sortedWorkouts.length === 0 && !showForm && (
        <div className="text-center py-10" style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 13 }}>
          Brak wpisów w dzienniku.
          <br />
          Dodaj pierwszy trening, żeby zobaczyć tu historię.
        </div>
      )}

      <div className="mt-2">
        {dayGroups.map((group) => (
          <div key={group.date} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600, whiteSpace: "nowrap" }}>
                {fmtDate(group.date)}
              </div>
              <div className="flex-1" style={{ height: 1, background: LINE }} />
            </div>

            <div className="space-y-2">
              {group.items.map((w) => {
                const tonnage = computeWorkoutTonnage(w);
                const plyoReps = computeWorkoutPlyoReps(w);
                const isometricTUT = computeWorkoutIsometricTUT(w);
                const functionalMin = computeWorkoutFunctionalMinutes(w);
                const aerobicMin = computeWorkoutAerobicMinutes(w);
                const hasStrava = (w.stravaActivities?.length ?? 0) > 0;
                const stravaDistanceM = hasStrava ? computeWorkoutStravaDistanceM(w) : 0;
                const allCycling = hasStrava && w.stravaActivities!.every((a) => isCyclingActivityType(a.type));
                const expanded = expandedId === w.id;
                const isPR = prIds.has(w.id);
                return (
                  <div key={w.id} id={`workout-${w.id}`} className="rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                    <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => setExpandedId(expanded ? null : w.id)}>
                      <div>
                        {w.timeOfDay && (
                          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, textTransform: "uppercase" }}>
                            {w.timeOfDay}
                          </div>
                        )}
                        {w.name && (
                          <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: INK, fontWeight: 700 }} className="mt-0.5">
                            {w.name}
                          </div>
                        )}
                        {w.subtitle && (
                          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, fontWeight: 400 }}>
                            {w.subtitle}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full text-[11px]" style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}>
                            {w.category}
                          </span>
                          {isPR && <span className="pr-stamp px-1.5 py-0.5 rounded-full text-[10px] font-semibold">PR</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasStrava ? (
                          <StravaCollapsedSummary
                            distanceM={stravaDistanceM}
                            movingTimeS={computeWorkoutStravaMovingTimeS(w)}
                            avgSpeedMps={computeWorkoutStravaAvgSpeedMps(w)}
                            mode={allCycling ? "speed" : "pace"}
                          />
                        ) : (
                          <div className="text-right" style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>
                            {tonnage > 0 && <div>{Math.round(tonnage)} kg</div>}
                            {plyoReps > 0 && <div style={{ color: PLYO }}>{plyoReps} powt. plyo</div>}
                            {isometricTUT > 0 && <div style={{ color: ISO }}>TUT {fmtDurationShort(isometricTUT)} izo</div>}
                            {functionalMin > 0 && <div style={{ color: TEAL }}>{functionalMin} min funkc.</div>}
                            {aerobicMin > 0 && <div style={{ color: AERO }}>{aerobicMin} min aerob.</div>}
                          </div>
                        )}
                        {expanded ? <ChevronUp size={16} color={INK_SOFT} /> : <ChevronDown size={16} color={INK_SOFT} />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-3 pb-3 border-t" style={{ borderColor: LINE }}>
                        {w.notes && <div className="text-xs mt-2 italic" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>{w.notes}</div>}

                        {hasStrava && (
                          <div className="mt-2">
                            {w.stravaActivities!.map((a) => (
                              <StravaSingleActivity key={a.id} activity={a} onDetach={() => onDetachActivity(a.id)} />
                            ))}
                          </div>
                        )}

                        {w.exercises.length > 0 && (
                          <div className="mt-2">
                            <WorkoutExerciseSummary exercises={w.exercises} />
                          </div>
                        )}

                        {!readOnly && (
                          <div className="flex items-center gap-2 mt-3">
                            <IconBtn onClick={() => startEdit(w)} title="Edytuj">
                              <Pencil size={15} />
                            </IconBtn>
                            <IconBtn onClick={() => startDuplicate(w)} title="Duplikuj jako nowy trening">
                              <Copy size={15} />
                            </IconBtn>
                            {hasStrava && (
                              <IconBtn onClick={() => setMergeSourceId(w.id)} title="Połącz z innym treningiem">
                                <Link2 size={15} />
                              </IconBtn>
                            )}
                            {confirmDeleteId === w.id ? (
                              <button onClick={() => deleteWorkout(w.id)} className="text-xs px-2 py-1 rounded" style={{ fontFamily: FONT_MONO, background: RUST, color: "#fff" }}>
                                Na pewno usunąć?
                              </button>
                            ) : (
                              <IconBtn onClick={() => setConfirmDeleteId(w.id)} title="Usuń" color={RUST}>
                                <Trash2 size={15} />
                              </IconBtn>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {mergeSource && (
        <MergeWorkoutPicker
          sourceWorkout={mergeSource}
          candidates={sortedWorkouts.filter((w) => w.id !== mergeSource.id)}
          onPick={(targetId) => onMergeConfirm(mergeSource.id, targetId)}
          onCancel={() => setMergeSourceId(null)}
        />
      )}
    </div>
  );
}
