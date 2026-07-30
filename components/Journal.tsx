"use client";

import { useMemo, useState } from "react";
import { BarChart3, BookOpen, Dumbbell, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import {
  addCategoryRow,
  deleteCycleRow,
  deleteWorkoutRow,
  saveCycleRow,
  saveWorkout as saveWorkoutRow,
} from "@/lib/data";
import {
  addDays,
  addExerciseToList,
  addSetInList,
  collectKnownExerciseNames,
  computePRIds,
  computeWorkoutAerobicMinutes,
  computeWorkoutFunctionalMinutes,
  computeWorkoutIsometricLoad,
  computeWorkoutPlyoReps,
  computeWorkoutTonnage,
  emptyDraft,
  fmtShort,
  getRange,
  groupByCategory,
  isLeafExerciseValid,
  cleanLeafExercise,
  removeExerciseFromList,
  removeSetInList,
  startOfWeek,
  todayISO,
  toggleUnilateralInList,
  updateExerciseInList,
  updateSetInList,
} from "@/lib/calculations";
import { FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, MUSTARD, gridBg } from "@/lib/design";
import type { Circuit, Cycle, LeafExercise, LeafKind, Period, Workout, WorkoutExercise } from "@/lib/types";
import { LogTab } from "./LogTab";
import { ReportsTab } from "./ReportsTab";
import type { CircuitElementHandlers } from "./CircuitEditor";

export function Journal({
  userId,
  initialWorkouts,
  initialCategories,
  initialCycles,
}: {
  userId: string;
  initialWorkouts: Workout[];
  initialCategories: string[];
  initialCycles: Cycle[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<"log" | "reports">("log");
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);
  const [cycles, setCycles] = useState<Cycle[]>(initialCycles);
  const [categories, setCategories] = useState<string[]>(initialCategories);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraftState] = useState<Workout>(emptyDraft(initialCategories));
  const [newCategory, setNewCategory] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | null>(null);

  const [period, setPeriod] = useState<Period>("week");
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState(addDays(todayISO(), -29));
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleDraft, setCycleDraftState] = useState<Cycle>({
    id: "",
    name: "",
    type: "mezocykl",
    start: todayISO(),
    end: addDays(todayISO(), 27),
  });

  function setDraft(updater: (d: Workout) => Workout) {
    setDraftState(updater);
  }
  function setCycleDraft(updater: (c: Cycle) => Cycle) {
    setCycleDraftState(updater);
  }

  // ---------- top-level draft editing ----------
  function addExercise(kind: LeafKind | "circuit") {
    setDraft((d) => ({ ...d, exercises: addExerciseToList(d.exercises, kind) }));
  }
  function updateExercise(id: string, patch: Partial<WorkoutExercise>) {
    setDraft((d) => ({ ...d, exercises: updateExerciseInList(d.exercises, id, patch) }));
  }
  function removeExercise(id: string) {
    setDraft((d) => ({ ...d, exercises: removeExerciseFromList(d.exercises, id) }));
  }
  function toggleUnilateral(id: string) {
    setDraft((d) => ({ ...d, exercises: toggleUnilateralInList(d.exercises as LeafExercise[], id) }));
  }
  function addSet(id: string) {
    setDraft((d) => ({ ...d, exercises: addSetInList(d.exercises as LeafExercise[], id) }));
  }
  function updateSet(id: string, idx: number, field: string, value: string) {
    setDraft((d) => ({ ...d, exercises: updateSetInList(d.exercises as LeafExercise[], id, idx, field, value) }));
  }
  function removeSet(id: string, idx: number) {
    setDraft((d) => ({ ...d, exercises: removeSetInList(d.exercises as LeafExercise[], id, idx) }));
  }

  // ---------- circuit + nested element editing ----------
  function updateCircuit(circuitId: string, updater: (c: Circuit) => Circuit) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex) => (ex.id === circuitId && ex.kind === "circuit" ? updater(ex) : ex)),
    }));
  }
  function circuitElementHandlers(circuitId: string): CircuitElementHandlers {
    return {
      add: (kind) => updateCircuit(circuitId, (c) => ({ ...c, elements: addExerciseToList(c.elements, kind) as LeafExercise[] })),
      update: (elId, patch) => updateCircuit(circuitId, (c) => ({ ...c, elements: updateExerciseInList(c.elements, elId, patch) as LeafExercise[] })),
      remove: (elId) => updateCircuit(circuitId, (c) => ({ ...c, elements: removeExerciseFromList(c.elements, elId) as LeafExercise[] })),
      toggleUnilateral: (elId) => updateCircuit(circuitId, (c) => ({ ...c, elements: toggleUnilateralInList(c.elements, elId) })),
      addSet: (elId) => updateCircuit(circuitId, (c) => ({ ...c, elements: addSetInList(c.elements, elId) })),
      updateSet: (elId, idx, field, value) => updateCircuit(circuitId, (c) => ({ ...c, elements: updateSetInList(c.elements, elId, idx, field, value) })),
      removeSet: (elId, idx) => updateCircuit(circuitId, (c) => ({ ...c, elements: removeSetInList(c.elements, elId, idx) })),
    };
  }

  function startNew() {
    setDraftState(emptyDraft(categories));
    setEditingId(null);
    setFormError(null);
    setSaveStatus(null);
    setShowForm(true);
  }
  function startEdit(w: Workout) {
    setDraftState(JSON.parse(JSON.stringify(w)));
    setEditingId(w.id);
    setFormError(null);
    setSaveStatus(null);
    setShowForm(true);
    setExpandedId(null);
  }
  function startDuplicate(w: Workout) {
    const copy = JSON.parse(JSON.stringify(w)) as Workout;
    copy.date = todayISO();
    setDraftState(copy);
    setEditingId(null); // saving creates a new workout rather than overwriting the original
    setFormError(null);
    setSaveStatus(null);
    setShowForm(true);
    setExpandedId(null);
  }
  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
    setSaveStatus(null);
    setDraftState(emptyDraft(categories));
  }

  async function handleSaveWorkout() {
    const cleanedExercises = draft.exercises
      .map((ex) => {
        if (ex.kind === "circuit") {
          const elements = ex.elements.map(cleanLeafExercise).filter(isLeafExerciseValid);
          return { ...ex, elements };
        }
        return cleanLeafExercise(ex);
      })
      .filter((ex) => (ex.kind === "circuit" ? ex.elements.length > 0 : isLeafExerciseValid(ex)));

    if (cleanedExercises.length === 0) {
      setFormError("Dodaj przynajmniej jedno ćwiczenie z nazwą i wypełnioną serią (albo minutami), zanim zapiszesz trening.");
      return;
    }
    setFormError(null);
    setSaveStatus("saving");

    const cleaned: Workout = { ...draft, exercises: cleanedExercises };
    try {
      const saved = await saveWorkoutRow(supabase, userId, cleaned, editingId);
      setWorkouts((prev) => {
        const next = editingId ? prev.map((w) => (w.id === editingId ? saved : w)) : [...prev, saved];
        next.sort((a, b) => (a.date < b.date ? 1 : -1));
        return next;
      });
      setSaveStatus(null);
      cancelForm();
    } catch {
      setSaveStatus(null);
      setFormError("Nie udało się zapisać treningu — spróbuj ponownie.");
    }
  }

  async function deleteWorkout(id: string) {
    try {
      await deleteWorkoutRow(supabase, id);
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function addCategory() {
    const v = newCategory.trim();
    if (!v || categories.includes(v)) return;
    await addCategoryRow(supabase, userId, v);
    setCategories((prev) => [...prev, v]);
    setDraft((d) => ({ ...d, category: v }));
    setNewCategory("");
  }

  // ---------- cycles ----------
  async function saveCycle() {
    if (!cycleDraft.name.trim()) return;
    const saved = await saveCycleRow(supabase, userId, cycleDraft);
    setCycles((prev) => (cycleDraft.id ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]));
    setShowCycleForm(false);
    setCycleDraftState({ id: "", name: "", type: "mezocykl", start: todayISO(), end: addDays(todayISO(), 27) });
  }
  async function deleteCycle(id: string) {
    await deleteCycleRow(supabase, id);
    setCycles((prev) => prev.filter((c) => c.id !== id));
    if (selectedCycleId === id) setSelectedCycleId(null);
  }

  // ---------- derived ----------
  const prIds = useMemo(() => computePRIds(workouts), [workouts]);
  const knownExerciseNames = useMemo(() => collectKnownExerciseNames(workouts), [workouts]);
  const sortedWorkouts = useMemo(() => [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)), [workouts]);

  const [rangeStart, rangeEnd] = useMemo(
    () => getRange(period, cycles, selectedCycleId, customStart, customEnd),
    [period, cycles, selectedCycleId, customStart, customEnd]
  );
  const filtered = useMemo(() => workouts.filter((w) => w.date >= rangeStart && w.date <= rangeEnd), [workouts, rangeStart, rangeEnd]);

  const tonnageByCat = useMemo(() => groupByCategory(filtered, computeWorkoutTonnage), [filtered]);
  const plyoByCat = useMemo(() => groupByCategory(filtered, computeWorkoutPlyoReps), [filtered]);
  const isometricByCat = useMemo(() => groupByCategory(filtered, computeWorkoutIsometricLoad), [filtered]);
  const functionalByCat = useMemo(() => groupByCategory(filtered, computeWorkoutFunctionalMinutes), [filtered]);
  const aerobicByCat = useMemo(() => groupByCategory(filtered, computeWorkoutAerobicMinutes), [filtered]);

  const totalTonnage = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutTonnage(w), 0), [filtered]);
  const totalPlyoReps = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutPlyoReps(w), 0), [filtered]);
  const totalIsometricLoad = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutIsometricLoad(w), 0), [filtered]);
  const totalFunctionalMinutes = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutFunctionalMinutes(w), 0), [filtered]);
  const totalAerobicMinutes = useMemo(() => filtered.reduce((s, w) => s + computeWorkoutAerobicMinutes(w), 0), [filtered]);

  const weeklySeries = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((w) => {
      const key = startOfWeek(w.date);
      map[key] = (map[key] || 0) + computeWorkoutTonnage(w);
    });
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([week, tonnage]) => ({ week: fmtShort(week), tonnage: Math.round(tonnage) }));
  }, [filtered]);

  const thisWeekTonnage = useMemo(() => {
    const start = addDays(todayISO(), -6);
    return workouts.filter((w) => w.date >= start).reduce((s, w) => s + computeWorkoutTonnage(w), 0);
  }, [workouts]);

  return (
    <div className="min-h-screen pb-10" style={gridBg}>
      <div className="sticky top-0 z-10 px-4 pt-4 pb-2" style={{ ...gridBg, borderBottom: `2px solid ${INK}` }}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl tracking-wide uppercase" style={{ fontFamily: FONT_DISPLAY, color: INK, fontWeight: 700 }}>
            Dziennik Treningowy
          </h1>
          <div className="flex items-center gap-3">
            <Dumbbell size={20} color={INK} />
            <button
              onClick={() => signOut()}
              title="Wyloguj"
              className="flex items-center gap-1 text-xs"
              style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
            >
              <LogOut size={14} /> Wyloguj
            </button>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setTab("log")}
            className="flex items-center gap-1.5 pb-2 text-sm"
            style={{ fontFamily: FONT_MONO, color: tab === "log" ? INK : INK_SOFT, borderBottom: tab === "log" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
          >
            <BookOpen size={14} /> DZIENNIK
          </button>
          <button
            onClick={() => setTab("reports")}
            className="flex items-center gap-1.5 pb-2 text-sm"
            style={{ fontFamily: FONT_MONO, color: tab === "reports" ? INK : INK_SOFT, borderBottom: tab === "reports" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
          >
            <BarChart3 size={14} /> RAPORTY
          </button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {tab === "log" && (
          <LogTab
            showForm={showForm}
            startNew={startNew}
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
            saveWorkout={handleSaveWorkout}
            cancelForm={cancelForm}
            editingId={editingId}
            sortedWorkouts={sortedWorkouts}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            startEdit={startEdit}
            startDuplicate={startDuplicate}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
            deleteWorkout={deleteWorkout}
            prIds={prIds}
            thisWeekTonnage={thisWeekTonnage}
            formError={formError}
            saveStatus={saveStatus}
            knownExerciseNames={knownExerciseNames}
          />
        )}

        {tab === "reports" && (
          <ReportsTab
            period={period}
            setPeriod={setPeriod}
            cycles={cycles}
            selectedCycleId={selectedCycleId}
            setSelectedCycleId={setSelectedCycleId}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalTonnage={totalTonnage}
            totalPlyoReps={totalPlyoReps}
            totalIsometricLoad={totalIsometricLoad}
            totalFunctionalMinutes={totalFunctionalMinutes}
            totalAerobicMinutes={totalAerobicMinutes}
            filteredCount={filtered.length}
            tonnageByCat={tonnageByCat}
            plyoByCat={plyoByCat}
            isometricByCat={isometricByCat}
            functionalByCat={functionalByCat}
            aerobicByCat={aerobicByCat}
            weeklySeries={weeklySeries}
            showCycleForm={showCycleForm}
            setShowCycleForm={setShowCycleForm}
            cycleDraft={cycleDraft}
            setCycleDraft={setCycleDraft}
            saveCycle={saveCycle}
            deleteCycle={deleteCycle}
          />
        )}
      </div>
    </div>
  );
}
