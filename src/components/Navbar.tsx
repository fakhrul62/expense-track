"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Settings, Plus, Loader2 } from "lucide-react";

interface NavbarProps {
  onOpenAddExpense?: () => void;
}

export default function Navbar({ onOpenAddExpense }: NavbarProps) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FBF7EE] border-b-2 border-[#1C1917]">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Text-Only Branding */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="font-mono-retro font-black text-xl tracking-tighter text-[#1C1917] px-2 py-0.5 bg-[#FEF08A] border-2 border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917] group-active:translate-x-0.5 group-active:translate-y-0.5 group-active:shadow-none transition-all duration-150">
            EXPTRACK
          </span>
        </Link>

        {/* Action icons / User Profile */}
        <div className="flex items-center gap-2">
          {onOpenAddExpense && (
            <button
              onClick={onOpenAddExpense}
              className="retro-btn bg-[#EA580C] text-white px-3 py-1.5 text-xs font-mono-retro font-bold rounded-none flex items-center gap-1 min-h-[38px] md:min-h-[44px]"
              aria-label="Add Expense"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">ADD</span>
            </button>
          )}

          <Link
            href="/settings"
            className="retro-btn-secondary px-2.5 py-1.5 text-xs font-mono-retro rounded-none min-h-[38px] min-w-[38px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="retro-btn-danger px-2.5 py-1.5 text-xs font-mono-retro rounded-none min-h-[38px] min-w-[38px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center"
            title="Logout"
            aria-label="Logout"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#991B1B]" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
