"use client";

import { useMemo, useState } from "react";
import { History, Pencil, Trash2, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDate, fmtHoursMinutes, todayISO } from "@/lib/calculations";
import { healthSeriesForLastDays, type HealthSeriesPoint } from "@/lib/healthCalculations";
import { CARD, FONT_DISPLAY, FONT_MONO, HEALTH, INK, INK_SOFT, ISO, LINE as LINE_COLOR, MUSTARD, RUST, TEAL } from "@/lib/design";
import type { HealthEntry } from "@/lib/types";
import { Chip, IconBtn, SubTabBar } from "./atoms";
import { HealthEntryForm, type HealthDraft } from "./HealthEntryForm";

type HealthSubTab = "stats" | "history";

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function TrendChart({
  data,
  dataKey,
  label,
  color,
  unit,
  digits = 0,
  formatValue,
}: {
  data: HealthSeriesPoint[];
  dataKey: keyof HealthSeriesPoint;
  label: string;
  color: string;
  unit: string;
  digits?: number;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) return null;
  const last = data[data.length - 1][dataKey] as number;
  const fmt = formatValue ?? ((v: number) => `${v.toLocaleString("pl-PL", { maximumFractionDigits: digits })}${unit}`);
  return (
    <div className="mb-4 p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE_COLOR}` }}>
      <div className="flex items-center justify-between mb-2">
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>{label}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color, fontWeight: 600 }}>{fmt(last)}</div>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data} margin={{ left: -20, right: 8, top: 4 }}>
          <CartesianGrid stroke={LINE_COLOR} vertical={false} />
          <XAxis dataKey="tickLabel" tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }}
            width={34}
            domain={["auto", "auto"]}
            tickFormatter={(v) => fmt(Number(v))}
          />
          <Tooltip
            contentStyle={{ fontFamily: FONT_MONO, fontSize: 12 }}
            labelFormatter={(_, payload) => {
              const d = payload?.[0]?.payload as HealthSeriesPoint | undefined;
              return d ? fmtDate(d.date) : "";
            }}
            formatter={(v) => [fmt(Number(v)), label]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ fill: color, r: 2.5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HealthHistoryCard({
  entry,
  readOnly,
  onEdit,
  onDelete,
  confirmDeleteId,
  setConfirmDeleteId,
}: {
  entry: HealthEntry;
  readOnly: boolean;
  onEdit: (entry: HealthEntry) => void;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
}) {
  return (
    <div className="p-3 rounded-md mb-2" style={{ background: CARD, border: `1px solid ${LINE_COLOR}`, borderLeft: `3px solid ${HEALTH}` }}>
      <div className="flex items-center justify-between mb-2">
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600 }}>{fmtDate(entry.date)}</div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <IconBtn onClick={() => onEdit(entry)} title="Edytuj">
              <Pencil size={14} />
            </IconBtn>
            {confirmDeleteId === entry.id ? (
              <button
                onClick={() => onDelete(entry.id)}
                className="text-xs px-2 py-1 rounded"
                style={{ fontFamily: FONT_MONO, background: RUST, color: "#fff" }}
              >
                Na pewno usunąć?
              </button>
            ) : (
              <IconBtn onClick={() => setConfirmDeleteId(entry.id)} title="Usuń" color={RUST}>
                <Trash2 size={14} />
              </IconBtn>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <StatMini label="Sen" value={fmtHoursMinutes(entry.sleepHours)} />
        <StatMini label="Ocena snu" value={`${entry.sleepQuality}/100`} />
        <StatMini label="HRV" value={`${entry.hrv} ms`} />
        <StatMini label="Tętno spocz." value={`${entry.restingHr} bpm`} />
        <StatMini label="Masa" value={`${entry.weightKg} kg`} />
        <StatMini label="Samopoczucie" value={`${entry.wellbeing}/10`} />
      </div>
      {entry.notes && (
        <div className="mt-2 text-xs" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
          {entry.notes}
        </div>
      )}
    </div>
  );
}

export function HealthTab({
  healthEntries,
  readOnly = false,
  editingId,
  draft,
  setDraft,
  startEdit,
  cancelEdit,
  saveEntry,
  deleteEntry,
  saving,
  formError,
  confirmDeleteId,
  setConfirmDeleteId,
}: {
  healthEntries: HealthEntry[];
  readOnly?: boolean;
  editingId: string | null;
  draft: HealthDraft;
  setDraft: (updater: (d: HealthDraft) => HealthDraft) => void;
  startEdit: (entry: HealthEntry) => void;
  cancelEdit: () => void;
  saveEntry: () => void;
  deleteEntry: (id: string) => void;
  saving: boolean;
  formError: string | null;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
}) {
  const [subTab, setSubTab] = useState<HealthSubTab>("stats");
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const series = useMemo(() => healthSeriesForLastDays(healthEntries, days, todayISO()), [healthEntries, days]);
  const sortedHistory = useMemo(() => [...healthEntries].sort((a, b) => (a.date < b.date ? 1 : -1)), [healthEntries]);

  if (editingId) {
    return (
      <HealthEntryForm draft={draft} setDraft={setDraft} onSave={saveEntry} onCancel={cancelEdit} saving={saving} error={formError} />
    );
  }

  return (
    <div>
      <SubTabBar
        tabs={[
          { id: "stats" as const, label: "Statystyki", icon: <TrendingUp size={14} /> },
          { id: "history" as const, label: "Historia zdrowia", icon: <History size={14} /> },
        ]}
        active={subTab}
        onChange={setSubTab}
      />

      {subTab === "stats" && (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Chip active={days === 7} onClick={() => setDays(7)}>7 dni</Chip>
            <Chip active={days === 30} onClick={() => setDays(30)}>30 dni</Chip>
            <Chip active={days === 90} onClick={() => setDays(90)}>90 dni</Chip>
          </div>

          {series.length === 0 ? (
            <div className="text-center py-6" style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 13 }}>
              Brak danych zdrowotnych w wybranym okresie.
            </div>
          ) : (
            <div>
              <TrendChart data={series} dataKey="sleepHours" label="Długość snu" color={HEALTH} unit=" h" formatValue={fmtHoursMinutes} />
              <TrendChart data={series} dataKey="sleepQuality" label="Ocena snu" color={TEAL} unit="/100" />
              <TrendChart data={series} dataKey="hrv" label="HRV" color={ISO} unit=" ms" />
              <TrendChart data={series} dataKey="restingHr" label="Tętno spoczynkowe" color={RUST} unit=" bpm" />
              <TrendChart data={series} dataKey="weightKg" label="Masa ciała" color={INK} unit=" kg" digits={1} />
              <TrendChart data={series} dataKey="wellbeing" label="Samopoczucie" color={MUSTARD} unit="/10" />
            </div>
          )}
        </div>
      )}

      {subTab === "history" && (
        <div>
          {sortedHistory.length === 0 ? (
            <div className="text-center py-6" style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 13 }}>
              Brak zapisanych kart zdrowia.
            </div>
          ) : (
            sortedHistory.map((entry) => (
              <HealthHistoryCard
                key={entry.id}
                entry={entry}
                readOnly={readOnly}
                onEdit={startEdit}
                onDelete={deleteEntry}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
