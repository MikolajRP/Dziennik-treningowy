"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Copy, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  computeWorkoutAerobicMinutes,
  computeWorkoutFunctionalMinutes,
  computeWorkoutIsometricTUT,
  computeWorkoutPlyoReps,
  computeWorkoutTonnage,
  fmtDate,
  fmtDurationShort,
} from "@/lib/calculations";
import {
  computeWorkoutStravaAvgSpeedMps,
  computeWorkoutStravaDistanceM,
  computeWorkoutStravaMovingTimeS,
  isCyclingActivityType,
} from "@/lib/stravaCalculations";
import { AERO, CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, ISO, LINE, MUSTARD, PLYO, RUST, TEAL } from "@/lib/design";
import type { Category, CategoryGroup, LeafKind, Workout, WorkoutExercise } from "@/lib/types";
import { IconBtn } from "./atoms";
import { WorkoutForm } from "./WorkoutForm";
import type { CircuitElementHandlers } from "./CircuitEditor";
import { WorkoutExerciseSummary } from "./WorkoutExerciseSummary";
import { StravaCollapsedSummary, StravaSingleActivity } from "./StravaActivityCard";
import { MergeWorkoutPicker } from "./MergeWorkoutPicker";

// Wraps one Strava activity so it can be dragged by its own handle
// (rendered inside StravaSingleActivity) to reorder the activities attached
// to a single workout — a separate, nested drag scope from the outer
// workout-card dragging below.
function SortableActivityItem({
  id,
  children,
}: {
  id: string;
  children: (dragHandleProps: HTMLAttributes<HTMLDivElement>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners } as HTMLAttributes<HTMLDivElement>)}
    </div>
  );
}

