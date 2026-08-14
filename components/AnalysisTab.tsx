"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDate, fmtPaceMinPerKm } from "@/lib/calculations";
import {
  computeStravaSummary,
  defaultSelection,
  healthMetrics,
  HEALTH_METRIC_LABELS,
  resolveSelectionWorkouts,
  stravaMetrics,
  STRAVA_METRIC_LABELS,
  summarizeSelection,
  trainingMetrics,
  TRAINING_METRIC_LABELS,
  type AnalysisSelection,
  type HealthSummary,
  type MetricRow,
  type StravaSummary,
  type TrainingSummary,
} from "@/lib/analysisCalculations";
import { AERO, CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, ISO, LINE, MUSTARD, PLYO, RUST, TEAL, inputStyle } from "@/lib/design";
import type { Cycle, HealthEntry, Workout } from "@/lib/types";
import { Chip } from "./atoms";
import { StravaSingleActivity } from "./StravaActivityCard";
import { STRAVA_ORANGE } from "./StravaConnect";

const SLOT_COLORS = [MUSTARD, TEAL, AERO, ISO, PLYO, RUST];

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

function MetricPicker({
  enabledTraining,
  toggleTraining,
  enabledHealth,
  toggleHealth,
}: {
  enabledTraining: Set<string>;
  toggleTraining: (label: string) => void;
  enabledHealth: Set<string>;
  toggleHealth: (label: string) => void;
}) {
  return (
    <div className="p-3 rounded-md mb-3" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, marginBottom: 6 }}>DANE TRENINGOWE W ZESTAWIENIU</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TRAINING_METRIC_LABELS.map((label) => (
          <Chip key={label} active={enabledTraining.has(label)} onClick={() => toggleTraining(label)}>
            {label}
          </Chip>
        ))}
        {STRAVA_METRIC_LABELS.map((label) => (
          <Chip key={label} active={enabledTraining.has(label)} onClick={() => toggleTraining(label)} color={STRAVA_ORANGE}>
            {label}
          </Chip>
        ))}
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, marginBottom: 6 }}>DANE ZDROWOTNE W ZESTAWIENIU</div>
      <div className="flex flex-wrap gap-1.5">
        {HEALTH_METRIC_LABELS.map((label) => (
          <Chip key={label} active={enabledHealth.has(label)} onClick={() => toggleHealth(label)} color={TEAL}>
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function SlotEditor({
  index,
  color,
  selection,
  setSelection,
  onRemove,
  workouts,
  cycles,
}: {
  index: number;
  color: string;
  selection: AnalysisSelection;
  setSelection: (updater: (s: AnalysisSelection) => AnalysisSelection) => void;
  onRemove: (() => void) | null;
  workouts: Workout[];
  cycles: Cycle[];
}) {
  const sortedWorkouts = useMemo(() => [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)), [workouts]);

  return (
    <div className="p-3 rounded-md mb-3" style={{ background: CARD, border: `1.5px solid ${color}` }}>
      <div className="flex items-center justify-between mb-2">
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color, fontWeight: 600 }}>ZESTAW {index + 1}</div>
        {onRemove && (
          <button onClick={onRemove} title="Usuń zestaw">
            <X size={15} color={INK_SOFT} />
          </button>
        )}
      </div>

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

function StravaDetailBlock({ summary, color }: { summary: StravaSummary; color: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 rounded-md" style={{ background: "#FFF5EE", border: `1.5px solid ${STRAVA_ORANGE}` }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-2.5">
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 12, color: STRAVA_ORANGE, fontWeight: 600 }}>
          AKTYWNOŚCI STRAVA ({summary.activities.length})
        </div>
        {open ? <ChevronUp size={15} color={STRAVA_ORANGE} /> : <ChevronDown size={15} color={STRAVA_ORANGE} />}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <StatMini label="Dystans" value={`${summary.distanceKm.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km`} />
            <StatMini label="Przewyższenie" value={`${Math.round(summary.elevationM)} m`} />
            {summary.avgHeartrate != null && <StatMini label="Śr. tętno" value={`${Math.round(summary.avgHeartrate)} bpm`} />}
            {summary.maxHeartrate != null && <StatMini label="Maks. tętno" value={`${Math.round(summary.maxHeartrate)} bpm`} />}
            {summary.avgRunningPaceMps > 0 && <StatMini label="Śr. tempo (bieg)" value={fmtPaceMinPerKm(summary.avgRunningPaceMps)} />}
          </div>

          {summary.kmByType.length > 1 && (
            <div className="mb-3">
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, marginBottom: 4 }}>KM WG AKTYWNOŚCI</div>
              {summary.kmByType.map((t) => (
                <div key={t.type} className="flex items-center justify-between" style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK }}>
                  <span>{t.label}</span>
                  <span>{t.km.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km</span>
                </div>
              ))}
            </div>
          )}

          {summary.hrZones.length > 0 && (
            <div className="mb-3 space-y-1">
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, marginBottom: 2 }}>STREFY TĘTNA</div>
              {summary.hrZones.map((z) => (
                <div key={z.zone} className="flex items-center gap-2">
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, width: 90 }}>
                    Strefa {z.zone} · {z.min}-{z.max === -1 ? "∞" : z.max}
                  </div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
                    <div style={{ width: `${z.pct}%`, background: color, height: "100%" }} />
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, width: 36, textAlign: "right" }}>
                    {Math.round(z.pct)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, marginBottom: 4 }}>AKTYWNOŚCI</div>
          {summary.activities.map((a) => (
            <StravaSingleActivity key={a.id} activity={a} onDetach={() => {}} readOnly />
          ))}
        </div>
      )}
    </div>
  );
}

