"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/context/AuthContext";
import { readSession } from "@/lib/account-client";
import { applyCloudSync, currentStoreAccount, pendingSync, errorMessage } from "@/lib/local-store";
import type { SyncResponse } from "@/lib/sync-types";

interface SyncState { status: "syncing" | "synced" | "offline" | "error"; pending: number; message: string; lastSynced: string; syncNow: () => void }
const SyncContext = createContext<SyncState | null>(null);
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<SyncState, "syncNow">>({ status: "syncing", pending: 0, message: "", lastSynced: "" });
  const trigger = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!user) return;
    let active = true;
    let running = false;
    let runAgain = false;
    let fingerprint = "";
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    const accountId = user.id;
    const isCurrent = () => active && currentStoreAccount() === accountId;
    async function sync() {
      if (!isCurrent()) return;
      if (running) { runAgain = true; return; }
      running = true;
      try {
        let changes = await pendingSync(accountId);
        if (!isCurrent()) return;
        if (!navigator.onLine) { setState(previous => ({ ...previous, status: "offline", pending: changes.length, message: "Saved on this device. Sync resumes when online." })); return; }
        const session = await readSession();
        if (!session || session.user.id !== accountId || !isCurrent()) return;
        setState(previous => ({ ...previous, status: "syncing", pending: changes.length, message: "" }));
        const warnings = new Set<string>();
        for (let batch = 0; batch < 20; batch++) {
          const mutations = changes.slice(0, 100);
          // AbortSignal.any is unavailable in some supported Android WebViews.
          const requestAbort = new AbortController();
          const cancelRequest = () => requestAbort.abort();
          abort.signal.addEventListener("abort", cancelRequest, { once: true });
          if (abort.signal.aborted) cancelRequest();
          const timeout = setTimeout(cancelRequest, 45000);
          let result: SyncResponse & { error?: string };
          try {
            const response = await fetch(`${Capacitor.isNativePlatform() ? "https://expense-track-lovat.vercel.app" : ""}/api/sync/`, {
            method: "POST", credentials: Capacitor.isNativePlatform() ? "omit" : "include",
            headers: { "Content-Type": "application/json", ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}) },
            body: JSON.stringify({ mutations }), signal: requestAbort.signal,
            });
            result = await response.json() as SyncResponse & { error?: string };
            if (!response.ok) throw new Error(result.error ?? "Could not sync. Your entries remain saved here.");
          } finally {
            clearTimeout(timeout);
            abort.signal.removeEventListener("abort", cancelRequest);
          }
          if (!isCurrent()) return;
          const nextFingerprint = JSON.stringify([result.categories, result.expenses, result.deleted, result.aliases]);
          if (mutations.length || fingerprint !== nextFingerprint) {
            await applyCloudSync(accountId, result);
            if (!isCurrent()) return;
            window.dispatchEvent(new Event("exptrack:cloud-change"));
            fingerprint = nextFingerprint;
          }
          for (const warning of result.warnings) warnings.add(warning);
          changes = await pendingSync(accountId);
          if (!changes.length) break;
        }
        if (!isCurrent()) return;
        const lastSynced = new Date().toISOString();
        localStorage.setItem(`exptrack:last-sync:${accountId}`, lastSynced);
        setState({ status: changes.length ? "syncing" : "synced", pending: changes.length, message: [...warnings].join(" "), lastSynced });
        if (changes.length) runAgain = true;
      } catch (error) {
        if (isCurrent() && !abort.signal.aborted) setState(previous => ({ ...previous, status: navigator.onLine ? "error" : "offline", message: errorMessage(error) }));
      } finally {
        running = false;
        if (runAgain && isCurrent()) { runAgain = false; debounce = setTimeout(() => { void sync(); }, 500); }
      }
    }
    const request = () => { clearTimeout(debounce); debounce = setTimeout(() => { void sync(); }, 400); };
    const visible = () => { if (document.visibilityState === "visible") request(); };
    trigger.current = request;
    void sync();
    window.addEventListener("exptrack:local-change", request);
    window.addEventListener("online", request);
    window.addEventListener("offline", request);
    window.addEventListener("exptrack:resume", request);
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(visible, 30000);
    return () => {
      active = false; abort.abort(); clearTimeout(debounce); clearInterval(timer); trigger.current = () => undefined;
      window.removeEventListener("exptrack:local-change", request); window.removeEventListener("online", request); window.removeEventListener("offline", request); window.removeEventListener("exptrack:resume", request); document.removeEventListener("visibilitychange", visible);
    };
  }, [user]);
  const syncNow = useCallback(() => trigger.current(), []);
  return <SyncContext.Provider value={{ ...state, syncNow }}>{children}</SyncContext.Provider>;
}
export function useSync() {
  const value = useContext(SyncContext);
  if (!value) throw new Error("Sync provider unavailable");
  return value;
}
