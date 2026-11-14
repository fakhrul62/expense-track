"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { appUpdater as updater } from "@/lib/app-updater";
import { useUpdates } from "@/context/UpdateContext";
import { Download, RefreshCw } from "lucide-react";
import { errorMessage } from "@/lib/local-store";

export default function AppUpdates() {
  const { platform, info, publish: setInfo, checked, check: checkUpdate, lock } = useUpdates();
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const running = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const android = Capacitor.getPlatform() === "android";
    const listener = android ? updater.addListener("downloadProgress", event => { if (mounted.current) setProgress(event.percent); }) : null;
    return () => { mounted.current = false; void listener?.then(handle => handle.remove()).catch(() => undefined); };
  }, []);
  async function check() {
    if (running.current) return;
    running.current = true; setBusy("checking"); setError(""); setMessage("");
    try { const result = await checkUpdate(); if (mounted.current && result) setInfo(result); }
    catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { running.current = false; if (mounted.current) setBusy(""); }
  }
  async function install() {
    if (running.current || !info?.available) return;
    running.current = true; setError(""); setMessage("");
    try { await lock(async () => {
      // A passive check may have completed while this action waited for the lock.
      const latest = await updater.getState();
      if (mounted.current) setInfo(latest);
      if (!latest.available) { if (mounted.current) setMessage("You’re up to date."); return; }
      if (!latest.ready) { setBusy("downloading"); setProgress(0); const downloaded = await updater.download(); if (mounted.current) setInfo(downloaded); }
      if (!mounted.current) return;
      setBusy("installing");
      const result = await updater.install();
      if (mounted.current) setMessage(result.status === "permission" ? "Allow updates from EXPTRACK in Android Settings, then return and tap Install update." : "Confirm the update in Android’s installer. If you cancel, you can install it here later.");
    }); } catch (e) { if (mounted.current) setError(errorMessage(e)); }
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
