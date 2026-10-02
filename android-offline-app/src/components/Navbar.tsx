"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Settings, Plus, Sun, Moon } from "lucide-react";

interface NavbarProps {
  onOpenAddExpense?: () => void;
}

export default function Navbar({ onOpenAddExpense }: NavbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;


  return (
    <header className="sticky top-0 z-30 border-b-2 transition-colors duration-250">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Text-Only Branding */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="font-mono-retro font-black text-xl tracking-tighter px-2 py-0.5 bg-[#FEF08A] dark:bg-[#854D0E] text-[#1C1917] dark:text-[#FBF7EE] border-2 border-[#1C1917] dark:border-[#3F3F46] shadow-[2px_2px_0px_0px_#1C1917] dark:shadow-[2px_2px_0px_0px_#000000] group-active:translate-x-0.5 group-active:translate-y-0.5 group-active:shadow-none transition-all duration-150">
            EXPTRACK
          </span>
        </Link>

        {/* Action icons / Theme / User Profile */}
        <div className="flex items-center gap-2">
          {onOpenAddExpense && (
            <button
              onClick={onOpenAddExpense}
              className="retro-btn text-white px-3 py-1.5 text-xs font-mono-retro font-bold rounded-none flex items-center gap-1 min-h-[38px] md:min-h-[44px]"
              aria-label="Add Expense"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">ADD</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="retro-btn-secondary px-2.5 py-1.5 text-xs font-mono-retro rounded-none min-h-[38px] min-w-[38px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center"
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-[#1C1917]" />
            ) : (
              <Sun className="w-4 h-4 text-[#FEF08A]" />
            )}
          </button>

          <Link
            href="/settings"
            className="retro-btn-secondary px-2.5 py-1.5 text-xs font-mono-retro rounded-none min-h-[38px] min-w-[38px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>


        </div>
      </div>
    </header>
  );
}
