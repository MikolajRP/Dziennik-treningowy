"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { BarChart3, BookOpen, CalendarClock, CalendarDays, HeartPulse, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { addDays, getMonthWeeks, startOfMonth, todayISO } from "@/lib/calculations";
import { healthSeriesForLastDays } from "@/lib/healthCalculations";
import { entriesForDate, raceForDate } from "@/lib/planCalculations";
import { FONT_DISPLAY, FONT_MONO, HEALTH, INK, INK_SOFT, ISO, LINE, PLAN_DONE, PLAN_FUTURE, PLAN_MISSED, PLANNER, RACE, TEAL, gridBg } from "@/lib/design";
import { STRAVA_ORANGE } from "./StravaConnect";
import type { HealthEntry, PersonalEvent, PlanEntry, Race, Workout } from "@/lib/types";
import type { WeeklyRunningDatum } from "@/lib/stravaCalculations";

export const HOME_TILE_ZOOM_MS = 320;

// ---------- one focused, real visual per tile — the same data/colors as
// the real chart in that tab, not the whole tab mounted ----------
function DziennikBackground({ last12WeeksRunning }: { last12WeeksRunning: WeeklyRunningDatum[] }) {
  return (
    <div style={{ width: "100%", height: "100%", padding: "20px 10px 8px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={last12WeeksRunning} margin={{ top: 10, right: 6, left: -18, bottom: 2 }}>
          <defs>
            <linearGradient id="homeRunningFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STRAVA_ORANGE} stopOpacity={0.6} />
              <stop offset="100%" stopColor={STRAVA_ORANGE} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="tickLabel" tick={{ fontFamily: FONT_MONO, fontSize: 8, fill: INK_SOFT }} interval={0} tickLine={false} />
          <YAxis tick={{ fontFamily: FONT_MONO, fontSize: 8, fill: INK_SOFT }} width={26} tickLine={false} />
          <Area type="monotone" dataKey="km" stroke={STRAVA_ORANGE} strokeWidth={2.25} fill="url(#homeRunningFill)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlannerBackground({ personalEvents }: { personalEvents: PersonalEvent[] }) {
  const today = todayISO();
  const monthStart = startOfMonth(today);
  const weekStarts = getMonthWeeks(monthStart);
  const eventColorByDate = new Map<string, string>();
  personalEvents.forEach((e) => {
    if (!eventColorByDate.has(e.date)) eventColorByDate.set(e.date, e.color);
  });
  return (
    <div className="w-full h-full flex flex-col justify-center gap-1.5 px-5">
      {weekStarts.map((weekStart) => (
        <div key={weekStart} className="flex gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(weekStart, i);
            const inMonth = date.slice(0, 7) === monthStart.slice(0, 7);
            const isToday = date === today;
            const eventColor = eventColorByDate.get(date);
            return (
              <div
                key={date}
                className="flex-1 aspect-square rounded-md flex items-center justify-center relative"
                style={{ background: isToday ? PLANNER : "rgba(255,255,255,0.55)", opacity: inMonth ? 1 : 0.3 }}
              >
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: isToday ? "#fff" : INK, fontWeight: 600 }}>
                  {Number(date.slice(8, 10))}
                </span>
                {eventColor && (
                  <div className="absolute rounded-full" style={{ width: 4.5, height: 4.5, bottom: 3, background: eventColor }} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// The coach's "Plan" tile shows the same month grid shape as Planner, but
// each day is colored by real training-plan status (done/missed/planned)
// instead of personal-event colors, with race days pinned in RACE red.
function PlanCalendarBackground({ planEntries, workouts, races }: { planEntries: PlanEntry[]; workouts: Workout[]; races: Race[] }) {
  const today = todayISO();
  const monthStart = startOfMonth(today);
  const weekStarts = getMonthWeeks(monthStart);
  const STATUS_COLOR: Record<string, string> = { done: PLAN_DONE, missed: PLAN_MISSED, planned: PLAN_FUTURE };
  return (
    <div className="w-full h-full flex flex-col justify-center gap-1.5 px-5">
      {weekStarts.map((weekStart) => (
        <div key={weekStart} className="flex gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(weekStart, i);
            const inMonth = date.slice(0, 7) === monthStart.slice(0, 7);
            const isToday = date === today;
            const dayEntries = entriesForDate(planEntries, workouts, date);
            const race = raceForDate(races, date);
            const dotColor = race ? RACE : dayEntries.length > 0 ? STATUS_COLOR[dayEntries[0].status] : undefined;
            return (
              <div
                key={date}
                className="flex-1 aspect-square rounded-md flex items-center justify-center relative"
                style={{ background: isToday ? PLANNER : "rgba(255,255,255,0.55)", opacity: inMonth ? 1 : 0.3 }}
              >
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: isToday ? "#fff" : INK, fontWeight: 600 }}>
                  {Number(date.slice(8, 10))}
                </span>
                {dotColor && (
                  <div className="absolute rounded-full" style={{ width: 4.5, height: 4.5, bottom: 3, background: dotColor }} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ZdrowieBackground({ healthEntries }: { healthEntries: HealthEntry[] }) {
  const series = healthSeriesForLastDays(healthEntries, 30, todayISO());
  return (
    <div style={{ width: "100%", height: "100%", padding: "20px 10px 8px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 10, right: 6, left: -18, bottom: 2 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="tickLabel" tick={{ fontFamily: FONT_MONO, fontSize: 8, fill: INK_SOFT }} interval="preserveStartEnd" tickLine={false} />
          <YAxis tick={{ fontFamily: FONT_MONO, fontSize: 8, fill: INK_SOFT }} width={26} domain={["auto", "auto"]} tickLine={false} />
          <Line type="monotone" dataKey="hrv" stroke={ISO} strokeWidth={2.25} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// No natural "chart" fits Trener, so its tile shows a genuine
// miniaturized screenshot of the real tab instead (mounted read-only by
// the caller) — natural size, scaled down and clipped to the tile.
const TRENER_PREVIEW_WIDTH = 380;
const TRENER_PREVIEW_HEIGHT = 640;
const TRENER_PREVIEW_SCALE = 0.46;
function TrenerBackground({ preview }: { preview: ReactNode }) {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <div
        style={{
          width: TRENER_PREVIEW_WIDTH,
          height: TRENER_PREVIEW_HEIGHT,
          transform: `scale(${TRENER_PREVIEW_SCALE})`,
          transformOrigin: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ width: TRENER_PREVIEW_WIDTH, minHeight: TRENER_PREVIEW_HEIGHT, padding: 14 }}>{preview}</div>
      </div>
    </div>
  );
}

const liquidGlassWash: CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 100%)",
  backdropFilter: "blur(3px) saturate(160%)",
  WebkitBackdropFilter: "blur(3px) saturate(160%)",
  boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.9), inset 0 -14px 24px rgba(255,255,255,0.1), inset 0 -1px 2px rgba(27,42,58,0.08)",
};

export interface HomeTile {
  id: string;
  label: string;
  icon: ReactNode;
  accent: string;
  onOpen: () => void;
  badge?: number;
  background: ReactNode;
}

// Shared grid + zoom-transition chrome for both the athlete's and the
// coach's home panels — only the tile list (icons/colors/backgrounds/
// destinations) differs between the two.
function HomeTileGrid({ tiles, onTransitionStart }: { tiles: HomeTile[]; onTransitionStart: () => void }) {
  const [zoomingId, setZoomingId] = useState<string | null>(null);

  function handleClick(t: HomeTile) {
    if (zoomingId) return;
    setZoomingId(t.id);
    onTransitionStart();
    setTimeout(t.onOpen, HOME_TILE_ZOOM_MS);
  }

  return (
    <div className="grid grid-cols-2 gap-4 pb-6">
      {tiles.map((t) => {
        const active = zoomingId === t.id;
        return (
          <button
            key={t.id}
            onClick={() => handleClick(t)}
            className="relative aspect-square rounded-[28px] overflow-hidden"
            style={{
              border: "1px solid rgba(27,42,58,0.14)",
              boxShadow: "0 14px 30px rgba(27,42,58,0.12)",
              transform: active ? "scale(9)" : zoomingId ? "scale(0.92)" : "scale(1)",
              opacity: zoomingId && !active ? 0 : 1,
              transition: `transform ${HOME_TILE_ZOOM_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${HOME_TILE_ZOOM_MS}ms ease`,
              zIndex: active ? 30 : 1,
            }}
          >
            {/* one real, focused visual per tile — sharpens from blurred
                to crisp as the tile zooms in */}
            <div className="absolute inset-0" style={gridBg}>
              <div
                style={{
                  filter: active ? "blur(0px)" : "blur(2px)",
                  transition: `filter ${HOME_TILE_ZOOM_MS}ms ease`,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                {t.background}
              </div>
            </div>

            {/* glossy top-left highlight — the "liquid" in liquid glass */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                top: "-18%",
                left: "-14%",
                width: "75%",
                height: "55%",
                background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.75), rgba(255,255,255,0) 68%)",
                opacity: active ? 0 : 1,
                transition: `opacity ${HOME_TILE_ZOOM_MS}ms ease`,
              }}
            />

            {/* frosted glass wash + icon/label — fades away as the tile
                zooms in, revealing the now-sharp visual underneath */}
            <div
              className="absolute inset-0"
              style={{ ...liquidGlassWash, opacity: active ? 0 : 1, transition: `opacity ${HOME_TILE_ZOOM_MS}ms ease` }}
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ opacity: active ? 0 : 1, transition: `opacity ${HOME_TILE_ZOOM_MS}ms ease` }}
            >
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{
                  width: 66,
                  height: 66,
                  background: `linear-gradient(155deg, rgba(255,255,255,0.85) 0%, ${t.accent}26 55%, ${t.accent}3d 100%)`,
                  boxShadow: `inset 0 1.5px 1.5px rgba(255,255,255,0.95), inset 0 -6px 10px rgba(27,42,58,0.1), 0 8px 16px rgba(27,42,58,0.22), 0 2px 4px rgba(27,42,58,0.18)`,
                  border: "1px solid rgba(255,255,255,0.7)",
                }}
              >
                <div style={{ color: t.accent, filter: "drop-shadow(0 2px 3px rgba(27,42,58,0.35))" }}>{t.icon}</div>
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: 0.5, color: INK, fontWeight: 700, textTransform: "uppercase" }}>
                {t.label}
              </div>
            </div>

            {!!t.badge && (
              <div
                className="absolute top-2.5 right-2.5 rounded-full text-[10px] px-1.5 py-0.5"
                style={{ fontFamily: FONT_MONO, background: RACE, color: "#fff", opacity: active ? 0 : 1, transition: `opacity ${HOME_TILE_ZOOM_MS}ms ease` }}
              >
                {t.badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function HomePanel({
  last12WeeksRunning,
  personalEvents,
  healthEntries,
  trenerPreview,
  onOpenDziennik,
  onOpenPlanner,
  onOpenZdrowie,
  onOpenTrener,
  onTransitionStart,
  pendingInviteCount,
}: {
  last12WeeksRunning: WeeklyRunningDatum[];
  personalEvents: PersonalEvent[];
  healthEntries: HealthEntry[];
  trenerPreview: ReactNode;
  onOpenDziennik: () => void;
  onOpenPlanner: () => void;
  onOpenZdrowie: () => void;
  onOpenTrener: () => void;
  onTransitionStart: () => void;
  pendingInviteCount: number;
}) {
  const tiles: HomeTile[] = [
    {
      id: "log",
      label: "Dziennik",
      icon: <BookOpen size={34} strokeWidth={1.75} />,
      accent: INK,
      onOpen: onOpenDziennik,
      background: <DziennikBackground last12WeeksRunning={last12WeeksRunning} />,
    },
    {
      id: "planner",
      label: "Planner",
      icon: <CalendarClock size={34} strokeWidth={1.75} />,
      accent: PLANNER,
      onOpen: onOpenPlanner,
      background: <PlannerBackground personalEvents={personalEvents} />,
    },
    {
      id: "health",
      label: "Zdrowie",
      icon: <HeartPulse size={34} strokeWidth={1.75} />,
      accent: HEALTH,
      onOpen: onOpenZdrowie,
      background: <ZdrowieBackground healthEntries={healthEntries} />,
    },
    {
      id: "coach",
      label: "Trener",
      icon: <Users size={34} strokeWidth={1.75} />,
      accent: TEAL,
      onOpen: onOpenTrener,
      badge: pendingInviteCount,
      background: <TrenerBackground preview={trenerPreview} />,
    },
  ];

  return <HomeTileGrid tiles={tiles} onTransitionStart={onTransitionStart} />;
}

// The coach's home panel — same glass-tile grid and zoom/crossfade chrome
// as the athlete's, but for the three tabs a coach actually has: the
// training Plan (which is also the gateway into Dziennik/Statystyki/Notatki
// for that athlete), Zdrowie, and Statystyki, each standing on its own.
export function CoachHomePanel({
  planEntries,
  workouts,
  races,
  healthEntries,
  last12WeeksRunning,
  onOpenPlan,
  onOpenZdrowie,
  onOpenStatystyki,
  onTransitionStart,
  canViewReports,
}: {
  planEntries: PlanEntry[];
  workouts: Workout[];
  races: Race[];
  healthEntries: HealthEntry[];
  last12WeeksRunning: WeeklyRunningDatum[];
  onOpenPlan: () => void;
  onOpenZdrowie: () => void;
  onOpenStatystyki: () => void;
  onTransitionStart: () => void;
  canViewReports: boolean;
}) {
  const tiles: HomeTile[] = [
    {
      id: "plan",
      label: "Plan",
      icon: <CalendarDays size={34} strokeWidth={1.75} />,
      accent: PLANNER,
      onOpen: onOpenPlan,
      background: <PlanCalendarBackground planEntries={planEntries} workouts={workouts} races={races} />,
    },
    {
      id: "health",
      label: "Zdrowie",
      icon: <HeartPulse size={34} strokeWidth={1.75} />,
      accent: HEALTH,
      onOpen: onOpenZdrowie,
      background: <ZdrowieBackground healthEntries={healthEntries} />,
    },
    ...(canViewReports
      ? [
          {
            id: "stats",
            label: "Statystyki",
            icon: <BarChart3 size={34} strokeWidth={1.75} />,
            accent: TEAL,
            onOpen: onOpenStatystyki,
            background: <DziennikBackground last12WeeksRunning={last12WeeksRunning} />,
          } satisfies HomeTile,
        ]
      : []),
  ];

  return <HomeTileGrid tiles={tiles} onTransitionStart={onTransitionStart} />;
}
