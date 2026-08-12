"use client";

import { Fragment, useState, type HTMLAttributes } from "react";
import { ChevronDown, ChevronUp, GripVertical, Heart, Link2Off, Mountain, Route as RouteIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDurationShort, fmtKm, fmtPaceMinPer100m, fmtPaceMinPerKm, fmtSpeedKmh } from "@/lib/calculations";
import { isCyclingActivityType, isSwimmingActivityType, stravaTypeLabel } from "@/lib/stravaCalculations";
import { AERO, CARD, FONT_MONO, INK, INK_SOFT, ISO, LINE, MUSTARD } from "@/lib/design";
import type { StravaActivity } from "@/lib/types";
import { STRAVA_ORANGE } from "./StravaConnect";
import { StravaRouteShape } from "./StravaRouteShape";
import { IconBtn } from "./atoms";

interface StreamsResponse {
  time?: { data: number[] };
  distance?: { data: number[] };
  heartrate?: { data: number[] };
  altitude?: { data: number[] };
  velocity_smooth?: { data: number[] };
}

function downsample<T>(arr: T[], maxPoints = 150): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}

// "pace" = running (min/km), "speed" = cycling (km/h), "pace100m" = swimming
// (min/100m, the pool-swimming convention rather than min/km).
type PaceMode = "pace" | "speed" | "pace100m";
const paceModeFor = (type: string): PaceMode =>
  isCyclingActivityType(type) ? "speed" : isSwimmingActivityType(type) ? "pace100m" : "pace";
function fmtPaceOrSpeed(mode: PaceMode, mps: number): string {
  if (mode === "speed") return fmtSpeedKmh(mps);
  if (mode === "pace100m") return fmtPaceMinPer100m(mps);
  return fmtPaceMinPerKm(mps);
}

