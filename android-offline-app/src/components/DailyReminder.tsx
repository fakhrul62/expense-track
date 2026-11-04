"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/local-store";
import { getReminderSettings, MAX_DAILY_REMINDERS, saveReminderSettings, setDailyReminder, syncDailyReminder, type ReminderStatus } from "@/lib/daily-reminder";

export default function DailyReminder() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ReminderStatus>("unsupported");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [times, setTimes] = useState(["20:30"]);
  const [savedTimes, setSavedTimes] = useState(["20:30"]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const busy = loading || saving;
  const dirty = JSON.stringify(times) !== JSON.stringify(savedTimes);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const refresh = () => { void syncDailyReminder(user.id).then(value => { if (active) setStatus(value); }).catch(e => { if (active) setError(errorMessage(e)); }); };
    void Promise.resolve().then(async () => {
      const settings = getReminderSettings(user.id);
      if (active) { setTimes(settings.times); setSavedTimes(settings.times); }
      const value = await syncDailyReminder(user.id);
      if (active) setStatus(value);
    }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    window.addEventListener("exptrack:resume", refresh);
    return () => { active = false; window.removeEventListener("exptrack:resume", refresh); };
  }, [user]);
  async function toggle() {
    if (!user || busy) return;
    setSaving(true); setError(""); setSaved(false);
    try { setStatus(await setDailyReminder(user.id, status !== "enabled")); }
    catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      setStatus(await saveReminderSettings(user.id, { ...getReminderSettings(user.id), times }));
      setSavedTimes([...times]); setSaved(true);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }
  function changeCount(count: number) {
    const next = times.slice(0, count);
    while (next.length < count) {
      const [hour, minute] = (next.at(-1) || "19:30").split(":").map(Number);
      let total = (hour * 60 + minute + 60) % 1440;
      const format = () => `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
      while (next.includes(format())) total = (total + 60) % 1440;
      next.push(format());
    }
    setTimes(next); setSaved(false); setError("");
  }
  return <section className="retro-box-lg p-5 space-y-4" aria-labelledby="reminder-heading">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 id="reminder-heading" className="font-mono-retro font-bold text-sm">SPENDING REMINDERS</h2>
      {status !== "unsupported" && <button type="button" role="switch" aria-checked={status === "enabled"} disabled={busy} onClick={() => void toggle()} className="retro-btn-secondary px-3 text-xs">{busy ? "PLEASE WAIT..." : status === "enabled" ? "REMINDER ON" : "ENABLE REMINDER"}</button>}
    </div>
    {loading ? <p className="text-xs opacity-70">Loading reminder settings…</p> : status === "unsupported" ? <p className="text-xs opacity-75">Daily background notifications are available in the Android app.</p> : <>
      <form onSubmit={save} className="space-y-4">
        <label className="block font-mono-retro text-xs">Reminders per day
          <select value={times.length} disabled={busy} onChange={e => changeCount(Number(e.target.value))} className="retro-input w-full mt-2">
            {Array.from({ length: MAX_DAILY_REMINDERS }, (_, index) => <option key={index} value={index + 1}>{index + 1} {index === 0 ? "time" : "times"} per day</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {times.map((time, index) => <label key={index} className="min-w-0 block font-mono-retro text-xs">Reminder {index + 1}
            <input type="time" required value={time} disabled={busy} onChange={e => { setTimes(previous => previous.map((value, position) => position === index ? e.target.value : value)); setSaved(false); setError(""); }} className="retro-input w-full min-w-0 mt-2" />
          </label>)}
        </div>
        <p className="text-xs opacity-70">Times follow your phone&apos;s local time. Saved for this account on this device.</p>
        <button type="submit" disabled={busy || !dirty} className="retro-btn px-4 text-xs w-full">{saving ? "SAVING…" : "SAVE REMINDER TIMES"}</button>
        {dirty && <p className="text-xs opacity-70">Save to apply your new times.</p>}
      </form>
      <p role="status" className="text-xs opacity-75">{status === "blocked" ? "Notifications are blocked. Allow notifications for EXPTRACK in Android Settings, then enable reminders." : status === "enabled" ? `${savedTimes.length} ${savedTimes.length === 1 ? "reminder" : "reminders"} scheduled daily. Works offline with the app closed. Android battery settings may delay delivery.` : "Reminders are turned off. Your chosen times are saved."}{saved && " Settings saved."}</p>
    </>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
