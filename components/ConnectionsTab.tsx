"use client";

import { useState } from "react";
import { Activity, Check, Link2Off } from "lucide-react";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE } from "@/lib/design";
import type { CoachAccess } from "@/lib/types";
import { CoachTab } from "./CoachTab";
import { GarminConnect } from "./GarminConnect";
import { STRAVA_ORANGE } from "./StravaConnect";

const sectionHeading = { fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600, marginBottom: 8 } as const;

function StravaSection({ connected, onDisconnect }: { connected: boolean; onDisconnect: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function handleDisconnect() {
    setBusy(true);
    try {
      await onDisconnect();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mb-4 p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5" style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>
          {connected ? <Check size={14} color={STRAVA_ORANGE} /> : <Activity size={14} color={STRAVA_ORANGE} />}
          {connected ? "Strava połączona — nowe biegi importują się automatycznie" : "Strava niepołączona"}
        </div>
        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ fontFamily: FONT_MONO, color: INK_SOFT, border: `1px solid ${LINE}` }}
          >
            <Link2Off size={12} /> Rozłącz
          </button>
        ) : (
          <a
            href="/api/strava/authorize"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ fontFamily: FONT_MONO, color: STRAVA_ORANGE, border: `1px solid ${STRAVA_ORANGE}` }}
          >
            <Activity size={12} /> Połącz ze Stravą
          </a>
        )}
      </div>
    </div>
  );
}

// The former "Trener" tile broadened into a general connections hub:
// coach access (unchanged, see CoachTab) plus the two external data
// sources — Garmin (manual login, so it needs its own connect/sync card)
// and Strava (OAuth, so just status + disconnect).
export function ConnectionsTab({
  coachGrants,
  pendingInvites,
  athletesForCoach,
  newCoachEmail,
  setNewCoachEmail,
  inviteError,
  onInvite,
  onAccept,
  onTogglePermission,
  onRevoke,
  garminConnected,
  garminLastSyncedAt,
  garminLastSyncError,
  stravaConnected,
  onDisconnectStrava,
}: {
  coachGrants: CoachAccess[];
  pendingInvites: CoachAccess[];
  athletesForCoach: CoachAccess[];
  newCoachEmail: string;
  setNewCoachEmail: (v: string) => void;
  inviteError: string | null;
  onInvite: () => void;
  onAccept: (id: string) => void;
  onTogglePermission: (id: string, field: "canViewWorkouts" | "canViewReports" | "canEditPlan", value: boolean) => void;
  onRevoke: (id: string) => void;
  garminConnected: boolean;
  garminLastSyncedAt: string | null;
  garminLastSyncError: string | null;
  stravaConnected: boolean;
  onDisconnectStrava: () => Promise<void>;
}) {
  return (
    <div>
      <div className="mb-6">
        <div style={sectionHeading}>GARMIN CONNECT</div>
        <GarminConnect connected={garminConnected} lastSyncedAt={garminLastSyncedAt} lastSyncError={garminLastSyncError} />
      </div>

      <div className="mb-6">
        <div style={sectionHeading}>STRAVA</div>
        <StravaSection connected={stravaConnected} onDisconnect={onDisconnectStrava} />
      </div>

      <CoachTab
        coachGrants={coachGrants}
        pendingInvites={pendingInvites}
        athletesForCoach={athletesForCoach}
        newCoachEmail={newCoachEmail}
        setNewCoachEmail={setNewCoachEmail}
        inviteError={inviteError}
        onInvite={onInvite}
        onAccept={onAccept}
        onTogglePermission={onTogglePermission}
        onRevoke={onRevoke}
      />
    </div>
  );
}
