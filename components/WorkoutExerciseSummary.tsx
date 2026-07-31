"use client";

import { Activity, Dumbbell, Hourglass, Repeat2, Timer, Zap } from "lucide-react";
import {
  computeExerciseTonnage,
  computeIsometricLoad,
  computePlyoReps,
  computeSideBreakdown,
} from "@/lib/calculations";
import {
  CARD,
  FONT_MONO,
  INK,
  INK_SOFT,
  ISO,
  KIND_COLOR,
  LINE,
  MUSTARD,
  PLYO,
  RUST,
  TEAL,
  AERO,
} from "@/lib/design";
import type { Circuit, LeafExercise, LeafKind, WorkoutExercise } from "@/lib/types";

const KIND_ICON: Record<LeafKind, typeof Dumbbell> = {
  strength: Dumbbell,
  plyo: Zap,
  isometric: Hourglass,
  functional: Timer,
  aerobic: Activity,
};

function setPills(ex: LeafExercise) {
  if (ex.kind === "strength")
    return ex.sets.map((s) => `${s.reps}×${s.weight}kg${ex.unilateral ? ` ${s.side}` : ""}`);
  if (ex.kind === "plyo") return ex.sets.map((s) => `${s.reps}p${ex.unilateral ? ` ${s.side}` : ""}`);
  if (ex.kind === "isometric")
    return ex.sets.map((s) => `${s.seconds}s×${s.weight}kg${ex.unilateral ? ` ${s.side}` : ""}`);
  return [];
}

function metricLine(ex: LeafExercise): { text: string; color: string } | null {
  if (ex.kind === "strength") return { text: `${Math.round(computeExerciseTonnage(ex))} kg`, color: MUSTARD };
  if (ex.kind === "plyo") return { text: `${computePlyoReps(ex)} powt.`, color: PLYO };
  if (ex.kind === "isometric") return { text: `${Math.round(computeIsometricLoad(ex))} kg·s`, color: ISO };
  if (ex.kind === "functional")
    return { text: `${ex.minutes} min${ex.distanceKm ? ` · ${ex.distanceKm} km` : ""}`, color: TEAL };
  if (ex.kind === "aerobic")
    return { text: `${ex.minutes} min${ex.distanceKm ? ` · ${ex.distanceKm} km` : ""}`, color: AERO };
  return null;
}

function LeafRow({ ex }: { ex: LeafExercise }) {
  const Icon = KIND_ICON[ex.kind];
  const pills = setPills(ex);
  const metric = metricLine(ex);
  const sideBreakdown = computeSideBreakdown(ex);

  return (
    <div className="py-1.5 border-b last:border-b-0" style={{ borderColor: LINE }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={13} color={KIND_COLOR[ex.kind]} className="shrink-0" />
          <span
            className="font-semibold truncate"
            style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: INK }}
            title={ex.name}
          >
            {ex.name}
          </span>
        </div>
        {metric && (
          <span className="whitespace-nowrap" style={{ fontFamily: FONT_MONO, fontSize: 11, color: metric.color, fontWeight: 600 }}>
            {metric.text}
          </span>
        )}
      </div>

      {pills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 pl-[19px]">
          {pills.map((p, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 rounded"
              style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, background: "#fff", border: `1px solid ${LINE}` }}
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {sideBreakdown && (
        <div className="pl-[19px] mt-0.5" style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>
          L: {Math.round(sideBreakdown.L)} · P: {Math.round(sideBreakdown.P)}
        </div>
      )}
    </div>
  );
}

function CircuitBlock({ circuit }: { circuit: Circuit }) {
  return (
    <div className="rounded-md p-2 mb-1.5" style={{ background: "#FBF6EC", border: `1.5px dashed ${RUST}` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Repeat2 size={13} color={RUST} />
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: RUST, fontWeight: 600 }}>
          {circuit.name || "Obwód"} × {circuit.rounds}
        </span>
      </div>
      <div className="pl-2">
        {circuit.elements.map((el) => (
          <LeafRow key={el.id} ex={el} />
        ))}
      </div>
    </div>
  );
}

export function WorkoutExerciseSummary({ exercises }: { exercises: WorkoutExercise[] }) {
  if (exercises.length === 0) return null;
  return (
    <div className="rounded-md px-2.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      {exercises.map((ex) =>
        ex.kind === "circuit" ? (
          <div key={ex.id} className="py-1.5">
            <CircuitBlock circuit={ex} />
          </div>
        ) : (
          <LeafRow key={ex.id} ex={ex} />
        )
      )}
    </div>
  );
}
