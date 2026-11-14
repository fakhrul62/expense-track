"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { appUpdater, updateAvailable, type UpdateState } from "@/lib/app-updater";

interface Updates {
  platform: "loading" | "android" | "web";
  info: UpdateState | null;
  checked: boolean;
  available: boolean;
  publish: (value: UpdateState) => void;
  check: (force?: boolean) => Promise<UpdateState | null>;
  lock: <T>(operation: () => Promise<T>) => Promise<T>;
}
const UpdateContext = createContext<Updates | null>(null);
const INTERVAL = 60 * 60 * 1000;
export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [platform, setPlatform] = useState<Updates["platform"]>("loading");
  const [info, setInfo] = useState<UpdateState | null>(null);
  const [checked, setChecked] = useState(false);
  const state = useRef<UpdateState | null>(null);
  const mounted = useRef(false);
  const pending = useRef<Promise<UpdateState | null> | null>(null);
  const operating = useRef(false);
  const nextAttempt = useRef(0);
  const publish = useCallback((value: UpdateState) => {
    const available = updateAvailable(value);
    state.current = { ...value, available, ready: available && value.ready };
    if (mounted.current) setInfo(state.current);
  }, []);
  const check = useCallback((force = true): Promise<UpdateState | null> => {
    if (Capacitor.getPlatform() !== "android" || operating.current || (!force && !navigator.onLine)) return Promise.resolve(state.current);
    if (pending.current) return pending.current;
    let lastSuccess = 0;
    try { lastSuccess = Number(localStorage.getItem(`exptrack:update-check:${state.current?.currentCode}`)) || 0; } catch { /* Storage can be unavailable. */ }
    if (!force && (Date.now() < nextAttempt.current || (lastSuccess > 0 && lastSuccess <= Date.now() && Date.now() - lastSuccess < INTERVAL))) return Promise.resolve(state.current);
    nextAttempt.current = Date.now() + 5 * 60 * 1000;
    const request = appUpdater.check().then(value => {
      publish(value);
      if (mounted.current) setChecked(true);
      nextAttempt.current = Date.now() + INTERVAL;
      try { localStorage.setItem(`exptrack:update-check:${value.currentCode}`, String(Date.now())); } catch { /* Keep the in-memory cooldown. */ }
      return value;
    }).finally(() => { if (pending.current === request) pending.current = null; });
    pending.current = request;
    return request;
  }, [publish]);
  const lock = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (operating.current) throw new Error("An update operation is already running.");
    operating.current = true;
    try { await pending.current?.catch(() => null); return await operation(); }
    finally { operating.current = false; }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const android = Capacitor.getPlatform() === "android";
    const refresh = async () => {
      if (!android || operating.current) return;
      try {
        publish(await appUpdater.getState());
        if (mounted.current) await check(false);
      } catch { /* Passive checks stay quiet and preserve a cached update badge. */ }
    };
    void Promise.resolve().then(() => { if (mounted.current) { setPlatform(android ? "android" : "web"); void refresh(); } });
    const resume = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("exptrack:resume", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    const timer = window.setInterval(resume, INTERVAL);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener("exptrack:resume", resume); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, [check, publish]);
  return <UpdateContext.Provider value={{platform,info,checked,available:updateAvailable(info),publish,check,lock}}>{children}</UpdateContext.Provider>;
}
export function useUpdates() {
  const value = useContext(UpdateContext);
  if (!value) throw new Error("Update provider unavailable");
  return value;
}
