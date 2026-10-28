"use client";
import { useEffect, useRef, useState } from "react";
import { GoogleAuth, googleChallenge, googleConfiguration, loadGoogleIdentity, nativeGoogle } from "@/lib/google-client";
import { errorMessage } from "@/lib/local-store";

export default function GoogleSignIn({ busy, onCredential, onError }: { busy: boolean; onCredential: (token: string, nonce: string) => Promise<void>; onError: (message: string) => void }) {
  const slot = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onCredential, onError, busy });
  useEffect(() => { callbacks.current = { onCredential, onError, busy }; }, [onCredential, onError, busy]);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [requesting, setRequesting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    async function prepare() {
      try {
        const { clientId } = await googleConfiguration();
        if (!active) return;
        if (!clientId) { setStatus("unavailable"); return; }
        if (nativeGoogle()) { setStatus("ready"); return; }
        const google = await loadGoogleIdentity();
        async function render() {
          if (!active || callbacks.current.busy) return;
          const challenge = await googleChallenge();
          if (!active || !slot.current) return;
          google.accounts.id.initialize({ client_id: challenge.clientId, nonce: challenge.nonce, auto_select: false, callback: response => {
            if (active && !callbacks.current.busy) void callbacks.current.onCredential(response.credential, challenge.nonce);
          } });
          slot.current.replaceChildren();
          google.accounts.id.renderButton(slot.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", width: Math.min(300, slot.current.clientWidth) });
          setStatus("ready");
        }
        await render();
        timer = setInterval(() => { void render().catch(e => { if (active) { setStatus("error"); callbacks.current.onError(errorMessage(e)); } }); }, 4 * 60000);
      } catch (e) { if (active) { setStatus("error"); callbacks.current.onError(errorMessage(e)); } }
    }
    void prepare();
    return () => { active = false; clearInterval(timer); };
  }, [attempt]);
  async function signIn() {
    if (busy || requesting) return;
    setRequesting(true);
    try {
      const challenge = await googleChallenge();
      const { idToken } = await GoogleAuth.signIn(challenge);
      await onCredential(idToken, challenge.nonce);
    } catch (e) {
      if (!(typeof e === "object" && e !== null && "code" in e && e.code === "CANCELLED")) onError(errorMessage(e));
    } finally { setRequesting(false); }
  }
  return <div className="space-y-2">
    {nativeGoogle() ? <button type="button" disabled={busy || requesting || status !== "ready"} onClick={() => void signIn()} className="w-full min-h-11 px-3 bg-white text-[#1f1f1f] border border-[#747775] rounded flex justify-center items-center gap-3 text-sm font-medium">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
      {requesting ? "Connecting to Google..." : "Continue with Google"}
    </button> : <div ref={slot} aria-label="Google sign-in" inert={busy} className="min-h-11 flex justify-center" />}
    {status === "loading" && <p className="text-xs text-center opacity-75">Loading Google sign-in...</p>}
    {status === "unavailable" && <p className="text-xs text-center opacity-75">Google sign-in is not available yet. Use email and password.</p>}
    {status === "error" && <button type="button" className="text-xs underline" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Retry Google sign-in</button>}
  </div>;
}
