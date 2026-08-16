"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Minus } from "lucide-react";
import {
  computeWorkoutAerobicMinutes,
  computeWorkoutFunctionalMinutes,
  computeWorkoutIsometricTUT,
  computeWorkoutPlyoReps,
  computeWorkoutTonnage,
  fmtDurationShort,
  fmtShort,
} from "@/lib/calculations";
import {
  computeWorkoutStravaAvgSpeedMps,
  computeWorkoutStravaDistanceM,
  computeWorkoutStravaMovingTimeS,
  isCyclingActivityType,
  isSwimmingActivityType,
} from "@/lib/stravaCalculations";
import { AERO, CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, ISO, LINE, PLAN_DONE, PLYO, RUST, TEAL } from "@/lib/design";
import type { HealthEntry, Workout } from "@/lib/types";
import { StravaCollapsedSummary, StravaSingleActivity } from "./StravaActivityCard";
import { WorkoutExerciseSummary } from "./WorkoutExerciseSummary";

const noop = () => {};

// green = risen since the previous measurement, red = dropped, gray dash =
// unchanged or there's no previous measurement to compare against.
function TrendArrow({ current, previous }: { current: number; previous: number | null }) {
  if (previous == null || current === previous) return <Minus size={13} color={INK_SOFT} />;
  return current > previous ? <ArrowUp size={13} color={PLAN_DONE} /> : <ArrowDown size={13} color={RUST} />;
}

function MetricCell({
  label,
  value,
  unit,
  current,
  previous,
  onClick,
}: {
  label: string;
  value: string;
  unit: string;
  current: number;
  previous: number | null;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-1 px-2 py-2.5" title="Przejdź do zakładki Zdrowie">
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div className="flex items-center gap-1.5">
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: INK }}>{value}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>{unit}</span>
        <TrendArrow current={current} previous={previous} />
      </div>
    </button>
  );
}

// The "ostatni trening" row of the quick profile, expandable in place —
// a read-only, self-contained trim of LogTab's WorkoutCard (no drag/edit/
// merge, since this is just a glance, not the Dziennik itself).
function LastWorkoutPreview({ workout }: { workout: Workout }) {
  const [expanded, setExpanded] = useState(false);
  const tonnage = computeWorkoutTonnage(workout);
  const plyoReps = computeWorkoutPlyoReps(workout);
  const isometricTUT = computeWorkoutIsometricTUT(workout);
  const functionalMin = computeWorkoutFunctionalMinutes(workout);
  const aerobicMin = computeWorkoutAerobicMinutes(workout);
  const hasStrava = (workout.stravaActivities?.length ?? 0) > 0;
  const allCycling = hasStrava && workout.stravaActivities!.every((a) => isCyclingActivityType(a.type));
  const allSwimming = hasStrava && workout.stravaActivities!.every((a) => isSwimmingActivityType(a.type));

  return (
    <div>
      <button className="w-full px-4 py-2.5 flex items-center justify-between gap-2" onClick={() => setExpanded((e) => !e)}>
        <div className="text-left">
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Ostatni trening
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK, fontWeight: 600 }}>
            {fmtShort(workout.date)} · {workout.category}
            {workout.name ? ` — ${workout.name}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasStrava ? (
            <StravaCollapsedSummary
              distanceM={computeWorkoutStravaDistanceM(workout)}
              movingTimeS={computeWorkoutStravaMovingTimeS(workout)}
              avgSpeedMps={computeWorkoutStravaAvgSpeedMps(workout)}
              mode={allCycling ? "speed" : allSwimming ? "pace100m" : "pace"}
            />
          ) : (
            <div className="text-right" style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK }}>
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
        <div className="px-4 pb-3 pt-1" style={{ borderTop: `1px dashed ${LINE}` }}>
          {workout.notes && <div className="text-xs mb-2 italic" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>{workout.notes}</div>}
          {hasStrava &&
            workout.stravaActivities!.map((a) => <StravaSingleActivity key={a.id} activity={a} onDetach={noop} readOnly />)}
          {workout.exercises.length > 0 && <WorkoutExerciseSummary exercises={workout.exercises} />}
        </div>
      )}
    </div>
  );
}

// A quick-glance profile strip shown under the coach's home-panel title:
// the athlete's most recent HRV and self-reported wellbeing (each with a
// trend arrow vs. their previous measurement) plus their last logged
// workout, expandable in place for a full read-only preview — everything
// a coach checks first, before opening any tab.
export function AthleteProfileCard({
  latestHealth,
  previousHealth,
  lastWorkout,
  onOpenZdrowie,
}: {
  latestHealth: HealthEntry | null;
  previousHealth: HealthEntry | null;
  lastWorkout: Workout | null;
  onOpenZdrowie: () => void;
}) {
  if (!latestHealth && !lastWorkout) return null;

  return (
    <div className="rounded-2xl mb-6 overflow-hidden" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      {latestHealth && (
        <div className="flex" style={{ borderBottom: lastWorkout ? `1px solid ${LINE}` : undefined }}>
          <MetricCell
            label="HRV"
            value={String(latestHealth.hrv)}
            unit="ms"
            current={latestHealth.hrv}
            previous={previousHealth?.hrv ?? null}
            onClick={onOpenZdrowie}
          />
          <div style={{ width: 1, background: LINE }} />
          <MetricCell
            label="Samopoczucie"
            value={String(latestHealth.wellbeing)}
            unit="/10"
            current={latestHealth.wellbeing}
            previous={previousHealth?.wellbeing ?? null}
            onClick={onOpenZdrowie}
          />
        </div>
      )}
      {lastWorkout && <LastWorkoutPreview workout={lastWorkout} />}
    </div>
  );
}
