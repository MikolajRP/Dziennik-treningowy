"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { fmtShort } from "@/lib/calculations";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, PLAN_DONE, RUST } from "@/lib/design";
import type { HealthEntry, Workout } from "@/lib/types";

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
}: {
  label: string;
  value: string;
  unit: string;
  current: number;
  previous: number | null;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 px-2 py-2.5">
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div className="flex items-center gap-1.5">
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: INK }}>{value}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>{unit}</span>
        <TrendArrow current={current} previous={previous} />
      </div>
    </div>
  );
}

// A quick-glance profile strip shown under the coach's home-panel title:
// the athlete's most recent HRV and self-reported wellbeing (each with a
// trend arrow vs. their previous measurement) plus their last logged
// workout — everything a coach checks first, before opening any tab.
export function AthleteProfileCard({
  latestHealth,
  previousHealth,
  lastWorkout,
}: {
  latestHealth: HealthEntry | null;
  previousHealth: HealthEntry | null;
  lastWorkout: Workout | null;
}) {
  if (!latestHealth && !lastWorkout) return null;

  return (
    <div className="rounded-2xl mb-6 overflow-hidden" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      {latestHealth && (
        <div className="flex" style={{ borderBottom: lastWorkout ? `1px solid ${LINE}` : undefined }}>
          <MetricCell label="HRV" value={String(latestHealth.hrv)} unit="ms" current={latestHealth.hrv} previous={previousHealth?.hrv ?? null} />
          <div style={{ width: 1, background: LINE }} />
          <MetricCell
            label="Samopoczucie"
            value={String(latestHealth.wellbeing)}
            unit="/10"
            current={latestHealth.wellbeing}
            previous={previousHealth?.wellbeing ?? null}
          />
        </div>
      )}
      {lastWorkout && (
        <div className="px-4 py-2.5 flex items-baseline justify-between gap-2" style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>
          <span>Ostatni trening</span>
          <span style={{ color: INK, fontWeight: 600 }}>
            {fmtShort(lastWorkout.date)} · {lastWorkout.category}
            {lastWorkout.name ? ` — ${lastWorkout.name}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
