"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { fmtDate } from "@/lib/calculations";
import {
  defaultSelection,
  healthMetrics,
  summarizeSelection,
  trainingMetrics,
  type AnalysisSelection,
  type AnalysisSummary,
} from "@/lib/analysisCalculations";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, MUSTARD, TEAL, inputStyle } from "@/lib/design";
import type { Cycle, HealthEntry, Workout } from "@/lib/types";
import { Chip } from "./atoms";

function SlotEditor({
  label,
  color,
  selection,
  setSelection,
  workouts,
  cycles,
}: {
  label: string;
  color: string;
  selection: AnalysisSelection;
  setSelection: (updater: (s: AnalysisSelection) => AnalysisSelection) => void;
  workouts: Workout[];
  cycles: Cycle[];
}) {
  const sortedWorkouts = useMemo(() => [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)), [workouts]);

  return (
    <div className="p-3 rounded-md mb-3" style={{ background: CARD, border: `1.5px solid ${color}` }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color, fontWeight: 600, marginBottom: 8 }}>{label}</div>

      <div className="flex gap-1.5 mb-2">
        <Chip active={selection.domain === "training"} onClick={() => setSelection((s) => ({ ...s, domain: "training" }))}>
          Trening
        </Chip>
        <Chip active={selection.domain === "health"} onClick={() => setSelection((s) => ({ ...s, domain: "health" }))} color={TEAL}>
          Zdrowie
        </Chip>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Chip active={selection.mode === "single"} onClick={() => setSelection((s) => ({ ...s, mode: "single" }))}>
          {selection.domain === "training" ? "Pojedynczy trening" : "Pojedynczy dzień"}
        </Chip>
        <Chip active={selection.mode === "cycle"} onClick={() => setSelection((s) => ({ ...s, mode: "cycle" }))} color={TEAL}>
          Cykl
        </Chip>
        <Chip active={selection.mode === "week"} onClick={() => setSelection((s) => ({ ...s, mode: "week" }))}>
          Tydzień
        </Chip>
        <Chip active={selection.mode === "range"} onClick={() => setSelection((s) => ({ ...s, mode: "range" }))}>
          Zakres dat
        </Chip>
      </div>

      {selection.mode === "single" && selection.domain === "training" && (
        <select
          value={selection.workoutId ?? ""}
          onChange={(e) => setSelection((s) => ({ ...s, workoutId: e.target.value || null }))}
          className="w-full px-2 py-1.5 rounded text-sm"
          style={inputStyle}
        >
          <option value="">— wybierz trening —</option>
          {sortedWorkouts.map((w) => (
            <option key={w.id} value={w.id}>
              {fmtDate(w.date)} — {w.name || w.category}
            </option>
          ))}
        </select>
      )}

      {selection.mode === "single" && selection.domain === "health" && (
        <input
          type="date"
          value={selection.date}
          onChange={(e) => setSelection((s) => ({ ...s, date: e.target.value }))}
          className="px-2 py-1 rounded text-sm"
          style={inputStyle}
        />
      )}

      {selection.mode === "cycle" &&
        (cycles.length === 0 ? (
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>Brak zdefiniowanych cykli.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {cycles.map((c) => (
              <Chip key={c.id} active={selection.cycleId === c.id} onClick={() => setSelection((s) => ({ ...s, cycleId: c.id }))} color={TEAL}>
                {c.name}
              </Chip>
            ))}
          </div>
        ))}

      {selection.mode === "week" && (
        <input
          type="date"
          value={selection.date}
          onChange={(e) => setSelection((s) => ({ ...s, date: e.target.value }))}
          className="px-2 py-1 rounded text-sm"
          style={inputStyle}
        />
      )}

      {selection.mode === "range" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selection.rangeStart}
            onChange={(e) => setSelection((s) => ({ ...s, rangeStart: e.target.value }))}
            className="px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
          <span style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>—</span>
          <input
            type="date"
            value={selection.rangeEnd}
            onChange={(e) => setSelection((s) => ({ ...s, rangeEnd: e.target.value }))}
            className="px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: INK, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function SummaryCard({ summary, color }: { summary: AnalysisSummary; color: string }) {
  const rows = summary.kind === "training" ? trainingMetrics(summary) : healthMetrics(summary);
  return (
    <div className="p-3 rounded-md" style={{ background: CARD, border: `1.5px solid ${color}` }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color, fontWeight: 600, marginBottom: 8 }}>{summary.label}</div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <StatMini key={r.label} label={r.label} value={r.format(r.value)} />
        ))}
      </div>
    </div>
  );
}

