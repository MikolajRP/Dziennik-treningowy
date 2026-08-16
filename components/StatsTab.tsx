"use client";

import { useState } from "react";
import { BarChart3, GitCompare, HeartPulse } from "lucide-react";
import type { HrZoneDatum, ThisWeekRunning, WeeklyRunningDatum } from "@/lib/stravaCalculations";
import type { MuscleGroupDatum } from "@/lib/muscleGroups";
import type { Cycle, HealthEntry, Period, Workout } from "@/lib/types";
import { SubTabBar } from "./atoms";
import { AnalysisTab } from "./AnalysisTab";
import { ReportsTab } from "./ReportsTab";
import { HealthTab } from "./HealthTab";
import { EMPTY_HEALTH_DRAFT } from "./HealthEntryForm";

interface CategoryDatum {
  category: string;
  value: number;
}

const noop = () => {};

type StatsSubTab = "analysis" | "reports" | "health";

export function StatsTab({
  workouts,
  healthEntries,
  period,
  setPeriod,
  cycles,
  selectedCycleId,
  setSelectedCycleId,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  rangeStart,
  rangeEnd,
  totalTonnage,
  totalPlyoReps,
  totalIsometricTUT,
  totalFunctionalMinutes,
  totalAerobicMinutes,
  filteredCount,
  tonnageByCat,
  plyoByCat,
  isometricByCat,
  functionalByCat,
  aerobicByCat,
  weeklySeries,
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
  showCycleForm,
  setShowCycleForm,
  cycleDraft,
  setCycleDraft,
  saveCycle,
  deleteCycle,
  readOnly = false,
  showHealthSubTab = false,
}: {
  workouts: Workout[];
  healthEntries: HealthEntry[];
  period: Period;
  setPeriod: (p: Period) => void;
  cycles: Cycle[];
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string) => void;
  customStart: string;
  setCustomStart: (v: string) => void;
  customEnd: string;
  setCustomEnd: (v: string) => void;
  rangeStart: string;
  rangeEnd: string;
  totalTonnage: number;
  totalPlyoReps: number;
  totalIsometricTUT: number;
  totalFunctionalMinutes: number;
  totalAerobicMinutes: number;
  filteredCount: number;
  tonnageByCat: CategoryDatum[];
  plyoByCat: CategoryDatum[];
  isometricByCat: CategoryDatum[];
  functionalByCat: CategoryDatum[];
  aerobicByCat: CategoryDatum[];
  weeklySeries: { week: string; tonnage: number }[];
  totalRunningKm: number;
  totalRunningMinutes: number;
  weeklyRunningKmSeries: { week: string; km: number }[];
  kmByActivityType: { type: string; label: string; km: number }[];
  timeByActivityType: { type: string; label: string; minutes: number }[];
  hrZones: HrZoneDatum[];
  totalOverallMinutes: number;
  tonnageByMuscleGroup: MuscleGroupDatum[];
  thisWeekRunning: ThisWeekRunning;
  last12WeeksRunning: WeeklyRunningDatum[];
  showCycleForm: boolean;
  setShowCycleForm: (v: boolean) => void;
  cycleDraft: Cycle;
  setCycleDraft: (updater: (c: Cycle) => Cycle) => void;
  saveCycle: () => void;
  deleteCycle: (id: string) => void;
  readOnly?: boolean;
  // Coach-only: folds the athlete's Zdrowie tab in as a third sub-tab here
  // instead of it living as its own top-level destination — the athlete's
  // own Statystyki tab (Journal.tsx) leaves this off since Zdrowie already
  // has its own place in that navigation.
  showHealthSubTab?: boolean;
}) {
  const [subTab, setSubTab] = useState<StatsSubTab>("reports");

  return (
    <div>
      <SubTabBar
        tabs={[
          { id: "reports" as const, label: "Raporty", icon: <BarChart3 size={14} /> },
          { id: "analysis" as const, label: "Analiza", icon: <GitCompare size={14} /> },
          ...(showHealthSubTab ? [{ id: "health" as const, label: "Zdrowie", icon: <HeartPulse size={14} /> }] : []),
        ]}
        active={subTab}
        onChange={setSubTab}
      />

      {subTab === "analysis" && <AnalysisTab workouts={workouts} healthEntries={healthEntries} cycles={cycles} />}

      {subTab === "health" && showHealthSubTab && (
        <HealthTab
          readOnly
          healthEntries={healthEntries}
          editingId={null}
          draft={EMPTY_HEALTH_DRAFT}
          setDraft={noop}
          startEdit={noop}
          cancelEdit={noop}
          saveEntry={noop}
          deleteEntry={noop}
          saving={false}
          formError={null}
          confirmDeleteId={null}
          setConfirmDeleteId={noop}
        />
      )}

      {subTab === "reports" && (
        <ReportsTab
          readOnly={readOnly}
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
          filteredCount={filteredCount}
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
          showCycleForm={showCycleForm}
          setShowCycleForm={setShowCycleForm}
          cycleDraft={cycleDraft}
          setCycleDraft={setCycleDraft}
          saveCycle={saveCycle}
          deleteCycle={deleteCycle}
        />
      )}
    </div>
  );
}
