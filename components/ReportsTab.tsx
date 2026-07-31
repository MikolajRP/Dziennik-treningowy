"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { fmtDate, fmtMinutesLong, fmtShort } from "@/lib/calculations";
import type { HrZoneDatum } from "@/lib/stravaCalculations";
import { STRAVA_ORANGE } from "./StravaConnect";
import {
  CARD,
  FONT_DISPLAY,
  FONT_MONO,
  INK,
  INK_SOFT,
  ISO,
  LINE,
  MUSTARD,
  PLYO,
  TEAL,
  AERO,
  inputStyle,
} from "@/lib/design";
import type { Cycle, CycleType, Period } from "@/lib/types";
import { Chip, Field, IconBtn } from "./atoms";

interface CategoryDatum {
  category: string;
  value: number;
}

const ZONE_COLORS = [AERO, "#4E8CB0", MUSTARD, "#C97A2E", "#A6402F"];

export function ReportsTab({
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
  totalIsometricLoad,
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
  showCycleForm,
  setShowCycleForm,
  cycleDraft,
  setCycleDraft,
  saveCycle,
  deleteCycle,
}: {
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
  totalIsometricLoad: number;
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
  showCycleForm: boolean;
  setShowCycleForm: (v: boolean) => void;
  cycleDraft: Cycle;
  setCycleDraft: (updater: (c: Cycle) => Cycle) => void;
  saveCycle: () => void;
  deleteCycle: (id: string) => void;
}) {
  const categoryChart = (data: CategoryDatum[], label: string, color: string, unitFormatter: (v: number) => string) =>
    data.length > 0 && (
      <div className="mb-5">
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, marginBottom: 6 }}>{label}</div>
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16 }}>
            <CartesianGrid stroke={LINE} horizontal={false} />
            <XAxis type="number" tick={{ fontFamily: FONT_MONO, fontSize: 10, fill: INK_SOFT }} />
            <YAxis type="category" dataKey="category" width={100} tick={{ fontFamily: FONT_MONO, fontSize: 11, fill: INK }} />
            <Tooltip contentStyle={{ fontFamily: FONT_MONO, fontSize: 12 }} formatter={(v) => [unitFormatter(Number(v)), label]} />
            <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );

  const kmChartData = kmByActivityType.map((d) => ({ category: d.label, value: Math.round(d.km * 100) / 100 }));
  const timeChartData = timeByActivityType.map((d) => ({ category: d.label, value: Math.round(d.minutes) }));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Chip active={period === "week"} onClick={() => setPeriod("week")}>7 dni</Chip>
        <Chip active={period === "month"} onClick={() => setPeriod("month")}>30 dni</Chip>
        <Chip active={period === "all"} onClick={() => setPeriod("all")}>Wszystko</Chip>
        <Chip active={period === "cycle"} onClick={() => setPeriod("cycle")} color={TEAL}>Cykl</Chip>
        <Chip active={period === "custom"} onClick={() => setPeriod("custom")}>Zakres dat</Chip>
      </div>

      {period === "cycle" && (
        <div className="mb-3">
          {cycles.length === 0 ? (
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>
              Brak zdefiniowanych cykli — dodaj mezocykl lub makrocykl poniżej.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {cycles.map((c) => (
                <Chip key={c.id} active={selectedCycleId === c.id} onClick={() => setSelectedCycleId(c.id)} color={TEAL}>
                  {c.name}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {period === "custom" && (
        <div className="flex items-center gap-2 mb-3">
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 py-1 rounded text-sm" style={inputStyle} />
          <span style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>—</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 py-1 rounded text-sm" style={inputStyle} />
        </div>
      )}

      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, marginBottom: 14 }}>
        {fmtDate(rangeStart)} – {fmtDate(rangeEnd)} · {filteredCount} treningów
      </div>

      {/* ---------- priority: bieganie ---------- */}
      {(totalRunningKm > 0 || weeklyRunningKmSeries.length > 0) && (
        <div className="mb-6 p-3 rounded-md" style={{ background: "#FFF5EE", border: `1.5px solid ${STRAVA_ORANGE}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: STRAVA_ORANGE, fontWeight: 600, marginBottom: 8 }}>
            BIEGANIE
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>DYSTANS</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: INK, fontWeight: 600 }}>
                {totalRunningKm.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>CZAS</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: INK, fontWeight: 600 }}>
                {fmtMinutesLong(totalRunningMinutes)}
              </div>
            </div>
          </div>
          {weeklyRunningKmSeries.length > 1 && (
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={weeklyRunningKmSeries}>
                <CartesianGrid stroke={LINE} />
                <XAxis dataKey="week" tick={{ fontFamily: FONT_MONO, fontSize: 10, fill: INK_SOFT }} />
                <YAxis tick={{ fontFamily: FONT_MONO, fontSize: 10, fill: INK_SOFT }} />
                <Tooltip contentStyle={{ fontFamily: FONT_MONO, fontSize: 12 }} formatter={(v) => [`${v} km`, "Dystans"]} />
                <Line type="monotone" dataKey="km" stroke={STRAVA_ORANGE} strokeWidth={2} dot={{ fill: STRAVA_ORANGE, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ---------- ogólne podsumowanie ---------- */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>ŁĄCZNY CZAS</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: INK, fontWeight: 600 }}>{fmtMinutesLong(totalOverallMinutes)}</div>
        </div>
        <div className="p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>TRENINGÓW</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: INK, fontWeight: 600 }}>{filteredCount}</div>
        </div>
        <div className="p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>TONAŻ</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: INK, fontWeight: 600 }}>{Math.round(totalTonnage).toLocaleString("pl-PL")} kg</div>
        </div>
        <div className="p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>PLYO</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: PLYO, fontWeight: 600 }}>{totalPlyoReps} powt.</div>
        </div>
        <div className="p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>IZOMETRIA</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: ISO, fontWeight: 600 }}>{Math.round(totalIsometricLoad).toLocaleString("pl-PL")} kg·s</div>
        </div>
        <div className="p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>FUNKCJONALNE</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: TEAL, fontWeight: 600 }}>{totalFunctionalMinutes} min</div>
        </div>
        <div className="p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>AEROBOWE</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: AERO, fontWeight: 600 }}>{totalAerobicMinutes} min</div>
        </div>
      </div>

      {categoryChart(kmChartData, "Kilometry wg aktywności", STRAVA_ORANGE, (v) => `${v} km`)}
      {categoryChart(timeChartData, "Czas wg aktywności (min)", INK, (v) => `${v} min`)}

      {filteredCount === 0 && (
        <div className="text-center py-6" style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 13 }}>
          Brak treningów w wybranym okresie.
        </div>
      )}

      {/* ---------- detailed / lower-priority breakdowns ---------- */}
      {categoryChart(tonnageByCat, "Tonaż wg kategorii", MUSTARD, (v) => `${Math.round(v)} kg`)}
      {categoryChart(plyoByCat, "Objętość plyo wg kategorii (powtórzenia)", PLYO, (v) => `${v} powt.`)}
      {categoryChart(isometricByCat, "Obciążenie izometryczne wg kategorii (kg·s)", ISO, (v) => `${Math.round(v)} kg·s`)}
      {categoryChart(functionalByCat, "Minuty funkcjonalne wg kategorii", TEAL, (v) => `${v} min`)}
      {categoryChart(aerobicByCat, "Minuty aerobowe wg kategorii", AERO, (v) => `${v} min`)}

      {hrZones.length > 0 && (
        <div className="mb-5">
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, marginBottom: 6 }}>
            Strefy tętna (% czasu z tętnem)
          </div>
          <div className="space-y-1.5">
            {hrZones.map((z, i) => (
              <div key={z.zone} className="flex items-center gap-2">
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, width: 96 }}>
                  Strefa {z.zone} · {z.min}-{z.max === -1 ? "∞" : z.max} bpm
                </div>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                  <div style={{ width: `${z.pct}%`, background: ZONE_COLORS[i % ZONE_COLORS.length], height: "100%" }} />
                </div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, width: 36, textAlign: "right" }}>
                  {Math.round(z.pct)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weeklySeries.length > 1 && (
        <div className="mb-5">
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, marginBottom: 6 }}>Progresja tonażu (tygodniowo)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weeklySeries}>
              <CartesianGrid stroke={LINE} />
              <XAxis dataKey="week" tick={{ fontFamily: FONT_MONO, fontSize: 10, fill: INK_SOFT }} />
              <YAxis tick={{ fontFamily: FONT_MONO, fontSize: 10, fill: INK_SOFT }} />
              <Tooltip contentStyle={{ fontFamily: FONT_MONO, fontSize: 12 }} formatter={(v) => [`${v} kg`, "Tonaż"]} />
              <Line type="monotone" dataKey="tonnage" stroke={INK} strokeWidth={2} dot={{ fill: MUSTARD, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between mb-2">
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600 }}>CYKLE TRENINGOWE</div>
          {!showCycleForm && (
            <button onClick={() => setShowCycleForm(true)} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs" style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}>
              <Plus size={13} /> Dodaj cykl
            </button>
          )}
        </div>

        {showCycleForm && (
          <div className="p-3 rounded-md mb-3" style={{ background: CARD, border: `1px solid ${INK}` }}>
            <Field label="Nazwa">
              <input
                value={cycleDraft.name}
                onChange={(e) => setCycleDraft((c) => ({ ...c, name: e.target.value }))}
                placeholder="np. Mezocykl siła — luty"
                className="w-full px-2 py-1.5 rounded text-sm"
                style={inputStyle}
              />
            </Field>
            <Field label="Typ">
              <div className="flex gap-1.5">
                <Chip active={cycleDraft.type === "mezocykl"} onClick={() => setCycleDraft((c) => ({ ...c, type: "mezocykl" as CycleType }))}>
                  Mezocykl
                </Chip>
                <Chip active={cycleDraft.type === "makrocykl"} onClick={() => setCycleDraft((c) => ({ ...c, type: "makrocykl" as CycleType }))}>
                  Makrocykl
                </Chip>
              </div>
            </Field>
            <div className="flex items-center gap-2 mb-3">
              <input type="date" value={cycleDraft.start} onChange={(e) => setCycleDraft((c) => ({ ...c, start: e.target.value }))} className="px-2 py-1 rounded text-sm" style={inputStyle} />
              <span style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>—</span>
              <input type="date" value={cycleDraft.end} onChange={(e) => setCycleDraft((c) => ({ ...c, end: e.target.value }))} className="px-2 py-1 rounded text-sm" style={inputStyle} />
            </div>
            <div className="flex gap-2">
              <button onClick={saveCycle} className="flex-1 py-2 rounded-md text-sm" style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}>
                Zapisz cykl
              </button>
              <button onClick={() => setShowCycleForm(false)} className="px-4 py-2 rounded-md text-sm" style={{ fontFamily: FONT_MONO, border: `1px solid ${LINE}`, color: INK_SOFT }}>
                Anuluj
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {cycles.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: INK }}>{c.name}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>
                  {c.type} · {fmtShort(c.start)} – {fmtShort(c.end)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn
                  onClick={() => {
                    setCycleDraft(() => c);
                    setShowCycleForm(true);
                  }}
                  title="Edytuj"
                >
                  <Pencil size={14} />
                </IconBtn>
                <IconBtn onClick={() => deleteCycle(c.id)} title="Usuń" color="#A6402F">
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
