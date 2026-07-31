"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FONT_MONO, INK, INK_SOFT, RUST, gridBg } from "@/lib/design";

// Confirms a Supabase auth link. Supabase's default (unedited) email
// templates route through its own /auth/v1/verify endpoint, which redirects
// back here with the session tokens in the URL *hash fragment* — invisible
// to a server route, so this has to run client-side. Also handles a
// customized template's token_hash/type query params and a PKCE `code`
// param, in case those are set up later.
export default function ConfirmPage() {
  const [status, setStatus] = useState<"working" | "error">("working");

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) {
          window.location.assign("/");
          return;
        }
        setStatus("error");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const type = params.get("type");
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "email" | "magiclink" | "signup" | "invite" | "recovery" | "email_change",
        });
        if (!error) {
          window.location.assign("/");
          return;
        }
        setStatus("error");
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.location.assign("/");
          return;
        }
        setStatus("error");
        return;
      }

      setStatus("error");
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={gridBg}>
      <div className="w-full max-w-sm rounded-md p-6 text-center" style={{ background: "#F6F6EF", border: `1px solid ${INK}` }}>
        {status === "working" ? (
          <div style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 13 }}>Logowanie…</div>
        ) : (
          <>
            <div style={{ fontFamily: FONT_MONO, color: RUST, fontSize: 13, marginBottom: 12 }}>
              Link wygasł albo już był użyty. Poproś o nowy link logowania.
            </div>
            <a
              href="/login"
              className="inline-block px-4 py-2 rounded-md text-sm"
              style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}
            >
              Wróć do logowania
            </a>
          </>
        )}
      </div>
    </div>
  );
}
