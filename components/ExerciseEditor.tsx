"use client";

import { Dumbbell, Timer, Zap, Activity, Hourglass, Trash2, X } from "lucide-react";
import {
  computeExerciseTonnage,
  computeIsometricTUT,
  computePlyoReps,
  computeSideBreakdown,
  fmtDurationShort,
} from "@/lib/calculations";
import { INK, INK_SOFT, ISO, KIND_COLOR, KIND_LABEL, LINE, MUSTARD, PLYO, inputStyle } from "@/lib/design";
import type { LeafExercise, LeafKind, Side } from "@/lib/types";
import { IconBtn } from "./atoms";

// The three set shapes (Strength/Plyo/Isometric) share fields loosely —
// this view type lets the JSX below read whichever fields apply to the
// exercise's own kind without fighting the sets' discriminated union.
type AnySet = { reps: string; weight: string; seconds: string; side: Side };

const KIND_ICON: Record<LeafKind, typeof Dumbbell> = {
  strength: Dumbbell,
  plyo: Zap,
  isometric: Hourglass,
  functional: Timer,
  aerobic: Activity,
};

export function ExerciseEditor({
  ex,
  onUpdate,
  onRemove,
  onToggleUnilateral,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: {
  ex: LeafExercise;
  onUpdate: (patch: Partial<LeafExercise>) => void;
  onRemove: () => void;
  onToggleUnilateral: () => void;
  onAddSet: () => void;
  onUpdateSet: (idx: number, field: string, value: string) => void;
  onRemoveSet: (idx: number) => void;
}) {
  return (
    <div className="rounded-md p-2.5 mb-2" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="px-1.5 py-0.5 rounded text-[10px] uppercase"
          style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", background: KIND_COLOR[ex.kind], color: "#fff" }}
        >
          {KIND_LABEL[ex.kind]}
        </span>
        <input
          placeholder="Nazwa ćwiczenia"
          value={ex.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 px-2 py-1.5 rounded text-sm"
          style={inputStyle}
          list="exercise-name-suggestions"
        />
        <IconBtn onClick={onRemove} color="#A6402F" title="Usuń">
          <Trash2 size={15} />
        </IconBtn>
      </div>

      {(ex.kind === "strength" || ex.kind === "plyo" || ex.kind === "isometric") && (
        <div>
          <button
            onClick={onToggleUnilateral}
            className="flex items-center gap-1 text-[11px] mb-2 px-2 py-0.5 rounded-full"
            style={{
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              border: `1px solid ${ex.unilateral ? MUSTARD : LINE}`,
              color: ex.unilateral ? MUSTARD : INK_SOFT,
            }}
          >
            {ex.unilateral ? "✓ " : ""}Jednonóż / jednorącz (osobno L / P)
          </button>

          {(ex.sets as unknown as AnySet[]).map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 mb-1">
              <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11, color: INK_SOFT, width: 14 }}>
                {i + 1}.
              </span>
              {ex.unilateral && (
                <div className="flex rounded overflow-hidden" style={{ border: `1px solid ${INK}` }}>
                  {(["L", "P"] as const).map((side) => (
                    <button
                      key={side}
                      onClick={() => onUpdateSet(i, "side", side)}
                      className="px-1.5 py-1 text-[11px]"
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono), monospace",
                        background: s.side === side ? INK : "transparent",
                        color: s.side === side ? "#fff" : INK,
                      }}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              )}
              {ex.kind === "isometric" ? (
                <>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="sek."
                    value={s.seconds}
                    onChange={(e) => onUpdateSet(i, "seconds", e.target.value)}
                    className="w-16 px-2 py-1 rounded text-sm"
                    style={inputStyle}
                  />
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11, color: INK_SOFT }}>s ×</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={s.weight}
                    onChange={(e) => onUpdateSet(i, "weight", e.target.value)}
                    className="w-20 px-2 py-1 rounded text-sm"
                    style={inputStyle}
                  />
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11, color: INK_SOFT }}>kg</span>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="powt."
                    value={s.reps}
                    onChange={(e) => onUpdateSet(i, "reps", e.target.value)}
                    className="w-16 px-2 py-1 rounded text-sm"
                    style={inputStyle}
                  />
                  {ex.kind === "strength" && (
                    <>
                      <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 12, color: INK_SOFT }}>×</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="kg"
                        value={s.weight}
                        onChange={(e) => onUpdateSet(i, "weight", e.target.value)}
                        className="w-20 px-2 py-1 rounded text-sm"
                        style={inputStyle}
                      />
                      <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11, color: INK_SOFT }}>kg</span>
                    </>
                  )}
                  {ex.kind === "plyo" && (
                    <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11, color: INK_SOFT }}>powt.</span>
                  )}
                </>
              )}
              <IconBtn onClick={() => onRemoveSet(i)} title="Usuń serię">
                <X size={13} />
              </IconBtn>
            </div>
          ))}
          <div className="flex gap-3 mt-1.5">
            <button onClick={onAddSet} className="text-xs" style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", color: MUSTARD }}>
              + seria (kopiuje poprzednią)
            </button>
          </div>
          <div
            className="text-xs mt-1.5"
            style={{
              fontFamily: "var(--font-ibm-plex-mono), monospace",
              color: ex.kind === "plyo" ? PLYO : ex.kind === "isometric" ? ISO : MUSTARD,
            }}
          >
            {ex.kind === "plyo" && `Objętość plyo: ${computePlyoReps(ex)} powt.`}
            {ex.kind === "isometric" && `TUT (czas pod napięciem): ${fmtDurationShort(computeIsometricTUT(ex))}`}
            {ex.kind === "strength" && `Tonaż: ${Math.round(computeExerciseTonnage(ex))} kg`}
            {ex.unilateral &&
              (() => {
                const b = computeSideBreakdown(ex);
                if (!b) return "";
                if (ex.kind === "isometric") return `  ·  L: ${fmtDurationShort(b.L)}  P: ${fmtDurationShort(b.P)}`;
                const unit = ex.kind === "plyo" ? "" : "kg";
                return `  ·  L: ${Math.round(b.L)}${unit}  P: ${Math.round(b.P)}${unit}`;
              })()}
          </div>
        </div>
      )}

      {(ex.kind === "functional" || ex.kind === "aerobic") && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="number"
            inputMode="numeric"
            placeholder="min"
            value={ex.minutes}
            onChange={(e) => onUpdate({ minutes: e.target.value })}
            className="w-20 px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 12, color: ex.kind === "aerobic" ? "#2F5D8C" : "#2F6F63" }}>
            minut ({ex.kind === "aerobic" ? "aerobowe" : "szacowany czas"})
          </span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="km"
            value={ex.distanceKm ?? ""}
            onChange={(e) => onUpdate({ distanceKm: e.target.value })}
            className="w-20 px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 12, color: INK_SOFT }}>
            km (opcjonalnie)
          </span>
        </div>
      )}
    </div>
  );
}

export function AddLeafButtons({ onAdd, className }: { onAdd: (kind: LeafKind) => void; className?: string }) {
  const kinds: LeafKind[] = ["strength", "plyo", "isometric", "functional", "aerobic"];
  return (
    <div className={className || "grid grid-cols-2 gap-2"}>
      {kinds.map((k) => {
        const Icon = KIND_ICON[k];
        return (
          <button
            key={k}
            onClick={() => onAdd(k)}
            className="flex items-center justify-center gap-1.5 py-2 rounded-md text-xs"
            style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", border: `1px dashed ${KIND_COLOR[k]}`, color: KIND_COLOR[k] }}
          >
            <Icon size={14} /> {KIND_LABEL[k]}
          </button>
        );
      })}
    </div>
  );
}
