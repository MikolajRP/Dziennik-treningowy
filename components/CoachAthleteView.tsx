"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BarChart3, BookOpen } from "lucide-react";
import { addDays, emptyDraft, todayISO } from "@/lib/calculations";
import { FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, MUSTARD, gridBg } from "@/lib/design";
import type { Cycle, Period, Workout } from "@/lib/types";
import { useReportsData } from "@/lib/useReportsData";
import { LogTab } from "./LogTab";
import { ReportsTab } from "./ReportsTab";
import type { CircuitElementHandlers } from "./CircuitEditor";

const noop = () => {};

export function CoachAthleteView({
  athleteEmail,
  workouts,
  categories,
  cycles,
  canViewReports,
}: {
  athleteEmail: string;
  workouts: Workout[];
  categories: string[];
  cycles: Cycle[];
  canViewReports: boolean;
}) {
  const [tab, setTab] = useState<"log" | "reports">("log");

  const [period, setPeriod] = useState<Period>("week");
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState(addDays(todayISO(), -29));
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    prIds,
    knownExerciseNames,
    sortedWorkouts,
    rangeStart,
    rangeEnd,
    filtered,
    tonnageByCat,
    plyoByCat,
    isometricByCat,
    functionalByCat,
    aerobicByCat,
    totalTonnage,
    totalPlyoReps,
    totalIsometricTUT,
    totalFunctionalMinutes,
    totalAerobicMinutes,
    weeklySeries,
    thisWeekTonnage,
    totalRunningKm,
    totalRunningMinutes,
    weeklyRunningKmSeries,
    kmByActivityType,
    timeByActivityType,
    hrZones,
    totalOverallMinutes,
    tonnageByMuscleGroup,
    thisWeekRunning,
    last12WeeksRunning,
  } = useReportsData(workouts, cycles, period, selectedCycleId, customStart, customEnd);

  const emptyCircuitHandlers = (): CircuitElementHandlers => ({
    add: noop,
    update: noop,
    remove: noop,
    toggleUnilateral: noop,
    addSet: noop,
    updateSet: noop,
    removeSet: noop,
  });

  return (
    <div className="min-h-screen pb-10" style={gridBg}>
      <div className="sticky top-0 z-10 px-4 pt-4 pb-2" style={{ ...gridBg, borderBottom: `2px solid ${INK}` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <Link
              href="/"
              className="flex items-center gap-1 text-xs mb-1"
              style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
            >
              <ArrowLeft size={13} /> Powrót
            </Link>
            <h1 className="text-xl tracking-wide uppercase" style={{ fontFamily: FONT_DISPLAY, color: INK, fontWeight: 700 }}>
              {athleteEmail}
            </h1>
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
          {canViewReports && (
            <button
              onClick={() => setTab("reports")}
              className="flex items-center gap-1.5 pb-2 text-sm"
              style={{ fontFamily: FONT_MONO, color: tab === "reports" ? INK : INK_SOFT, borderBottom: tab === "reports" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
            >
              <BarChart3 size={14} /> RAPORTY
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {tab === "log" && (
          <LogTab
            readOnly
            showForm={false}
            startNew={noop}
            draft={emptyDraft(categories)}
            setDraft={noop}
            categories={categories}
            newCategory=""
            setNewCategory={noop}
            addCategory={noop}
            addExercise={noop}
            updateExercise={noop}
            removeExercise={noop}
            addSet={noop}
            updateSet={noop}
            removeSet={noop}
            toggleUnilateral={noop}
            circuitElementHandlers={emptyCircuitHandlers}
            saveWorkout={noop}
            cancelForm={noop}
            editingId={null}
            sortedWorkouts={sortedWorkouts}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            startEdit={noop}
            startDuplicate={noop}
            confirmDeleteId={null}
            setConfirmDeleteId={noop}
            deleteWorkout={noop}
            prIds={prIds}
            thisWeekTonnage={thisWeekTonnage}
            formError={null}
            saveStatus={null}
            knownExerciseNames={knownExerciseNames}
            mergeSourceId={null}
            setMergeSourceId={noop}
            onMergeConfirm={noop}
            onDetachActivity={noop}
          />
        )}

        {tab === "reports" && canViewReports && (
          <ReportsTab
            readOnly
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
            totalIsometricTUT={totalIsometricTUT}
            totalFunctionalMinutes={totalFunctionalMinutes}
            totalAerobicMinutes={totalAerobicMinutes}
            filteredCount={filtered.length}
            tonnageByCat={tonnageByCat}
            plyoByCat={plyoByCat}
            isometricByCat={isometricByCat}
            functionalByCat={functionalByCat}
            aerobicByCat={aerobicByCat}
            weeklySeries={weeklySeries}
            totalRunningKm={totalRunningKm}
            totalRunningMinutes={totalRunningMinutes}
            weeklyRunningKmSeries={weeklyRunningKmSeries}
            kmByActivityType={kmByActivityType}
            timeByActivityType={timeByActivityType}
            hrZones={hrZones}
            totalOverallMinutes={totalOverallMinutes}
            tonnageByMuscleGroup={tonnageByMuscleGroup}
            thisWeekRunning={thisWeekRunning}
            last12WeeksRunning={last12WeeksRunning}
            showCycleForm={false}
            setShowCycleForm={noop}
            cycleDraft={{ id: "", name: "", type: "mezocykl", start: todayISO(), end: addDays(todayISO(), 27) }}
            setCycleDraft={noop}
            saveCycle={noop}
            deleteCycle={noop}
          />
        )}
      </div>
    </div>
  );
}
