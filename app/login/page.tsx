"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, MUSTARD, gridBg, inputStyle } from "@/lib/design";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={gridBg}>
      <div className="w-full max-w-sm rounded-md p-6" style={{ background: "#F6F6EF", border: `1px solid ${INK}` }}>
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell size={20} color={INK} />
          <h1 className="text-xl uppercase tracking-wide" style={{ fontFamily: FONT_DISPLAY, color: INK, fontWeight: 700 }}>
            Dziennik Treningowy
          </h1>
        </div>
        <p className="text-xs mb-5" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
          Zaloguj się linkiem wysłanym na e-mail — bez hasła.
        </p>

        <input
          type="email"
          placeholder="twoj@email.pl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
          className="w-full px-3 py-2 rounded text-sm mb-3"
          style={inputStyle}
        />

        <button
          onClick={sendMagicLink}
          disabled={status === "sending"}
          className="w-full py-2.5 rounded-md text-sm"
          style={{ fontFamily: FONT_MONO, background: INK, color: "#fff", opacity: status === "sending" ? 0.6 : 1 }}
        >
          {status === "sending" ? "Wysyłanie…" : "Wyślij link logowania"}
        </button>

        {status === "sent" && (
          <div
            className="text-xs mt-3 px-2 py-1.5 rounded"
            style={{ fontFamily: FONT_MONO, color: MUSTARD, border: `1px solid ${MUSTARD}` }}
          >
            Sprawdź skrzynkę — wysłaliśmy link logowania na {email}.
          </div>
        )}
        {status === "error" && (
          <div
            className="text-xs mt-3 px-2 py-1.5 rounded"
            style={{ fontFamily: FONT_MONO, color: "#A6402F", border: `1px solid ${LINE}` }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