interface ComparisonEntry<T> {
  index: number;
  color: string;
  label: string;
  summary: T;
}

// One horizontal bar chart per metric row — a bar per zestaw, colored to
// match that zestaw's slot color — so the comparison isn't just a table of
// numbers but a quick visual read too.
function MetricChart({
  label,
  entries,
  rows,
}: {
  label: string;
  entries: { label: string; color: string }[];
  rows: MetricRow[];
}) {
  const data = entries.map((e, i) => ({ name: e.label, value: rows[i].value, color: e.color }));
  if (data.every((d) => d.value === 0)) return null;
  const fmt = rows[0].format;

  return (
    <div className="mb-3">
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, marginBottom: 2 }}>{label}</div>
      <ResponsiveContainer width="100%" height={Math.max(46, entries.length * 26)}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 20, top: 2, bottom: 2 }}>
          <CartesianGrid stroke={LINE} horizontal={false} />
          <XAxis type="number" tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
          <YAxis type="category" dataKey="name" width={88} tick={{ fontFamily: FONT_MONO, fontSize: 10, fill: INK }} />
          <Tooltip contentStyle={{ fontFamily: FONT_MONO, fontSize: 11 }} formatter={(v) => [fmt(Number(v)), label]} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Strava-sourced rows (distance, elevation, HR, pace) render as a line
