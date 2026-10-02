"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export default function NativeLifecycle() {
  const router = useRouter();
  const pathname = usePathname();
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
