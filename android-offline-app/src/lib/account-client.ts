import { Capacitor } from "@capacitor/core";
import { nativeStore as storage } from "@/lib/local-store";
export interface AccountSession { user: { id: string; name: string; email: string }; expiresAt: string; token?: string }
export class AccountError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const native = () => Capacitor.isNativePlatform();
export async function readSession(): Promise<AccountSession | null> {
  const value = native() ? (await storage.readSession()).value : localStorage.getItem("exptrack-account");
  if (!value) return null;
  try {
    const session = JSON.parse(value);
    if (!/^[a-f0-9]{24}$/.test(session.user?.id) || typeof session.user?.email !== "string" || Date.parse(session.expiresAt) <= Date.now() || !Number.isFinite(Date.parse(session.expiresAt))) return null;
    return session;
  } catch { return null; }
}
export async function writeSession(session: AccountSession | null) {
  if (native()) await storage.writeSession({ ...(session ? { value: JSON.stringify(session) } : {}) });
  else if (session) localStorage.setItem("exptrack-account", JSON.stringify(session));
  else localStorage.removeItem("exptrack-account");
}
export async function accountRequest(action: string, input?: Record<string, string>, session?: AccountSession | null): Promise<AccountSession> {
  const base = native() ? "https://expense-track-lovat.vercel.app" : "";
  try {
    const response = await fetch(`${base}/api/auth/${action}/`, {
      method: action === "me" ? "GET" : "POST",
      credentials: native() ? "omit" : "include",
      headers: { "Content-Type": "application/json", ...(native() ? { "X-EXPTRACK-Client": "android" } : {}), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
      ...(input ? { body: JSON.stringify(input) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok) throw new AccountError(result.error ?? "Could not sign in.", response.status);
    return result;
  } catch (error) {
    if (error instanceof TypeError || error instanceof DOMException) throw new Error("Connect to the internet to sign in or create an account.");
    throw error;
  }
}