// chart instead of bars — one dot per zestaw, colored to match its slot,
// joined by a line.
function MetricLineChart({
  label,
  entries,
  rows,
}: {
  label: string;
  entries: { label: string; color: string }[];
  rows: MetricRow[];
}) {
  const data = entries.map((e, i) => ({ name: e.label, value: rows[i].value, color: e.color }));
  if (data.every((d) => d.value === 0)) return null;
  const fmt = rows[0].format;

  return (
    <div className="mb-3">
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, marginBottom: 2 }}>{label}</div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data} margin={{ left: -10, right: 16, top: 8, bottom: 4 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="name" interval={0} tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
          <YAxis width={40} tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
          <Tooltip contentStyle={{ fontFamily: FONT_MONO, fontSize: 11 }} formatter={(v) => [fmt(Number(v)), label]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={STRAVA_ORANGE}
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const i = props.index ?? 0;
              return <circle key={i} cx={props.cx} cy={props.cy} r={5} fill={data[i].color} stroke={INK} strokeWidth={1.5} />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonTable<T>({
  title,
  entries,
  metricsFn,
  enabledLabels,
}: {
  title: string;
  entries: ComparisonEntry<T>[];
  metricsFn: (s: T) => MetricRow[];
  enabledLabels: Set<string>;
}) {
  if (entries.length === 0) return null;
  const rowsPerEntry = entries.map((e) => metricsFn(e.summary).filter((r) => enabledLabels.has(r.label)));
  const labels = rowsPerEntry[0]?.map((r) => r.label) ?? [];

  return (
    <div className="mb-5">
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, marginBottom: 6 }}>{title}</div>
      {labels.length === 0 ? (
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>
          Brak zaznaczonych danych do pokazania — wybierz dane powyżej.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto mb-3">
            <table className="w-full" style={{ fontFamily: FONT_MONO, fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                  <th className="text-left py-1.5" />
                  {entries.map((e) => (
                    <th key={e.index} className="text-right py-1.5 px-2" style={{ color: e.color, fontWeight: 600 }}>
                      {e.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labels.map((label, li) => (
                  <tr key={label} style={{ borderBottom: `1px solid ${LINE}` }}>
                    <td className="py-1.5" style={{ color: INK_SOFT }}>
                      {label}
                    </td>
                    {rowsPerEntry.map((rows, ei) => (
                      <td key={ei} className="text-right py-1.5 px-2" style={{ color: INK }}>
                        {rows[li].format(rows[li].value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {labels.map((label, li) => {
            const rows = rowsPerEntry.map((r) => r[li]);
            return STRAVA_METRIC_LABELS.includes(label) ? (
              <MetricLineChart key={label} label={label} entries={entries} rows={rows} />
            ) : (
              <MetricChart key={label} label={label} entries={entries} rows={rows} />
            );
          })}
        </>
      )}
    </div>
  );
}

interface TrainingWithStrava {
  training: TrainingSummary;
  strava: StravaSummary | null;
}
function combinedTrainingMetrics(t: TrainingWithStrava): MetricRow[] {
  return [...trainingMetrics(t.training), ...(t.strava ? stravaMetrics(t.strava) : [])];
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
  const [selections, setSelections] = useState<AnalysisSelection[]>([defaultSelection("training"), defaultSelection("training")]);
  const [enabledTraining, setEnabledTraining] = useState<Set<string>>(() => new Set([...TRAINING_METRIC_LABELS, ...STRAVA_METRIC_LABELS]));
  const [enabledHealth, setEnabledHealth] = useState<Set<string>>(() => new Set(HEALTH_METRIC_LABELS));

  function updateSelection(i: number, updater: (s: AnalysisSelection) => AnalysisSelection) {
    setSelections((prev) => prev.map((s, idx) => (idx === i ? updater(s) : s)));
  }
  function addSlot() {
    setSelections((prev) => [...prev, defaultSelection("training")]);
  }
  function removeSlot(i: number) {
    setSelections((prev) => prev.filter((_, idx) => idx !== i));
  }
  function toggleTraining(label: string) {
    setEnabledTraining((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }
  function toggleHealth(label: string) {
    setEnabledHealth((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const summaries = useMemo(
    () => selections.map((sel) => summarizeSelection(sel, workouts, healthEntries, cycles)),
    [selections, workouts, healthEntries, cycles]
  );
  const stravaSummaries = useMemo(
    () =>
      selections.map((sel) => {
        const inRange = resolveSelectionWorkouts(sel, workouts, cycles);
        return inRange ? computeStravaSummary(inRange) : null;
      }),
    [selections, workouts, cycles]
  );

  const trainingEntries: ComparisonEntry<TrainingWithStrava>[] = summaries
    .map((summary, index) =>
      summary?.kind === "training"
        ? {
            index,
            color: SLOT_COLORS[index % SLOT_COLORS.length],
            label: summary.label,
            summary: { training: summary as TrainingSummary, strava: stravaSummaries[index] },
          }
        : null
    )
    .filter((e): e is ComparisonEntry<TrainingWithStrava> => e != null);
  const healthResultEntries: ComparisonEntry<HealthSummary>[] = summaries
    .map((summary, index) =>
      summary?.kind === "health" ? { index, color: SLOT_COLORS[index % SLOT_COLORS.length], label: summary.label, summary } : null
    )
    .filter((e): e is ComparisonEntry<HealthSummary> => e != null);
  const emptyEntries = selections
    .map((_, index) => ({ index, color: SLOT_COLORS[index % SLOT_COLORS.length] }))
    .filter((e) => !summaries[e.index]);

  return (
    <div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, marginBottom: 10 }}>
        Dodaj dowolną liczbę zestawów danych do zestawienia — porównanie jest jednorazowe i nigdzie nie jest zapisywane.
      </div>

      <MetricPicker enabledTraining={enabledTraining} toggleTraining={toggleTraining} enabledHealth={enabledHealth} toggleHealth={toggleHealth} />

      {selections.map((selection, i) => {
        const strava = stravaSummaries[i];
        const color = SLOT_COLORS[i % SLOT_COLORS.length];
        return (
          <div key={i}>
            <SlotEditor
              index={i}
              color={color}
              selection={selection}
              setSelection={(updater) => updateSelection(i, updater)}
              onRemove={selections.length > 1 ? () => removeSlot(i) : null}
              workouts={workouts}
              cycles={cycles}
            />
            {strava && <StravaDetailBlock summary={strava} color={color} />}
          </div>
        );
      })}

      <button
        onClick={addSlot}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm mb-4"
        style={{ fontFamily: FONT_MONO, border: `1px dashed ${INK}`, color: INK }}
      >
        <Plus size={14} /> Dodaj zestaw
      </button>

      <div className="pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600, marginBottom: 10 }}>
          ZESTAWIENIE
        </div>

        {emptyEntries.length > 0 && (
          <div className="mb-3">
            {emptyEntries.map((e) => (
              <div key={e.index} style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>
                Zestaw {e.index + 1}: brak danych dla wybranego zakresu.
              </div>
            ))}
          </div>
        )}

        {trainingEntries.length > 0 && (
          <ComparisonTable title="TRENING" entries={trainingEntries} metricsFn={combinedTrainingMetrics} enabledLabels={enabledTraining} />
        )}
        {healthResultEntries.length > 0 && (
          <ComparisonTable title="ZDROWIE" entries={healthResultEntries} metricsFn={healthMetrics} enabledLabels={enabledHealth} />
        )}
      </div>
    </div>
  );
}
