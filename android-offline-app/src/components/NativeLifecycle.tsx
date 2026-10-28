"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useAuth } from "@/context/AuthContext";
import { initializeDailyReminder, syncDailyReminder } from "@/lib/daily-reminder";

export default function NativeLifecycle() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    const report = (error: unknown) => console.error("Daily reminder:", error);
    void initializeDailyReminder(user.id).catch(report);
    const refresh = () => { void syncDailyReminder(user.id).catch(report); };
    window.addEventListener("exptrack:resume", refresh);
    const action = LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
      if (notification.id === 830) router.push("/");
    });
    return () => { window.removeEventListener("exptrack:resume", refresh); void action.then(listener => listener.remove()); };
  }, [user, router]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const back = App.addListener("backButton", () => {
      if (document.querySelector('[role="dialog"]')) window.dispatchEvent(new Event("exptrack:back"));
      else if (pathname !== "/") router.replace("/");
      else void App.minimizeApp();
    });
    const resume = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) window.dispatchEvent(new Event("exptrack:resume"));
    });
    return () => { void back.then(h => h.remove()); void resume.then(h => h.remove()); };
  }, [pathname, router]);
  return null;
}
