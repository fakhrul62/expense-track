import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export const REMINDER_ID = 830;
export const REMINDER_APPEARANCE = {
  smallIcon: "ic_stat_spending",
  largeIcon: "exptrack_notification",
  iconColor: "#EA580C",
};
export const remindersSupported = () => Capacitor.getPlatform() === "android";
export type ReminderStatus = "enabled" | "disabled" | "blocked" | "unsupported";
const preferenceKey = (accountId: string) => `exptrack-reminder:${accountId}`;
let queue: Promise<unknown> = Promise.resolve();

// Serialize startup, resume and settings changes so only one daily alarm exists.
export function syncDailyReminder(accountId: string | null, requestPermission = false): Promise<ReminderStatus> {
  const operation = queue.catch(() => undefined).then(async (): Promise<ReminderStatus> => {
    if (!remindersSupported()) return "unsupported";
    if (!accountId || localStorage.getItem(preferenceKey(accountId)) === "off") {
      await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
      return "disabled";
    }
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted" && requestPermission) permission = await LocalNotifications.requestPermissions();
    if (permission.display !== "granted") {
      await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
      return "blocked";
    }
    await LocalNotifications.createChannel({ id: "daily-spending", name: "Daily spending reminder", description: "A daily reminder to record your expenses", importance: 3, visibility: 0, vibration: true });
    // Replacing the fixed ID also refreshes the schedule after a time-zone change.
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    await LocalNotifications.schedule({ notifications: [{
      id: REMINDER_ID,
      title: "Time to enter today's spending",
      body: "Take a moment to record your daily expenses in EXPTRACK.",
      channelId: "daily-spending",
      ...REMINDER_APPEARANCE,
      isExactNotification: false,
      schedule: { on: { hour: 20, minute: 30, second: 0 }, repeats: true, allowWhileIdle: true },
    }] });
    return "enabled";
  });
  queue = operation;
  return operation;
}

export function setDailyReminder(accountId: string, enabled: boolean) {
  localStorage.setItem(preferenceKey(accountId), enabled ? "on" : "off");
  return syncDailyReminder(accountId, enabled);
}

export function initializeDailyReminder(accountId: string) {
  const firstTime = localStorage.getItem(preferenceKey(accountId)) === null;
  if (firstTime) localStorage.setItem(preferenceKey(accountId), "on");
  return syncDailyReminder(accountId, firstTime);
}
