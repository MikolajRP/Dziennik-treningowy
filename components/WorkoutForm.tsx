"use client";

import { Check, Repeat2, X } from "lucide-react";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, RUST, inputStyle } from "@/lib/design";
import type { LeafExercise, LeafKind, Workout, WorkoutExercise } from "@/lib/types";
import { Chip, Field, IconBtn } from "./atoms";
import { AddLeafButtons, ExerciseEditor } from "./ExerciseEditor";
import { CircuitEditor, type CircuitElementHandlers } from "./CircuitEditor";

export function WorkoutForm({
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
  formError,
  saveStatus,
  knownExerciseNames,
}: {
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
  formError: string | null;
  saveStatus: "saving" | null;
  knownExerciseNames: string[];
}) {
  return (
    <div className="rounded-md p-3 mb-4" style={{ background: CARD, border: `1px solid ${INK}` }}>
      <datalist id="exercise-name-suggestions">
        {knownExerciseNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
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

      <Field label="Kategoria">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {categories.map((c) => (
            <Chip key={c} active={draft.category === c} onClick={() => setDraft((d) => ({ ...d, category: c }))}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            placeholder="Nowa kategoria…"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-2 py-1 rounded text-xs"
            style={inputStyle}
          />
          <button onClick={addCategory} className="px-2 py-1 rounded text-xs" style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}>
            Dodaj
          </button>
        </div>
      </Field>

      <Field label="Przebieg treningu (w kolejności)">
        {draft.exercises.map((ex) =>
          ex.kind === "circuit" ? (
            <CircuitEditor
              key={ex.id}
              circuit={ex}
              onUpdateCircuit={(patch) => updateExercise(ex.id, patch)}
              onRemoveCircuit={() => removeExercise(ex.id)}
              elementHandlers={circuitElementHandlers(ex.id)}
            />
          ) : (
            <ExerciseEditor
              key={ex.id}
              ex={ex as LeafExercise}
              onUpdate={(patch) => updateExercise(ex.id, patch)}
              onRemove={() => removeExercise(ex.id)}
              onToggleUnilateral={() => toggleUnilateral(ex.id)}
              onAddSet={() => addSet(ex.id)}
              onUpdateSet={(idx, field, value) => updateSet(ex.id, idx, field, value)}
              onRemoveSet={(idx) => removeSet(ex.id, idx)}
            />
          )
        )}

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