function ComparisonTable({ a, b }: { a: AnalysisSummary; b: AnalysisSummary }) {
  const rowsA = a.kind === "training" ? trainingMetrics(a) : healthMetrics(a);
  const rowsB = b.kind === "training" ? trainingMetrics(b) : healthMetrics(b);
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ fontFamily: FONT_MONO, fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${LINE}` }}>
            <th className="text-left py-1.5" />
            <th className="text-right py-1.5" style={{ color: MUSTARD, fontWeight: 600 }}>
              {a.label}
            </th>
            <th className="text-right py-1.5" style={{ color: TEAL, fontWeight: 600 }}>
              {b.label}
            </th>
          </tr>
        </thead>
        <tbody>
          {rowsA.map((rA, i) => (
            <tr key={rA.label} style={{ borderBottom: `1px solid ${LINE}` }}>
              <td className="py-1.5" style={{ color: INK_SOFT }}>
                {rA.label}
              </td>
              <td className="text-right py-1.5" style={{ color: INK }}>
                {rA.format(rA.value)}
              </td>
              <td className="text-right py-1.5" style={{ color: INK }}>
                {rowsB[i].format(rowsB[i].value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalysisTab({
  workouts,
  healthEntries,
  cycles,
}: {
  workouts: Workout[];
  healthEntries: HealthEntry[];
  cycles: Cycle[];
}) {
  const [selectionA, setSelectionA] = useState<AnalysisSelection>(() => defaultSelection("training"));
  const [selectionB, setSelectionB] = useState<AnalysisSelection>(() => defaultSelection("training"));

  const summaryA = useMemo(() => summarizeSelection(selectionA, workouts, healthEntries, cycles), [selectionA, workouts, healthEntries, cycles]);
  const summaryB = useMemo(() => summarizeSelection(selectionB, workouts, healthEntries, cycles), [selectionB, workouts, healthEntries, cycles]);

  return (
    <div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, marginBottom: 10 }}>
        Wybierz dwa zestawy danych do zestawienia — porównanie jest jednorazowe i nigdzie nie jest zapisywane.
      </div>

      <SlotEditor label="ZESTAW A" color={MUSTARD} selection={selectionA} setSelection={setSelectionA} workouts={workouts} cycles={cycles} />
      <div className="flex justify-center mb-1" style={{ color: INK_SOFT }}>
        <ArrowLeftRight size={16} />
      </div>
      <SlotEditor label="ZESTAW B" color={TEAL} selection={selectionB} setSelection={setSelectionB} workouts={workouts} cycles={cycles} />

      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600, marginBottom: 10 }}>
          ZESTAWIENIE
        </div>

        {summaryA && summaryB && summaryA.kind === summaryB.kind ? (
          <ComparisonTable a={summaryA} b={summaryB} />
        ) : (
          <div className="flex flex-col gap-3">
            {summaryA ? (
              <SummaryCard summary={summaryA} color={MUSTARD} />
            ) : (
              <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>Zestaw A: brak danych dla wybranego zakresu.</div>
            )}
            {summaryB ? (
              <SummaryCard summary={summaryB} color={TEAL} />
            ) : (
              <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>Zestaw B: brak danych dla wybranego zakresu.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
