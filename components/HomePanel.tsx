"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { BookOpen, CalendarClock, HeartPulse, Users } from "lucide-react";
import { fmtShort, todayISO } from "@/lib/calculations";
import { FONT_DISPLAY, FONT_MONO, HEALTH, INK, PAPER, PLANNER, RACE, TEAL } from "@/lib/design";
import type { CoachAccess, HealthEntry, PersonalEvent, Workout } from "@/lib/types";

export const HOME_TILE_ZOOM_MS = 320;

// ---------- abstract fallback art (shown until there's real data to preview) ----------
function DziennikArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      {[40, 76, 112, 148].map((y, i) => (
        <g key={y}>
          <rect x={24} y={y} width={i % 2 === 0 ? 120 : 90} height={14} rx={7} fill={accent} opacity={0.5} />
          <circle cx={190 - 20} cy={y + 7} r={7} fill={accent} opacity={0.35} />
        </g>
      ))}
    </svg>
  );
}
function PlannerArt({ accent }: { accent: string }) {
  const cells = Array.from({ length: 16 }, (_, i) => i);
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      {cells.map((i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 20 + col * 42;
        const y = 20 + row * 42;
        const filled = i === 6;
        return <rect key={i} x={x} y={y} width={34} height={34} rx={8} fill={accent} opacity={filled ? 0.65 : 0.22} />;
      })}
    </svg>
  );
}
function ZdrowieArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <path
        d="M10 120 L50 120 L65 80 L85 160 L105 60 L120 120 L140 120 L155 95 L190 95"
        fill="none"
        stroke={accent}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
      />
      <path
        d="M100 175 C60 145 30 120 30 90 C30 65 50 50 70 60 C85 67 100 85 100 85 C100 85 115 67 130 60 C150 50 170 65 170 90 C170 120 140 145 100 175 Z"
        fill={accent}
        opacity={0.18}
      />
    </svg>
  );
}
function TrenerArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <circle cx={78} cy={80} r={34} fill={accent} opacity={0.3} />
      <circle cx={130} cy={110} r={34} fill={accent} opacity={0.45} />
      <rect x={30} y={140} width={96} height={16} rx={8} fill={accent} opacity={0.25} />
      <rect x={90} y={165} width={96} height={16} rx={8} fill={accent} opacity={0.35} />
    </svg>
  );
}

// ---------- real, lightweight previews of each tab's actual content ----------
// Deliberately not the real interactive tab components (too heavy to mount
// four of behind a decorative background) — small static markup fed with
// the same live data, styled to read like that tab at a glance.
function DziennikPreview({ workouts, accent }: { workouts: Workout[]; accent: string }) {
  const recent = [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
  if (recent.length === 0) return <DziennikArt accent={accent} />;
  return (
    <div className="w-full h-full flex flex-col justify-center gap-3 px-7">
      {recent.map((w) => (
        <div key={w.id} className="flex items-center gap-2">
          <div className="rounded-full shrink-0" style={{ width: 7, height: 7, background: accent }} />
          <div className="shrink-0" style={{ fontFamily: FONT_MONO, fontSize: 11, color: accent, fontWeight: 600 }}>
            {fmtShort(w.date)}
          </div>
          <div className="truncate" style={{ fontFamily: FONT_MONO, fontSize: 11, color: accent, opacity: 0.75 }}>
            {w.name || w.category}
          </div>
        </div>
      ))}
    </div>
  );
}
function PlannerPreview({ personalEvents, accent }: { personalEvents: PersonalEvent[]; accent: string }) {
  const today = todayISO();
  const upcoming = [...personalEvents]
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? "") < (b.time ?? "") ? -1 : 1))
    .slice(0, 4);
  if (upcoming.length === 0) return <PlannerArt accent={accent} />;
  return (
    <div className="w-full h-full flex flex-col justify-center gap-3 px-7">
      {upcoming.map((e) => (
        <div key={e.id} className="flex items-center gap-2">
          <div className="rounded-full shrink-0" style={{ width: 7, height: 7, background: e.color }} />
          <div className="truncate" style={{ fontFamily: FONT_MONO, fontSize: 11, color: accent }}>
            {e.title}
          </div>
        </div>
      ))}
    </div>
  );
}
function ZdrowiePreview({ healthEntries, accent }: { healthEntries: HealthEntry[]; accent: string }) {
  const sorted = [...healthEntries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sorted[0];
  if (!latest) return <ZdrowieArt accent={accent} />;
  const series = sorted.slice(0, 7).reverse();
  const points = series
    .map((h, i) => {
      const x = (i / Math.max(1, series.length - 1)) * 160;
      const y = 44 - (h.wellbeing / 10) * 38;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <svg viewBox="0 0 160 50" width="72%" height={50}>
        <polyline points={points} fill="none" stroke={accent} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      </svg>
      <div className="flex gap-4" style={{ fontFamily: FONT_MONO, fontSize: 12, color: accent, fontWeight: 600 }}>
        <span>{Math.round(latest.hrv)} ms</span>
        <span>{Math.round(latest.restingHr)} bpm</span>
      </div>
    </div>
  );
}
function TrenerPreview({ coachGrants, accent }: { coachGrants: CoachAccess[]; accent: string }) {
  const active = coachGrants.filter((g) => g.status === "active");
  if (active.length === 0) return <TrenerArt accent={accent} />;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2.5">
      {active.slice(0, 3).map((g) => (
        <div key={g.id} className="flex items-center gap-2">
          <div
            className="rounded-full flex items-center justify-center shrink-0"
            style={{ width: 22, height: 22, background: accent, color: "#fff", fontSize: 10, fontFamily: FONT_MONO, fontWeight: 700 }}
          >
            {g.coachEmail[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="truncate" style={{ fontFamily: FONT_MONO, fontSize: 11, color: accent }}>
            {g.coachEmail}
          </div>
        </div>
      ))}
    </div>
  );
}

const liquidGlassWash: CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.16) 100%)",
  backdropFilter: "blur(6px) saturate(160%)",
  WebkitBackdropFilter: "blur(6px) saturate(160%)",
  boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.9), inset 0 -14px 24px rgba(255,255,255,0.1), inset 0 -1px 2px rgba(27,42,58,0.08)",
};

