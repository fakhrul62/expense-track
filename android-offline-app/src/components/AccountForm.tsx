"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/local-store";
export default function AccountForm({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
      <form onSubmit={submit} className="space-y-4">
        {register && <label className="block text-sm">Name<input name="name" autoComplete="name" maxLength={80} required className="retro-input mt-1" disabled={busy} /></label>}
        <label className="block text-sm">Email<input name="email" type="email" autoComplete="email" autoCapitalize="none" maxLength={254} required className="retro-input mt-1" disabled={busy} /></label>
        <label className="block text-sm">Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : 1} maxLength={72} required className="retro-input mt-1" disabled={busy} /></label>
        {register && <p className="text-xs opacity-75">Use at least 8 characters.</p>}
        <button disabled={busy} className="retro-btn w-full font-mono-retro">{busy ? "PLEASE WAIT..." : register ? "CREATE ACCOUNT" : "SIGN IN"}</button>
      </form>
      <Link href={register ? "/login" : "/register"} onClick={e => { if (busy) e.preventDefault(); setError(""); }} className="block text-sm underline">{register ? "Already have an account? Sign in" : "Create an account"}</Link>
    </section>
  </main>;
}
