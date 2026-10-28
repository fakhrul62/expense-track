"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/local-store";
import GoogleSignIn from "@/components/GoogleSignIn";
export default function AccountForm({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  async function googleSignIn(idToken: string, nonce: string) {
    if (busy) return;
    setBusy(true); setError("");
    try { await auth.googleSignIn(idToken, nonce); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email"));
    const password = String(values.get("password"));
    setBusy(true); setError("");
    try {
      if (register) await auth.register(String(values.get("name")), email, password);
      else await auth.login(email, password);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <main className="min-h-dvh flex items-center justify-center p-5">
    <section className="retro-box-lg p-6 w-full max-w-sm space-y-5">
      <h1 className="font-mono-retro text-2xl font-bold">EXPTRACK</h1>
      <h2 className="font-mono-retro font-bold">{register ? "CREATE ACCOUNT" : "SIGN IN"}</h2>
      <p className="text-sm opacity-75">Sign in with your email. Once signed in, you can track expenses offline on this device.</p>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <GoogleSignIn busy={busy} onCredential={googleSignIn} onError={setError} />
      <div className="flex items-center gap-3 text-xs opacity-75"><span className="h-px bg-current flex-1" />or use email<span className="h-px bg-current flex-1" /></div>
      <form onSubmit={submit} className="space-y-4">
        {register && <label className="block text-sm">Name<input name="name" autoComplete="name" maxLength={80} required className="retro-input mt-1" disabled={busy} /></label>}
        <label className="block text-sm">Email<input name="email" type="email" autoComplete="email" autoCapitalize="none" maxLength={254} required className="retro-input mt-1" disabled={busy} /></label>
        <div className="text-sm">
          <label htmlFor="account-password">Password</label>
          <div className="relative mt-1">
            <input id="account-password" name="password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : 1} maxLength={72} required className="retro-input pr-12" disabled={busy} />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={busy} onClick={() => setShowPassword(value => !value)} className="absolute right-0 top-0 h-full w-11 flex items-center justify-center">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {register && <p className="text-xs opacity-75">Use at least 8 characters.</p>}
        <button disabled={busy} className="retro-btn w-full font-mono-retro">{busy ? "PLEASE WAIT..." : register ? "CREATE ACCOUNT" : "SIGN IN"}</button>
      </form>
      <Link href={register ? "/login" : "/register"} onClick={e => { if (busy) e.preventDefault(); setError(""); }} className="block text-sm underline">{register ? "Already have an account? Sign in" : "Create an account"}</Link>
      <Link href="/privacy" className="block text-xs underline opacity-75">Privacy policy</Link>
    </section>
  </main>;
}
