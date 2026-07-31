"use client";

import { Activity, Check } from "lucide-react";
import { FONT_MONO, MUSTARD } from "@/lib/design";

const STRAVA_ORANGE = "#FC5200";

export function StravaConnect({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
        style={{ fontFamily: FONT_MONO, color: MUSTARD, border: `1px solid ${MUSTARD}` }}
        title="Konto Strava połączone — nowe biegi importują się automatycznie"
      >
        <Check size={12} /> Strava
      </span>
    );
  }
  return (
    <a
      href="/api/strava/authorize"
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
      style={{ fontFamily: FONT_MONO, color: STRAVA_ORANGE, border: `1px solid ${STRAVA_ORANGE}` }}
    >
      <Activity size={12} /> Połącz ze Stravą
    </a>
  );
}

export { STRAVA_ORANGE };
