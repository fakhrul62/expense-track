"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { selectAccount, errorMessage } from "@/lib/local-store";
import { MotionConfig } from "framer-motion";
import { AccountError, accountRequest, readSession, writeSession, type AccountSession } from "@/lib/account-client";
import AccountForm from "@/components/AccountForm";
import { usePathname, useRouter } from "next/navigation";
interface AuthState {
  user: AccountSession["user"] | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<AccountSession | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    readSession().then(async saved => {
      if (saved) { await selectAccount(saved.user.id); setSession(saved); }
    }).catch(e => setError(errorMessage(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (session && ["/login", "/login/", "/register", "/register/"].includes(pathname)) router.replace("/");
  }, [session, pathname, router]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const validate = async () => {
      if (Date.parse(session.expiresAt) <= Date.now()) {
        await writeSession(null);
        if (active) setSession(null);
        return;
      }
      if (!navigator.onLine) return;
      try { await accountRequest("me", undefined, session); }
      catch (e) {
        if (active && e instanceof AccountError && e.status === 401) {
          await writeSession(null);
          if (active) setSession(null);
        }
      }
    };
    void validate();
    const listener = () => { void validate(); };
    window.addEventListener("online", listener);
    window.addEventListener("exptrack:resume", listener);
    const timer = window.setInterval(listener, 60000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("online", listener); window.removeEventListener("exptrack:resume", listener); };
  }, [session]);
  const authenticate = async (action: string, input: Record<string, string>) => {
    const saved = await accountRequest(action, input);
    await selectAccount(saved.user.id);
    await writeSession(saved);
    setSession(saved);
    router.replace("/");
  };
  const logout = async () => {
    // Local logout always works offline; remotely revoke the session when reachable.
    await writeSession(null);
    setSession(null);
    void accountRequest("logout", undefined, session).catch(() => undefined);
    router.replace("/login");
  };
  if (error) return <main className="p-6 max-w-lg mx-auto space-y-4"><h1 className="font-bold">Could not open your expenses</h1><p role="alert">{error}</p><button className="retro-btn px-4" onClick={() => location.reload()}>Try again</button></main>;
  const value = { user: session?.user ?? null, loading, login: (email: string, password: string) => authenticate("login", { email, password }), register: (name: string, email: string, password: string) => authenticate("register", { name, email, password }), logout };
  return <AuthContext.Provider value={value}><MotionConfig reducedMotion="user">
    {loading ? <p className="p-6 font-mono-retro">OPENING EXPTRACK...</p> : session ? <React.Fragment key={session.user.id}>{children}</React.Fragment> : <AccountForm key={pathname} register={pathname.startsWith("/register")} />}
  </MotionConfig></AuthContext.Provider>;
}
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Account provider unavailable");
  return context;
};