interface Tile {
  id: string;
  label: string;
  icon: ReactNode;
  accent: string;
  action: () => void;
  badge?: number;
  Preview: () => ReactNode;
}

export function HomePanel({
  workouts,
  personalEvents,
  healthEntries,
  coachGrants,
  onOpenDziennik,
  onOpenPlanner,
  onOpenZdrowie,
  onOpenTrener,
  onTransitionStart,
  pendingInviteCount,
}: {
  workouts: Workout[];
  personalEvents: PersonalEvent[];
  healthEntries: HealthEntry[];
  coachGrants: CoachAccess[];
  onOpenDziennik: () => void;
  onOpenPlanner: () => void;
  onOpenZdrowie: () => void;
  onOpenTrener: () => void;
  onTransitionStart: () => void;
  pendingInviteCount: number;
}) {
  const [zoomingId, setZoomingId] = useState<string | null>(null);

  function handleClick(id: string, action: () => void) {
    if (zoomingId) return;
    setZoomingId(id);
    onTransitionStart();
    setTimeout(action, HOME_TILE_ZOOM_MS);
  }

  const tiles: Tile[] = [
    {
      id: "log",
      label: "Dziennik",
      icon: <BookOpen size={34} strokeWidth={1.75} />,
      accent: INK,
      action: () => handleClick("log", onOpenDziennik),
      Preview: () => <DziennikPreview workouts={workouts} accent={INK} />,
    },
    {
      id: "planner",
      label: "Planner",
      icon: <CalendarClock size={34} strokeWidth={1.75} />,
      accent: PLANNER,
      action: () => handleClick("planner", onOpenPlanner),
      Preview: () => <PlannerPreview personalEvents={personalEvents} accent={PLANNER} />,
    },
    {
      id: "health",
      label: "Zdrowie",
      icon: <HeartPulse size={34} strokeWidth={1.75} />,
      accent: HEALTH,
      action: () => handleClick("health", onOpenZdrowie),
      Preview: () => <ZdrowiePreview healthEntries={healthEntries} accent={HEALTH} />,
    },
    {
      id: "coach",
      label: "Trener",
      icon: <Users size={34} strokeWidth={1.75} />,
      accent: TEAL,
      action: () => handleClick("coach", onOpenTrener),
      badge: pendingInviteCount,
      Preview: () => <TrenerPreview coachGrants={coachGrants} accent={TEAL} />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 pb-6">
      {tiles.map((t) => {
        const active = zoomingId === t.id;
        return (
          <button
            key={t.id}
            onClick={t.action}
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
            {/* real (or fallback abstract) preview of the tab's content —
                sharpens from blurred to crisp as the tile zooms in */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: PAPER }}>
              <div
                style={{
                  filter: active ? "blur(0px)" : "blur(4px)",
                  transition: `filter ${HOME_TILE_ZOOM_MS}ms ease`,
                  opacity: 0.88,
                  width: "140%",
                  height: "140%",
                }}
              >
                <t.Preview />
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
                zooms in, revealing the now-sharp preview underneath */}
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