function ZoneBars({ zones }: { zones: NonNullable<StravaActivity["hrZones"]> }) {
  const total = zones.reduce((s, z) => s + z.time, 0);
  if (total === 0) return null;
  const colors = [AERO, "#4E8CB0", MUSTARD, "#C97A2E", "#A6402F"];
  return (
    <div className="mt-2">
      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Strefy tętna
      </div>
      <div className="space-y-1">
        {zones.map((z, i) => {
          const pct = (z.time / total) * 100;
          if (pct === 0) return null;
          return (
            <div key={i} className="flex items-center gap-2">
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, width: 84 }}>
                Z{i + 1} · {z.min}-{z.max === -1 ? "∞" : z.max}
              </div>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
                <div style={{ width: `${pct}%`, background: colors[i % colors.length], height: "100%" }} />
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, width: 32, textAlign: "right" }}>
                {Math.round(pct)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SplitsTable({
  splits,
  mode,
}: {
  splits: NonNullable<StravaActivity["splitsMetric"]>;
  mode: PaceMode;
}) {
  return (
    <div className="mt-2">
      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Odcinki (co 1 km)
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-0.5" style={{ fontFamily: FONT_MONO, fontSize: 11 }}>
        <div style={{ color: INK_SOFT }}>km</div>
        <div style={{ color: INK_SOFT }}>{mode === "speed" ? "prędkość" : "tempo"}</div>
        <div style={{ color: INK_SOFT }}>tętno</div>
        <div style={{ color: INK_SOFT }}>przewyższenie</div>
        {splits.map((s) => (
          <Fragment key={s.split}>
            <div style={{ color: INK }}>{s.split}</div>
            <div style={{ color: MUSTARD }}>{fmtPaceOrSpeed(mode, s.distance / s.moving_time)}</div>
            <div style={{ color: INK }}>{s.average_heartrate ? Math.round(s.average_heartrate) : "–"}</div>
            <div style={{ color: INK }}>
              {s.elevation_difference !== undefined ? `${Math.round(s.elevation_difference)} m` : "–"}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ActivityCharts({ activityRowId, mode }: { activityRowId: string; mode: PaceMode }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [chartData, setChartData] = useState<{ km: number; pace: number; hr?: number; elevation?: number }[]>([]);
  const isCycling = mode === "speed";
  const isSwimming = mode === "pace100m";

  async function load() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/strava/activities/${activityRowId}/streams`);
      if (!res.ok) throw new Error("failed");
      const streams: StreamsResponse = await res.json();
      const distance = streams.distance?.data ?? [];
      const speed = streams.velocity_smooth?.data ?? [];
      const hr = streams.heartrate?.data;
      const altitude = streams.altitude?.data;
      const paceDivisor = isSwimming ? 100 : 1000;
      const points = distance.map((d, i) => ({
        km: Math.round((d / 1000) * 100) / 100,
        pace: isCycling ? speed[i] * 3.6 : speed[i] > 0 ? paceDivisor / speed[i] / 60 : 0,
        hr: hr?.[i],
        elevation: altitude?.[i],
      }));
      setChartData(downsample(points));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  if (status === "idle") {
    return (
      <button
        onClick={load}
        className="text-xs mt-2"
        style={{ fontFamily: FONT_MONO, color: MUSTARD }}
      >
        + pokaż wykresy ({isCycling ? "prędkość" : "tempo"}, tętno, przewyższenie)
      </button>
    );
  }
  if (status === "loading") {
    return (
      <div className="text-xs mt-2" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Wczytywanie wykresów…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="text-xs mt-2" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Nie udało się wczytać wykresów.
      </div>
    );
  }

  const paceUnit = isSwimming ? "min/100m" : "min/km";

  return (
    <div className="mt-2 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
          {isCycling ? "Prędkość (km/h)" : `Tempo (${paceUnit})`}
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={chartData}>
            <CartesianGrid stroke={LINE} />
            <XAxis dataKey="km" tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
            <YAxis reversed={!isCycling} tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
            <Tooltip
              contentStyle={{ fontFamily: FONT_MONO, fontSize: 11 }}
              formatter={(v) => [
                isCycling ? `${Number(v).toFixed(1)} km/h` : `${Number(v).toFixed(2)} ${paceUnit}`,
                isCycling ? "Prędkość" : "Tempo",
              ]}
            />
            <Line type="monotone" dataKey="pace" stroke={MUSTARD} dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {chartData.some((d) => d.hr) && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
            Tętno
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData}>
              <CartesianGrid stroke={LINE} />
              <XAxis dataKey="km" tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
              <YAxis tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
              <Tooltip contentStyle={{ fontFamily: FONT_MONO, fontSize: 11 }} formatter={(v) => [`${Math.round(Number(v))} bpm`, "Tętno"]} />
              <Line type="monotone" dataKey="hr" stroke={ISO} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {chartData.some((d) => d.elevation !== undefined) && (
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
            Przewyższenie
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData}>
              <CartesianGrid stroke={LINE} />
              <XAxis dataKey="km" tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
              <YAxis tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: INK_SOFT }} />
              <Tooltip contentStyle={{ fontFamily: FONT_MONO, fontSize: 11 }} formatter={(v) => [`${Math.round(Number(v))} m`, "Wysokość"]} />
              <Line type="monotone" dataKey="elevation" stroke={AERO} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Collapsed headline stats, matching how Strava itself leads: distance,
// average pace/speed, time — used in the workout card's collapsed row.
// `mode` defaults to pace (running); pass "speed" for cycling and
// "pace100m" for swimming, where min/km doesn't make sense.
export function StravaCollapsedSummary({
  distanceM,
  movingTimeS,
  avgSpeedMps,
  mode = "pace",
}: {
  distanceM: number;
  movingTimeS: number;
  avgSpeedMps: number;
  mode?: PaceMode;
}) {
  return (
    <div className="text-right" style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>
      <div style={{ color: STRAVA_ORANGE, fontWeight: 600 }}>{fmtKm(distanceM)}</div>
      <div style={{ color: INK_SOFT }}>
        {fmtPaceOrSpeed(mode, avgSpeedMps)} · {fmtDurationShort(movingTimeS)}
      </div>
    </div>
  );
}

export function StravaSingleActivity({
  activity,
  onDetach,
  dragHandleProps,
}: {
  activity: StravaActivity;
  onDetach: () => void;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
}) {
  const [expanded, setExpanded] = useState(false);
  const mode = paceModeFor(activity.type);

  return (
    <div className="rounded-md p-2.5 mb-2" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <div className="flex items-center gap-1.5">
        {dragHandleProps && (
          <div {...dragHandleProps} className="shrink-0" style={{ cursor: "grab", touchAction: "none" }} title="Przytrzymaj, żeby zmienić kolejność">
            <GripVertical size={14} color={INK_SOFT} />
          </div>
        )}
        <button className="flex-1 flex items-center justify-between text-left" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-2">
          <RouteIcon size={14} color={STRAVA_ORANGE} />
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600 }}>
              {activity.name || stravaTypeLabel(activity.type)}
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>{stravaTypeLabel(activity.type)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StravaCollapsedSummary
            distanceM={activity.distanceM}
            movingTimeS={activity.movingTimeS}
            avgSpeedMps={activity.averageSpeedMps}
            mode={mode}
          />
          {expanded ? <ChevronUp size={14} color={INK_SOFT} /> : <ChevronDown size={14} color={INK_SOFT} />}
        </div>
        </button>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-3 gap-2 mb-1" style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>
            <div className="flex items-center gap-1">
              <Mountain size={12} /> {Math.round(activity.elevationGainM)} m
            </div>
            {activity.averageHeartrate && (
              <div className="flex items-center gap-1">
                <Heart size={12} /> śr. {Math.round(activity.averageHeartrate)}
                {activity.maxHeartrate && ` / maks. ${Math.round(activity.maxHeartrate)}`}
              </div>
            )}
          </div>

          {activity.polyline && <StravaRouteShape polyline={activity.polyline} />}
          {activity.splitsMetric && activity.splitsMetric.length > 0 && (
            <SplitsTable splits={activity.splitsMetric} mode={mode} />
          )}
          {activity.hrZones && activity.hrZones.length > 0 && <ZoneBars zones={activity.hrZones} />}
          <ActivityCharts activityRowId={activity.id} mode={mode} />

          <div className="flex justify-end mt-2">
            <IconBtn onClick={onDetach} title="Odłącz jako osobny trening" color="#A6402F">
              <Link2Off size={13} />
            </IconBtn>
          </div>
        </div>
      )}
    </div>
  );
}
