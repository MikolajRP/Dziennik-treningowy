"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, RUST, gridBg, inputStyle } from "@/lib/design";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("idle");
    setStep("code");
  }

  async function verifyCode() {
    if (!code.trim()) return;
    setStatus("verifying");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    window.location.assign("/");
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

        {step === "email" ? (
          <>
            <p className="text-xs mb-5" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
              Zaloguj się kodem wysłanym na e-mail — bez hasła.
            </p>
            <input
              type="email"
              placeholder="twoj@email.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
              className="w-full px-3 py-2 rounded text-sm mb-3"
              style={inputStyle}
            />
            <button
              onClick={sendCode}
              disabled={status === "sending"}
              className="w-full py-2.5 rounded-md text-sm"
              style={{ fontFamily: FONT_MONO, background: INK, color: "#fff", opacity: status === "sending" ? 0.6 : 1 }}
            >
              {status === "sending" ? "Wysyłanie…" : "Wyślij kod logowania"}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs mb-5" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
              Wysłaliśmy 6-cyfrowy kod na {email}. Wpisz go poniżej.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verifyCode()}
              className="w-full px-3 py-2 rounded text-sm mb-3 text-center tracking-[0.3em]"
              style={inputStyle}
            />
            <button
              onClick={verifyCode}
              disabled={status === "verifying"}
              className="w-full py-2.5 rounded-md text-sm"
              style={{ fontFamily: FONT_MONO, background: INK, color: "#fff", opacity: status === "verifying" ? 0.6 : 1 }}
            >
              {status === "verifying" ? "Sprawdzanie…" : "Zaloguj się"}
            </button>
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setStatus("idle");
                  setError(null);
                }}
                className="text-xs"
                style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
              >
                Zmień e-mail
              </button>
              <button onClick={sendCode} className="text-xs" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
                Wyślij ponownie
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <div
            className="text-xs mt-3 px-2 py-1.5 rounded"
            style={{ fontFamily: FONT_MONO, color: RUST, border: `1px solid ${LINE}` }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
