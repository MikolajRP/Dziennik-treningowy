"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, Repeat2, X } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CARD, CATEGORY_GROUPS, CATEGORY_GROUP_LABEL, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, RUST, inputStyle } from "@/lib/design";
import type { Category, CategoryGroup, LeafExercise, LeafKind, Workout, WorkoutExercise } from "@/lib/types";
import { Chip, Field, IconBtn } from "./atoms";
import { AddLeafButtons, ExerciseEditor } from "./ExerciseEditor";
import { CircuitEditor, type CircuitElementHandlers } from "./CircuitEditor";

// Wraps one top-level exercise/circuit card so it can be dragged by its own
// handle (rendered inside ExerciseEditor/CircuitEditor) to reorder the list.
function SortableExerciseItem({
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

export function WorkoutForm({
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
  formError,
  saveStatus,
  knownExerciseNames,
}: {
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
  formError: string | null;
  saveStatus: "saving" | null;
  knownExerciseNames: string[];
}) {
  const [openGroup, setOpenGroup] = useState<CategoryGroup | null>(
    categories.find((c) => c.name === draft.category)?.group ?? null
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
  function handleExerciseDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) reorderExercise(String(active.id), String(over.id));
  }
  return (
    <div className="rounded-md p-3 mb-4" style={{ background: CARD, border: `1px solid ${INK}` }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontFamily: FONT_DISPLAY, color: INK, fontSize: 16, fontWeight: 600 }}>
          {editingId ? "EDYTUJ TRENING" : "NOWY TRENING"}
        </div>
        <IconBtn onClick={cancelForm} title="Zamknij">
          <X size={18} />
        </IconBtn>
      </div>

      <Field label="Data">
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
          className="px-2 py-1.5 rounded text-sm"
          style={inputStyle}
        />
      </Field>

      <Field label="Nazwa treningu (opcjonalnie)">
        <input
          placeholder="np. Nogi — siła ciężka"
          value={draft.name ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          className="w-full px-2 py-1.5 rounded text-sm"
          style={inputStyle}
        />
      </Field>

      <Field label="Podtytuł (opcjonalnie)">
        <textarea
          placeholder="np. tydzień 3, przed zawodami"
          value={draft.subtitle ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
          rows={2}
          className="w-full px-2 py-1.5 rounded text-sm"
          style={inputStyle}
        />
      </Field>

      <Field label="Kategoria (opcjonalnie)">
        {CATEGORY_GROUPS.map((group) => {
          const groupCategories = categories.filter((c) => c.group === group);
          const isOpen = openGroup === group;
          const selected = groupCategories.find((c) => c.name === draft.category);
          return (
            <div key={group} className="mb-1.5 last:mb-0 rounded-md overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
              <button
                onClick={() => setOpenGroup(isOpen ? null : group)}
                className="w-full flex items-center justify-between px-2.5 py-2"
              >
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600 }}>
                  {CATEGORY_GROUP_LABEL[group]}
                  {selected && (
                    <span style={{ color: INK_SOFT, fontWeight: 400 }}> · {selected.name}</span>
                  )}
                </span>
                {isOpen ? <ChevronUp size={14} color={INK_SOFT} /> : <ChevronDown size={14} color={INK_SOFT} />}
              </button>
              {isOpen && (
                <div className="px-2.5 pb-2.5">
                  {groupCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {groupCategories.map((c) => (
                        <Chip
                          key={c.name}
                          active={draft.category === c.name}
                          onClick={() => setDraft((d) => ({ ...d, category: d.category === c.name ? "" : c.name }))}
                        >
                          {c.name}
                        </Chip>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      placeholder={`Nowy rodzaj — ${CATEGORY_GROUP_LABEL[group]}…`}
                      value={newCategoryDrafts[group]}
                      onChange={(e) => setNewCategoryDraft(group, e.target.value)}
                      className="flex-1 px-2 py-1 rounded text-xs"
                      style={inputStyle}
                    />
                    <button
                      onClick={() => addCategory(group)}
                      className="px-2 py-1 rounded text-xs"
                      style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}
                    >
                      Dodaj
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Field>

      <Field label="Przebieg treningu (w kolejności) — przytrzymaj uchwyt, żeby przesunąć">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
          <SortableContext items={draft.exercises.map((ex) => ex.id)} strategy={verticalListSortingStrategy}>
            {draft.exercises.map((ex) => (
              <SortableExerciseItem key={ex.id} id={ex.id}>
                {(dragHandleProps) =>
                  ex.kind === "circuit" ? (
                    <CircuitEditor
                      circuit={ex}
                      onUpdateCircuit={(patch) => updateExercise(ex.id, patch)}
                      onRemoveCircuit={() => removeExercise(ex.id)}
                      elementHandlers={circuitElementHandlers(ex.id)}
                      knownExerciseNames={knownExerciseNames}
                      dragHandleProps={dragHandleProps}
                    />
                  ) : (
                    <ExerciseEditor
                      ex={ex as LeafExercise}
                      onUpdate={(patch) => updateExercise(ex.id, patch)}
                      onRemove={() => removeExercise(ex.id)}
                      onToggleUnilateral={() => toggleUnilateral(ex.id)}
                      onAddSet={() => addSet(ex.id)}
                      onUpdateSet={(idx, field, value) => updateSet(ex.id, idx, field, value)}
                      onRemoveSet={(idx) => removeSet(ex.id, idx)}
                      knownExerciseNames={knownExerciseNames}
                      dragHandleProps={dragHandleProps}
                    />
                  )
                }
              </SortableExerciseItem>
            ))}
          </SortableContext>
        </DndContext>

        <div className="text-[11px] uppercase tracking-wide mb-1 mt-3" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
          Dodaj pojedyncze ćwiczenie
        </div>
        <AddLeafButtons onAdd={addExercise} />

        <button
          onClick={() => addExercise("circuit")}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs mt-2"
          style={{ fontFamily: FONT_MONO, border: `1px dashed ${RUST}`, color: RUST }}
        >
          <Repeat2 size={14} /> Rozpocznij obwód
        </button>
      </Field>

      <Field label="Pora dnia (opcjonalnie)">
        <div className="flex gap-1.5">
          <Chip active={draft.timeOfDay === "rano"} onClick={() => setDraft((d) => ({ ...d, timeOfDay: d.timeOfDay === "rano" ? undefined : "rano" }))}>
            Rano
          </Chip>
          <Chip
            active={draft.timeOfDay === "popołudnie"}
            onClick={() => setDraft((d) => ({ ...d, timeOfDay: d.timeOfDay === "popołudnie" ? undefined : "popołudnie" }))}
          >
            Popołudnie
          </Chip>
        </div>
      </Field>

      <Field label="Czas trwania treningu w minutach (opcjonalnie)">
        <input
          type="number"
          inputMode="numeric"
          placeholder="np. 60"
          value={draft.durationMinutes ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              durationMinutes: e.target.value === "" ? undefined : Number(e.target.value),
            }))
          }
          className="w-24 px-2 py-1.5 rounded text-sm"
          style={inputStyle}
        />
      </Field>

      <Field label="Notatka (opcjonalnie)">
        <textarea
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          rows={2}
          className="w-full px-2 py-1.5 rounded text-sm"
          style={inputStyle}
        />
      </Field>

      {formError && (
        <div className="text-xs mb-2 px-2 py-1.5 rounded" style={{ fontFamily: FONT_MONO, background: "#FBEAE7", color: RUST, border: `1px solid ${RUST}` }}>
          {formError}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={saveWorkout}
          disabled={saveStatus === "saving"}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm"
          style={{ fontFamily: FONT_MONO, background: INK, color: "#fff", opacity: saveStatus === "saving" ? 0.6 : 1 }}
        >
          <Check size={16} /> {saveStatus === "saving" ? "Zapisywanie…" : "Zapisz trening"}
        </button>
        <button onClick={cancelForm} className="px-4 py-2.5 rounded-md text-sm" style={{ fontFamily: FONT_MONO, border: `1px solid ${LINE}`, color: INK_SOFT }}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
