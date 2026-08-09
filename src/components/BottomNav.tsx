"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Settings } from "lucide-react";

interface BottomNavProps {
  onOpenAddExpense: () => void;
}

export default function BottomNav({ onOpenAddExpense }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FBF7EE] border-t-2 border-[#1C1917] pb-safe">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-4 py-2">
        {/* Home Tab */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-3 py-1 font-mono-retro text-xs border-2 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
            pathname === "/"
              ? "bg-[#1C1917] text-white border-[#1C1917] shadow-[2px_2px_0px_0px_#EA580C]"
              : "bg-[#FFFDF9] text-[#1C1917] border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917]"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">HOME</span>
        </Link>

        {/* Floating Thumb-Reachable Add Button */}
        <button
          onClick={onOpenAddExpense}
          className="relative -top-4 flex items-center justify-center w-14 h-14 bg-[#EA580C] text-white border-2 border-[#1C1917] shadow-[4px_4px_0px_0px_#1C1917] hover:bg-[#D97706] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150"
          aria-label="Add Expense"
        >
          <Plus className="w-8 h-8 stroke-[3]" />
        </button>

        {/* Settings Tab */}
        <Link
          href="/settings"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-3 py-1 font-mono-retro text-xs border-2 transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
            pathname === "/settings"
              ? "bg-[#1C1917] text-white border-[#1C1917] shadow-[2px_2px_0px_0px_#EA580C]"
              : "bg-[#FFFDF9] text-[#1C1917] border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917]"
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">CONFIG</span>
        </Link>
      </div>
    </div>
  );
}
