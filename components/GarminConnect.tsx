"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Link2Off, Loader2, RefreshCw, Watch } from "lucide-react";
import { CARD, FONT_MONO, HEALTH, INK, INK_SOFT, LINE, RUST, inputStyle } from "@/lib/design";

// Garmin has no OAuth to piggyback on (see lib/garmin.ts), so connecting
// means handing the app a real Garmin Connect login — this card is upfront
// about that trade-off and surfaces sync results/errors inline, since a
// login can fail for reasons the athlete needs to actually act on (MFA,
// locked account, ...), not just "try again".
export function GarminConnect({
  connected,
  lastSyncedAt,
  lastSyncError,
}: {
  connected: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleConnect() {
    if (!username.trim() || !password) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/garmin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się połączyć.");
        return;
      }
      setPassword("");
      setOpen(false);
      setMessage(
        data.syncedFields?.length
          ? `Połączono i zsynchronizowano: ${data.syncedFields.join(", ")}.`
          : "Połączono z Garmin Connect."
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/garmin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Synchronizacja nie powiodła się.");
        return;
      }
      setMessage(data.syncedFields?.length ? `Zsynchronizowano: ${data.syncedFields.join(", ")}.` : "Brak nowych danych z Garmina na dziś.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fetch("/api/garmin/disconnect", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (connected) {
    return (
      <div className="mb-4 p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5" style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>
            <Check size={14} color={HEALTH} />
            Garmin Connect połączony
            {lastSyncedAt && (
              <span style={{ color: INK_SOFT }}>
                · ostatnia synchronizacja {new Date(lastSyncedAt).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={busy}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ fontFamily: FONT_MONO, color: HEALTH, border: `1px solid ${HEALTH}` }}
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Synchronizuj teraz
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="flex items-center gap-1 text-xs"
              style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
            >
              <Link2Off size={12} /> Odłącz
            </button>
          </div>
        </div>
        {lastSyncError && !message && (
          <div className="mt-1.5 text-xs" style={{ fontFamily: FONT_MONO, color: RUST }}>
            Ostatnia synchronizacja nie powiodła się: {lastSyncError}
          </div>
        )}
        {error && <div className="mt-1.5 text-xs" style={{ fontFamily: FONT_MONO, color: RUST }}>{error}</div>}
        {message && <div className="mt-1.5 text-xs" style={{ fontFamily: FONT_MONO, color: HEALTH }}>{message}</div>}
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs" style={{ fontFamily: FONT_MONO, color: INK }}>
          <Watch size={14} color={HEALTH} /> Połącz z Garmin Connect (automatyczne HRV, sen, tętno, waga)
        </button>
      ) : (
        <div>
          <div className="text-xs mb-2" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
            Nieoficjalne połączenie z Garmin Connect — aplikacja zapamięta login i hasło (zaszyfrowane), żeby móc pobierać dane. Jeśli
            masz włączone MFA na koncie Garmin, wyłącz je najpierw na connect.garmin.com.
          </div>
          <div className="flex flex-col gap-1.5 mb-2">
            <input
              type="email"
              placeholder="E-mail Garmin Connect"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-2 py-1.5 rounded text-sm"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="px-2 py-1.5 rounded text-sm"
              style={inputStyle}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConnect}
              disabled={busy || !username.trim() || !password}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ fontFamily: FONT_MONO, color: HEALTH, border: `1px solid ${HEALTH}` }}
            >
              {busy && <Loader2 size={12} className="animate-spin" />} Połącz
            </button>
            <button onClick={() => setOpen(false)} disabled={busy} className="text-xs" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
              Anuluj
            </button>
          </div>
          {error && <div className="mt-1.5 text-xs" style={{ fontFamily: FONT_MONO, color: RUST }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
