import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export const REMINDER_ID = 830;
export const MAX_DAILY_REMINDERS = 6;
export const REMINDER_APPEARANCE = {
  smallIcon: "ic_stat_spending",
  largeIcon: "exptrack_notification",
  iconColor: "#EA580C",
};
export const remindersSupported = () => Capacitor.getPlatform() === "android";
export const isSpendingReminder = (id: number) => id >= REMINDER_ID && id < REMINDER_ID + MAX_DAILY_REMINDERS;
export type ReminderStatus = "enabled" | "disabled" | "blocked" | "unsupported";
export interface ReminderSettings { enabled: boolean; times: string[] }
const legacyKey = (id: string) => `exptrack-reminder:${id}`;
const preferenceKey = (id: string) => `exptrack-reminder-settings:${id}`;
const defaultSettings = (): ReminderSettings => ({ enabled: true, times: ["20:30"] });
let queue: Promise<unknown> = Promise.resolve();

function validateSettings(value: ReminderSettings): ReminderSettings {
  if (typeof value.enabled !== "boolean" || !Array.isArray(value.times) || value.times.length < 1 || value.times.length > MAX_DAILY_REMINDERS) throw new Error(`Choose between 1 and ${MAX_DAILY_REMINDERS} reminders per day.`);
  if (value.times.some(time => typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error("Choose a valid time for each reminder.");
  if (new Set(value.times).size !== value.times.length) throw new Error("Choose a different time for each reminder.");
  return { enabled: value.enabled, times: [...value.times] };
}
export function getReminderSettings(accountId: string): ReminderSettings {
  const saved = localStorage.getItem(preferenceKey(accountId));
  if (saved) {
    try { return validateSettings(JSON.parse(saved)); } catch { /* Preserve legacy on/off preference if damaged. */ }
  }
  return { ...defaultSettings(), enabled: localStorage.getItem(legacyKey(accountId)) !== "off" };
}
const reminderIds = () => Array.from({ length: MAX_DAILY_REMINDERS }, (_, index) => ({ id: REMINDER_ID + index }));

// Serialize startup, resume and settings changes; replace all slots to remove stale alarms.
export function syncDailyReminder(accountId: string | null, requestPermission = false): Promise<ReminderStatus> {
  const operation = queue.catch(() => undefined).then(async (): Promise<ReminderStatus> => {
    if (!remindersSupported()) return "unsupported";
    const settings = accountId ? getReminderSettings(accountId) : null;
    if (!settings?.enabled) {
      await LocalNotifications.cancel({ notifications: reminderIds() });
      return "disabled";
    }
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted" && requestPermission) permission = await LocalNotifications.requestPermissions();
    if (permission.display !== "granted") {
      await LocalNotifications.cancel({ notifications: reminderIds() });
      return "blocked";
    }
    await LocalNotifications.createChannel({ id: "daily-spending", name: "Daily spending reminder", description: "Reminders to record your expenses", importance: 3, visibility: 0, vibration: true });
    await LocalNotifications.cancel({ notifications: reminderIds() });
    await LocalNotifications.schedule({ notifications: settings.times.map((time, index) => {
      const [hour, minute] = time.split(":").map(Number);
      return {
        id: REMINDER_ID + index,
        title: "Time to enter today's spending",
        body: "Take a moment to record your daily expenses in EXPTRACK.",
        channelId: "daily-spending",
        ...REMINDER_APPEARANCE,
        isExactNotification: false,
        schedule: { on: { hour, minute, second: 0 }, repeats: true, allowWhileIdle: true },
      };
    }) });
    return "enabled";
  });
  queue = operation;
  return operation;
}
export function saveReminderSettings(accountId: string, settings: ReminderSettings) {
  localStorage.setItem(preferenceKey(accountId), JSON.stringify(validateSettings(settings)));
  return syncDailyReminder(accountId, settings.enabled);
}
export function setDailyReminder(accountId: string, enabled: boolean) {
  return saveReminderSettings(accountId, { ...getReminderSettings(accountId), enabled });
}
export function initializeDailyReminder(accountId: string) {
  const firstTime = localStorage.getItem(preferenceKey(accountId)) === null && localStorage.getItem(legacyKey(accountId)) === null;
  if (firstTime) localStorage.setItem(preferenceKey(accountId), JSON.stringify(defaultSettings()));
  return syncDailyReminder(accountId, firstTime);
}
