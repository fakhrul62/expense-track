"use client";

import React, { createContext, useContext, useSyncExternalStore, useEffect } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function subscribe(callback: () => void) {
  window.addEventListener("exptrack:theme", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("exptrack:theme", callback); window.removeEventListener("storage", callback); };
}
function snapshot(): Theme {
  try { return localStorage.getItem("theme") === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light" as Theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", nextTheme);
    window.dispatchEvent(new Event("exptrack:theme"));

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
