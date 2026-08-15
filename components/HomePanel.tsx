"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, CalendarClock, HeartPulse, Users } from "lucide-react";
import { FONT_DISPLAY, FONT_MONO, HEALTH, INK, PAPER, PLANNER, RACE, TEAL } from "@/lib/design";

export const HOME_TILE_ZOOM_MS = 280;

// Small abstract line-art standing in for a screenshot of each tab's
// content — blurred behind a frosted glass wash. Kept intentionally
// simple: a handful of shapes per tile, not a literal illustration.
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

interface Tile {
  id: string;
  label: string;
  icon: ReactNode;
  accent: string;
  action: () => void;
  badge?: number;
  Art: (props: { accent: string }) => ReactNode;
}

export function HomePanel({
  onOpenDziennik,
  onOpenPlanner,
  onOpenZdrowie,
  onOpenTrener,
  onTransitionStart,
  pendingInviteCount,
}: {
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
    { id: "log", label: "Dziennik", icon: <BookOpen size={34} strokeWidth={1.75} />, accent: INK, action: () => handleClick("log", onOpenDziennik), Art: DziennikArt },
    {
      id: "planner",
      label: "Planner",
      icon: <CalendarClock size={34} strokeWidth={1.75} />,
      accent: PLANNER,
      action: () => handleClick("planner", onOpenPlanner),
      Art: PlannerArt,
    },
    {
      id: "health",
      label: "Zdrowie",
      icon: <HeartPulse size={34} strokeWidth={1.75} />,
      accent: HEALTH,
      action: () => handleClick("health", onOpenZdrowie),
      Art: ZdrowieArt,
    },
    {
      id: "coach",
      label: "Trener",
      icon: <Users size={34} strokeWidth={1.75} />,
      accent: TEAL,
      action: () => handleClick("coach", onOpenTrener),
      badge: pendingInviteCount,
      Art: TrenerArt,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 pb-6">
      {tiles.map((t) => (
        <button
          key={t.id}
          onClick={t.action}
          className="relative aspect-square rounded-[28px] overflow-hidden"
          style={{
            border: "1px solid rgba(27,42,58,0.14)",
            boxShadow: "0 14px 30px rgba(27,42,58,0.12)",
            transform: zoomingId === t.id ? "scale(9)" : zoomingId ? "scale(0.92)" : "scale(1)",
            opacity: zoomingId && zoomingId !== t.id ? 0 : 1,
            transition: `transform ${HOME_TILE_ZOOM_MS}ms ease, opacity ${HOME_TILE_ZOOM_MS}ms ease`,
            zIndex: zoomingId === t.id ? 30 : 1,
          }}
        >
          {/* blurred, centered background art */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: PAPER }}>
            <div style={{ filter: "blur(9px)", opacity: 0.5, width: "140%", height: "140%" }}>
              <t.Art accent={t.accent} />
            </div>
          </div>

          {/* frosted glass wash over the whole card */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(255,255,255,0.4)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
            <div style={{ color: t.accent }}>{t.icon}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: 0.5, color: INK, fontWeight: 700, textTransform: "uppercase" }}>
              {t.label}
            </div>
          </div>

          {!!t.badge && (
            <div
              className="absolute top-2.5 right-2.5 rounded-full text-[10px] px-1.5 py-0.5"
              style={{ fontFamily: FONT_MONO, background: RACE, color: "#fff" }}
            >
              {t.badge}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
