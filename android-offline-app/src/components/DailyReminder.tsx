"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/local-store";
import { setDailyReminder, syncDailyReminder, type ReminderStatus } from "@/lib/daily-reminder";

export default function DailyReminder() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ReminderStatus>("unsupported");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    let active = true;
    const refresh = () => { void syncDailyReminder(user.id).then(value => { if (active) setStatus(value); }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setBusy(false); }); };
    refresh();
    window.addEventListener("exptrack:resume", refresh);
    return () => { active = false; window.removeEventListener("exptrack:resume", refresh); };
  }, [user]);
  async function toggle() {
    if (!user) return;
    setBusy(true); setError("");
    try { setStatus(await setDailyReminder(user.id, status !== "enabled")); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <section className="retro-box-lg p-5 space-y-3">
    <h2 className="font-mono-retro font-bold text-sm">DAILY SPENDING REMINDER</h2>
    <p className="text-sm">A reminder every day around 8:30 PM, using your device&apos;s local time.</p>
    {status === "unsupported" ? <p className="text-xs opacity-75">Daily background notifications are available in the Android app.</p> : <>
      <button role="switch" aria-checked={status === "enabled"} disabled={busy} onClick={() => void toggle()} className="retro-btn-secondary px-4 text-sm">{busy ? "PLEASE WAIT..." : status === "enabled" ? "REMINDER ON" : "ENABLE REMINDER"}</button>
      <p role="status" className="text-xs opacity-75">{status === "blocked" ? "Notifications are blocked. Allow notifications for EXPTRACK in Android Settings, then enable the reminder." : status === "enabled" ? "Scheduled on this device. Works offline with the app closed. Android battery settings may delay delivery." : "Daily reminder is turned off."}</p>
    </>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
