"use client";

import { useState } from "react";
import { Check, ExternalLink, Trash2, UserPlus } from "lucide-react";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, MUSTARD, RUST, TEAL, inputStyle } from "@/lib/design";
import type { CoachAccess } from "@/lib/types";
import { IconBtn } from "./atoms";

const STATUS_LABEL_PL: Record<CoachAccess["status"], string> = {
  pending: "oczekuje",
  active: "aktywny",
  revoked: "cofnięty",
};

export function CoachTab({
  coachGrants,
  pendingInvites,
  athletesForCoach,
  newCoachEmail,
  setNewCoachEmail,
  onInvite,
  onAccept,
  onTogglePermission,
  onRevoke,
}: {
  coachGrants: CoachAccess[];
  pendingInvites: CoachAccess[];
  athletesForCoach: CoachAccess[];
  newCoachEmail: string;
  setNewCoachEmail: (v: string) => void;
  onInvite: () => void;
  onAccept: (id: string) => void;
  onTogglePermission: (id: string, field: "canViewWorkouts" | "canViewReports", value: boolean) => void;
  onRevoke: (id: string) => void;
}) {
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  return (
    <div>
      {pendingInvites.length > 0 && (
        <div className="mb-6">
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600, marginBottom: 8 }}>
            ZAPROSZENIA DO CIEBIE
          </div>
          <div className="space-y-1.5">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-md" style={{ background: "#FBF6EC", border: `1px solid ${MUSTARD}` }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>
                  Zaproszenie od <span className="font-semibold">{inv.athleteEmail}</span> — zostań trenerem
                </div>
                <button
                  onClick={() => onAccept(inv.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs"
                  style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}
                >
                  <Check size={13} /> Akceptuj
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {athletesForCoach.length > 0 && (
        <div className="mb-6">
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600, marginBottom: 8 }}>
            PODOPIECZNI
          </div>
          <div className="space-y-1.5">
            {athletesForCoach.map((a) => (
              <a
                key={a.id}
                href={`/coach/${a.athleteUserId}`}
                className="flex items-center justify-between p-2.5 rounded-md"
                style={{ background: CARD, border: `1px solid ${LINE}` }}
              >
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>{a.athleteEmail}</div>
                <ExternalLink size={14} color={INK_SOFT} />
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600, marginBottom: 8 }}>
          TWÓJ TRENER
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT, marginBottom: 10 }}>
          Zaproś trenera po e-mailu — dostanie wgląd w Twoje treningi i statystyki (osobne konto, bez dostępu do
          hasła ani do Twojego logowania).
        </div>
        <div className="flex gap-1.5 mb-4">
          <input
            type="email"
            placeholder="e-mail trenera"
            value={newCoachEmail}
            onChange={(e) => setNewCoachEmail(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded text-sm"
            style={inputStyle}
          />
          <button
            onClick={onInvite}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm"
            style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}
          >
            <UserPlus size={14} /> Zaproś
          </button>
        </div>

        {coachGrants.length === 0 && (
          <div className="text-center py-6" style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 13 }}>
            Nie masz jeszcze zaproszonego trenera.
          </div>
        )}

        <div className="space-y-1.5">
          {coachGrants.map((g) => (
            <div key={g.id} className="p-2.5 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600 }}>{g.coachEmail}</div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px]"
                    style={{
                      fontFamily: FONT_MONO,
                      border: `1px solid ${g.status === "active" ? TEAL : INK_SOFT}`,
                      color: g.status === "active" ? TEAL : INK_SOFT,
                    }}
                  >
                    {STATUS_LABEL_PL[g.status]}
                  </span>
                  {confirmRevokeId === g.id ? (
                    <button
                      onClick={() => onRevoke(g.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ fontFamily: FONT_MONO, background: RUST, color: "#fff" }}
                    >
                      Na pewno cofnąć?
                    </button>
                  ) : (
                    <IconBtn onClick={() => setConfirmRevokeId(g.id)} title="Cofnij dostęp" color={RUST}>
                      <Trash2 size={14} />
                    </IconBtn>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
                  <input
                    type="checkbox"
                    checked={g.canViewWorkouts}
                    onChange={(e) => onTogglePermission(g.id, "canViewWorkouts", e.target.checked)}
                  />
                  widzi treningi
                </label>
                <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
                  <input
                    type="checkbox"
                    checked={g.canViewReports}
                    onChange={(e) => onTogglePermission(g.id, "canViewReports", e.target.checked)}
                  />
                  widzi statystyki
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