// Every card is draggable (press and hold) and droppable. Dropping onto
// another workout on the SAME day reorders them; dropping onto a workout on
// a DIFFERENT day merges them (only when the dragged card has a Strava
// activity to move — same restriction as the "Połącz" icon button below,
// since merging deletes the source workout row entirely and a
// manual-exercise-only source would lose its data). Disabled in read-only.
function WorkoutCard({
  w,
  expanded,
  isPR,
  readOnly,
  activeDrag,
  setExpandedId,
  startEdit,
  startDuplicate,
  setMergeSourceId,
  onDetachActivity,
  onReorderActivities,
  confirmDeleteId,
  setConfirmDeleteId,
  deleteWorkout,
}: {
  w: Workout;
  expanded: boolean;
  isPR: boolean;
  readOnly: boolean;
  activeDrag: { id: string; date: string; hasStrava: boolean } | null;
  setExpandedId: (id: string | null) => void;
  startEdit: (w: Workout) => void;
  startDuplicate: (w: Workout) => void;
  setMergeSourceId: (id: string | null) => void;
  onDetachActivity: (activityRowId: string) => void;
  onReorderActivities: (workoutId: string, activeId: string, overId: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  deleteWorkout: (id: string) => void;
}) {
  const activitySensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
  function handleActivityDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) onReorderActivities(w.id, String(active.id), String(over.id));
  }
  const tonnage = computeWorkoutTonnage(w);
  const plyoReps = computeWorkoutPlyoReps(w);
  const isometricTUT = computeWorkoutIsometricTUT(w);
  const functionalMin = computeWorkoutFunctionalMinutes(w);
  const aerobicMin = computeWorkoutAerobicMinutes(w);
  const hasStrava = (w.stravaActivities?.length ?? 0) > 0;
  const stravaDistanceM = hasStrava ? computeWorkoutStravaDistanceM(w) : 0;
  const allCycling = hasStrava && w.stravaActivities!.every((a) => isCyclingActivityType(a.type));
  const dragEnabled = !readOnly;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: w.id,
    disabled: !dragEnabled,
  });

  const isMergeTarget =
    !!activeDrag && activeDrag.id !== w.id && activeDrag.date !== w.date && activeDrag.hasStrava;
  const showMergeHint = isOver && isMergeTarget;

  return (
    <div
      ref={setNodeRef}
      id={`workout-${w.id}`}
      className="rounded-md"
      style={{
        background: CARD,
        border: showMergeHint ? `2px solid ${MUSTARD}` : `1px solid ${LINE}`,
        opacity: isDragging ? 0.6 : 1,
        boxShadow: isDragging ? "0 6px 16px rgba(27,42,58,0.25)" : "none",
        transform: CSS.Transform.toString(transform),
        transition,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      <button
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setExpandedId(expanded ? null : w.id)}
        style={dragEnabled ? { touchAction: "manipulation", cursor: "grab" } : undefined}
        {...(dragEnabled ? attributes : {})}
        {...(dragEnabled ? listeners : {})}
      >
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
          {(w.category || isPR) && (
            <div className="flex items-center gap-2 mt-1">
              {w.category && (
                <span className="px-2 py-0.5 rounded-full text-[11px]" style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}>
                  {w.category}
                </span>
              )}
              {isPR && <span className="pr-stamp px-1.5 py-0.5 rounded-full text-[10px] font-semibold">PR</span>}
            </div>
          )}
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

      {showMergeHint && (
        <div className="px-3 pb-2 -mt-1 text-center text-xs" style={{ fontFamily: FONT_MONO, color: MUSTARD, fontWeight: 600 }}>
          Upuść, aby połączyć
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: LINE }}>
          {w.notes && <div className="text-xs mt-2 italic" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>{w.notes}</div>}

          {hasStrava && (
            <div className="mt-2">
              <DndContext sensors={activitySensors} collisionDetection={closestCenter} onDragEnd={handleActivityDragEnd}>
                <SortableContext items={w.stravaActivities!.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  {w.stravaActivities!.map((a) => (
                    <SortableActivityItem key={a.id} id={a.id}>
                      {(dragHandleProps) => (
                        <StravaSingleActivity
                          activity={a}
                          onDetach={() => onDetachActivity(a.id)}
                          dragHandleProps={readOnly || w.stravaActivities!.length < 2 ? undefined : dragHandleProps}
                        />
                      )}
                    </SortableActivityItem>
                  ))}
                </SortableContext>
              </DndContext>
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
}

export function LogTab({
  showForm,
  startNew,
  draft,
  setDraft,
  categories,
  newCategoryDrafts,
  setNewCategoryDraft,
  addCategory,
  addExercise,
  updateExercise,
  removeExercise,
  reorderExercise,
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
  formError,
  saveStatus,
  knownExerciseNames,
  mergeSourceId,
  setMergeSourceId,
  onMergeConfirm,
  onReorderWorkouts,
  onDetachActivity,
  onReorderActivities,
  readOnly = false,
}: {
  showForm: boolean;
  startNew: () => void;
  draft: Workout;
  setDraft: (updater: (d: Workout) => Workout) => void;
  categories: Category[];
  newCategoryDrafts: Record<CategoryGroup, string>;
  setNewCategoryDraft: (group: CategoryGroup, v: string) => void;
  addCategory: (group: CategoryGroup) => void;
  addExercise: (kind: LeafKind | "circuit") => void;
  updateExercise: (id: string, patch: Partial<WorkoutExercise>) => void;
  removeExercise: (id: string) => void;
  reorderExercise: (activeId: string, overId: string) => void;
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
  formError: string | null;
  saveStatus: "saving" | null;
  knownExerciseNames: string[];
  mergeSourceId: string | null;
  setMergeSourceId: (id: string | null) => void;
  onMergeConfirm: (sourceId: string, targetId: string) => void;
  onReorderWorkouts: (activeId: string, overId: string) => void;
  onDetachActivity: (activityRowId: string) => void;
  onReorderActivities: (workoutId: string, activeId: string, overId: string) => void;
  readOnly?: boolean;
}) {
  const mergeSource = sortedWorkouts.find((w) => w.id === mergeSourceId) || null;

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragWorkout = sortedWorkouts.find((w) => w.id === activeDragId) ?? null;
  const activeDrag = activeDragWorkout
    ? { id: activeDragWorkout.id, date: activeDragWorkout.date, hasStrava: (activeDragWorkout.stravaActivities?.length ?? 0) > 0 }
    : null;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
  function handleWorkoutDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }
  function handleWorkoutDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeW = sortedWorkouts.find((w) => w.id === active.id);
    const overW = sortedWorkouts.find((w) => w.id === over.id);
    if (!activeW || !overW) return;
    if (activeW.date === overW.date) {
      onReorderWorkouts(activeW.id, overW.id);
    } else if ((activeW.stravaActivities?.length ?? 0) > 0) {
      onMergeConfirm(activeW.id, overW.id);
    }
  }

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
            <div style={{ fontFamily: FONT_DISPLAY, color: INK, fontSize: 22, fontWeight: 600 }}>
              {thisWeekKm.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km
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
          newCategoryDrafts={newCategoryDrafts}
          setNewCategoryDraft={setNewCategoryDraft}
          addCategory={addCategory}
          addExercise={addExercise}
          updateExercise={updateExercise}
          removeExercise={removeExercise}
          reorderExercise={reorderExercise}
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleWorkoutDragStart}
        onDragEnd={handleWorkoutDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="mt-2">
          {dayGroups.map((group) => (
            <div key={group.date} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {fmtDate(group.date)}
                </div>
                <div className="flex-1" style={{ height: 1, background: LINE }} />
              </div>

              <SortableContext items={group.items.map((w) => w.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {group.items.map((w) => (
                    <WorkoutCard
                      key={w.id}
                      w={w}
                      expanded={expandedId === w.id}
                      isPR={prIds.has(w.id)}
                      readOnly={readOnly}
                      activeDrag={activeDrag}
                      setExpandedId={setExpandedId}
                      startEdit={startEdit}
                      startDuplicate={startDuplicate}
                      setMergeSourceId={setMergeSourceId}
                      onDetachActivity={onDetachActivity}
                      onReorderActivities={onReorderActivities}
                      confirmDeleteId={confirmDeleteId}
                      setConfirmDeleteId={setConfirmDeleteId}
                      deleteWorkout={deleteWorkout}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>

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
