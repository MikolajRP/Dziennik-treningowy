"use client";

import type { HTMLAttributes } from "react";
import { GripVertical, Repeat2, Trash2 } from "lucide-react";
import {
  circuitAerobicMinutes,
  circuitFunctionalMinutes,
  circuitIsometricTUT,
  circuitMultiplier,
  circuitPlyoReps,
  circuitTonnage,
  fmtDurationShort,
} from "@/lib/calculations";
import { AERO, FONT_MONO, INK_SOFT, ISO, MUSTARD, PLYO, RUST, TEAL, inputStyle } from "@/lib/design";
import type { Circuit, LeafExercise, LeafKind } from "@/lib/types";
import { IconBtn } from "./atoms";
import { AddLeafButtons, ExerciseEditor } from "./ExerciseEditor";

export interface CircuitElementHandlers {
  add: (kind: LeafKind) => void;
  update: (elId: string, patch: Partial<LeafExercise>) => void;
  remove: (elId: string) => void;
  toggleUnilateral: (elId: string) => void;
  addSet: (elId: string) => void;
  updateSet: (elId: string, idx: number, field: string, value: string) => void;
  removeSet: (elId: string, idx: number) => void;
}

export function CircuitEditor({
  circuit,
  onUpdateCircuit,
  onRemoveCircuit,
  elementHandlers,
  knownExerciseNames = [],
  dragHandleProps,
}: {
  circuit: Circuit;
  onUpdateCircuit: (patch: Partial<Circuit>) => void;
  onRemoveCircuit: () => void;
  elementHandlers: CircuitElementHandlers;
  knownExerciseNames?: string[];
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div className="rounded-md p-2.5 mb-2" style={{ background: "#FBF6EC", border: `2px dashed ${RUST}` }}>
      <div className="flex items-center gap-2 mb-2">
        {dragHandleProps && (
          <div {...dragHandleProps} className="shrink-0" style={{ cursor: "grab", touchAction: "none" }} title="Przytrzymaj, żeby zmienić kolejność">
            <GripVertical size={15} color={RUST} />
          </div>
        )}
        <Repeat2 size={16} color={RUST} />
        <input
          placeholder="Nazwa obwodu (opcjonalnie)"
          value={circuit.name}
          onChange={(e) => onUpdateCircuit({ name: e.target.value })}
          className="flex-1 px-2 py-1.5 rounded text-sm"
          style={inputStyle}
        />
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>rundy</span>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={circuit.rounds}
          onChange={(e) => onUpdateCircuit({ rounds: e.target.value })}
          className="w-14 px-2 py-1 rounded text-sm"
          style={inputStyle}
        />
        <IconBtn onClick={onRemoveCircuit} color={RUST} title="Usuń obwód">
          <Trash2 size={15} />
        </IconBtn>
      </div>

      <div className="pl-2 border-l-2" style={{ borderColor: RUST }}>
        {circuit.elements.map((el) => (
          <ExerciseEditor
            key={el.id}
            ex={el}
            onUpdate={(patch) => elementHandlers.update(el.id, patch)}
            onRemove={() => elementHandlers.remove(el.id)}
            onToggleUnilateral={() => elementHandlers.toggleUnilateral(el.id)}
            onAddSet={() => elementHandlers.addSet(el.id)}
            onUpdateSet={(idx, field, value) => elementHandlers.updateSet(el.id, idx, field, value)}
            onRemoveSet={(idx) => elementHandlers.removeSet(el.id, idx)}
            knownExerciseNames={knownExerciseNames}
          />
        ))}
        {circuit.elements.length === 0 && (
          <div className="text-[11px] mb-2" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
            Dodaj ćwiczenia wykonywane w tym obwodzie.
          </div>
        )}
        <AddLeafButtons onAdd={elementHandlers.add} className="grid grid-cols-2 gap-1.5 mb-1" />
      </div>

      <div className="text-xs mt-2 pl-2" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Razem (×{circuitMultiplier(circuit)} rundy):
        {circuitTonnage(circuit) > 0 && <span style={{ color: MUSTARD }}> {Math.round(circuitTonnage(circuit))} kg</span>}
        {circuitPlyoReps(circuit) > 0 && <span style={{ color: PLYO }}> · {circuitPlyoReps(circuit)} powt. plyo</span>}
        {circuitIsometricTUT(circuit) > 0 && <span style={{ color: ISO }}> · TUT {fmtDurationShort(circuitIsometricTUT(circuit))} izo</span>}
        {circuitFunctionalMinutes(circuit) > 0 && <span style={{ color: TEAL }}> · {circuitFunctionalMinutes(circuit)} min funkc.</span>}
        {circuitAerobicMinutes(circuit) > 0 && <span style={{ color: AERO }}> · {circuitAerobicMinutes(circuit)} min aerob.</span>}
      </div>
    </div>
  );
}
