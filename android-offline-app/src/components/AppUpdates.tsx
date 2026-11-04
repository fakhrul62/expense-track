"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { Download, RefreshCw } from "lucide-react";
import { errorMessage } from "@/lib/local-store";

interface UpdateState { currentVersion: string; currentCode: number; latestVersion?: string; latestCode?: number; available: boolean; ready: boolean; canInstall: boolean }
interface Updater {
  getState(): Promise<UpdateState>;
  check(): Promise<UpdateState>;
  download(): Promise<UpdateState>;
  install(): Promise<{ status: "permission" | "installer" }>;
  cancelDownload(): Promise<void>;
  addListener(name: "downloadProgress", listener: (event: {percent: number}) => void): Promise<PluginListenerHandle>;
}
const updater = registerPlugin<Updater>("AppUpdater");

export default function AppUpdates() {
  const [platform, setPlatform] = useState("loading");
  const [info, setInfo] = useState<UpdateState | null>(null);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const running = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const android = Capacitor.getPlatform() === "android";
    void Promise.resolve().then(async () => {
      if (!mounted.current) return;
      setPlatform(android ? "android" : "web");
      if (android) { const result = await updater.getState(); if (mounted.current) setInfo(result); }
    }).catch(e => { if (mounted.current) setError(errorMessage(e)); });
    const listener = android ? updater.addListener("downloadProgress", event => { if (mounted.current) setProgress(event.percent); }) : null;
    const resume = () => { if (android && !running.current) void updater.getState().then(value => { if (mounted.current) setInfo(value); }).catch(e => { if (mounted.current) setError(errorMessage(e)); }); };
    window.addEventListener("exptrack:resume", resume);
    return () => { mounted.current = false; window.removeEventListener("exptrack:resume", resume); void listener?.then(handle => handle.remove()); };
  }, []);
  async function check() {
    if (running.current) return;
    running.current = true; setBusy("checking"); setError(""); setMessage("");
    try { const result = await updater.check(); if (mounted.current) { setInfo(result); setChecked(true); } }
    catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { running.current = false; if (mounted.current) setBusy(""); }
  }
  async function install() {
    if (running.current || !info?.available) return;
    running.current = true; setError(""); setMessage("");
    try {
      if (!info.ready) { setBusy("downloading"); setProgress(0); const downloaded = await updater.download(); if (mounted.current) setInfo(downloaded); }
      if (!mounted.current) return;
      setBusy("installing");
      const result = await updater.install();
      if (mounted.current) setMessage(result.status === "permission" ? "Allow updates from EXPTRACK in Android Settings, then return and tap Install update." : "Confirm the update in Android’s installer. If you cancel, you can install it here later.");
    } catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { running.current = false; if (mounted.current) setBusy(""); }
  }
  return <section className="retro-box-lg p-5 space-y-3" aria-labelledby="app-updates-heading">
    <div className="flex items-center justify-between gap-3"><h2 id="app-updates-heading" className="font-mono-retro font-bold text-sm">APP UPDATES</h2>{info && <span className="font-mono-retro text-xs opacity-70">v{info.currentVersion}</span>}</div>
    {platform === "loading" ? <p className="text-xs opacity-70">Loading update settings…</p> : platform === "web" ? <p className="text-xs opacity-70">Install app updates from Config in the Android app. This website updates automatically.</p> : <>
      <p className="text-xs opacity-75">Check the EXPTRACK GitHub repository for a newer Android version.</p>
      {info?.available && <p role="status" className="font-mono-retro text-sm font-bold">VERSION {info.latestVersion} AVAILABLE</p>}
      {checked && info && !info.available && <p role="status" className="text-sm">{(info.latestCode ?? 0) < info.currentCode ? "This version is newer than the published release." : "You’re up to date."}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!!busy} onClick={() => void check()} className="retro-btn-secondary px-3 text-xs font-mono-retro gap-2"><RefreshCw size={15} className={busy === "checking" ? "animate-spin" : ""} />{busy === "checking" ? "CHECKING…" : "CHECK FOR UPDATES"}</button>
        {info?.available && <button type="button" disabled={!!busy} onClick={() => void install()} className="retro-btn px-3 text-xs font-mono-retro gap-2"><Download size={15} />{busy === "downloading" ? `DOWNLOADING ${progress}%` : busy === "installing" ? "OPENING INSTALLER…" : info.ready ? "INSTALL UPDATE" : "DOWNLOAD & INSTALL"}</button>}
      </div>
      {busy === "downloading" && <div className="space-y-2"><progress aria-label="Update download progress" value={progress} max={100} className="w-full accent-orange-600" /><button type="button" className="text-xs underline" onClick={() => void updater.cancelDownload()}>Cancel download</button></div>}
      {message && <p role="status" className="text-xs opacity-75">{message}</p>}
      <p className="text-xs opacity-60">Your records stay in place. Android asks you to approve installation.</p>
    </>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
