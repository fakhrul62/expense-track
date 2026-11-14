"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Settings, HandCoins } from "lucide-react";
import UpdateBadge from "@/components/UpdateBadge";

interface BottomNavProps {
  onOpenAddExpense: () => void;
}

export default function BottomNav({ onOpenAddExpense }: BottomNavProps) {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  return (
    <nav aria-label="Main navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bottom-nav-bg border-t-2 pb-safe">
      <div className="bottom-nav-items">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className="bottom-nav-item">
          <Home aria-hidden="true" /><span>HOME</span>
        </Link>
        <Link href="/loans" aria-current={pathname === "/loans" ? "page" : undefined} className="bottom-nav-item">
          <HandCoins aria-hidden="true" /><span>LOANS</span>
        </Link>
        <button type="button" onClick={onOpenAddExpense} aria-label="Add Expense" className="bottom-nav-item bottom-nav-add">
          <Plus aria-hidden="true" /><span>ADD</span>
        </button>
        <Link href="/settings" aria-current={pathname === "/settings" ? "page" : undefined} className="bottom-nav-item">
          <span className="relative inline-flex"><Settings aria-hidden="true" /><UpdateBadge /></span><span>CONFIG</span>
        </Link>
      </div>
    </nav>
  );
}
