"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import ExpenseModal, { CategoryType, ExpenseItem } from "@/components/ExpenseModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Calendar,
  DollarSign,
  TrendingDown,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Month navigation: format "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  });

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/expenses?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchExpenses();
    }
  }, [user, fetchExpenses]);

  // Calculations for totals
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const dailyTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, todayStr]);

  const monthlyTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Group expenses by date (most recent first)
  const groupedExpenses = useMemo(() => {
    const groups: { [date: string]: ExpenseItem[] } = {};
    expenses.forEach((e) => {
      if (!groups[e.date]) {
        groups[e.date] = [];
      }
      groups[e.date].push(e);
    });

    // Sort dates in descending order
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((date) => {
      const dayTotal = groups[date].reduce((sum, item) => sum + item.amount, 0);
      return {
        date,
        items: groups[date],
        dayTotal,
      };
    });
  }, [expenses]);

  // Month navigation helpers
  const changeMonth = (direction: -1 | 1) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const newYyyy = date.getFullYear();
    const newMm = String(date.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${newYyyy}-${newMm}`);
  };

  const formatMonthTitle = (monthStr: string) => {
    const [yyyy, mm] = monthStr.split("-");
    const date = new Date(Number(yyyy), Number(mm) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === todayStr) return "TODAY";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    if (dateStr === yesterdayStr) return "YESTERDAY";

    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).toUpperCase();
  };

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/expenses/${deletingExpenseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e._id !== deletingExpenseId));
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
    } finally {
      setDeleteLoading(false);
      setDeletingExpenseId(null);
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[#FBF7EE] flex items-center justify-center p-4">
        <div className="retro-box p-6 font-mono-retro text-sm font-bold animate-pulse">
          LOADING EXPTRACK...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EE] flex flex-col pb-24 md:pb-12">
      <Navbar onOpenAddExpense={handleOpenAddExpense} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 space-y-5">
        {/* Month Selector Bar */}
        <section className="retro-box p-3 flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="retro-btn-secondary p-2 min-h-[38px] min-w-[38px]"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-mono-retro font-black text-sm sm:text-base text-[#1C1917]">
            <Calendar className="w-4 h-4 text-[#EA580C]" />
            <span>{formatMonthTitle(selectedMonth)}</span>
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="retro-btn-secondary p-2 min-h-[38px] min-w-[38px]"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </section>

        {/* Totals Section */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Daily Total Box */}
          <div className="bg-[#FFFDF9] border-3 border-[#1C1917] shadow-[4px_4px_0px_0px_#1C1917] p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#FEF08A] border-b-2 border-l-2 border-[#1C1917] px-2 py-0.5 font-mono-retro text-[10px] font-bold">
              TODAY
            </div>
            <span className="font-mono-retro text-xs text-stone-600 font-bold uppercase tracking-wider mb-2">
              Daily Total
            </span>
            <div className="font-mono-retro font-black text-xl sm:text-2xl text-[#1C1917] truncate">
              ৳ {dailyTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Monthly Total Box */}
          <div className="bg-[#1C1917] text-white border-3 border-[#1C1917] shadow-[4px_4px_0px_0px_#EA580C] p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#EA580C] text-white border-b-2 border-l-2 border-[#1C1917] px-2 py-0.5 font-mono-retro text-[10px] font-bold">
              MONTH
            </div>
            <span className="font-mono-retro text-xs text-amber-200/80 font-bold uppercase tracking-wider mb-2">
              Monthly Total
            </span>
            <div className="font-mono-retro font-black text-xl sm:text-2xl text-[#FEF08A] truncate">
              ৳ {monthlyTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </section>

        {/* Expenses Header & Add trigger */}
        <div className="flex items-center justify-between border-b-2 border-[#1C1917] pb-2 pt-2">
          <h2 className="font-mono-retro font-bold text-sm text-[#1C1917] flex items-center gap-2">
            <span className="bg-[#FEF08A] px-2 py-0.5 border border-[#1C1917]">
              TRANSACTIONS
            </span>
            <span className="text-xs text-stone-500 font-normal">
              ({expenses.length})
            </span>
          </h2>

          <button
            onClick={handleOpenAddExpense}
            className="retro-btn bg-[#EA580C] text-white text-xs px-3 py-1.5 font-mono-retro rounded-none flex items-center gap-1 min-h-[36px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>EXPENSE</span>
          </button>
        </div>

        {/* Expense List Grouped by Date */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="retro-box p-4 animate-pulse flex justify-between items-center"
              >
                <div className="h-4 bg-stone-200 w-1/3 rounded-none"></div>
                <div className="h-6 bg-stone-200 w-1/4 rounded-none"></div>
              </div>
            ))}
          </div>
        ) : groupedExpenses.length === 0 ? (
          <div className="retro-box p-8 text-center space-y-3 bg-[#FFFDF9]">
            <div className="text-4xl">💸</div>
            <h3 className="font-mono-retro font-bold text-sm text-[#1C1917]">
              NO EXPENSES RECORDED YET
            </h3>
            <p className="font-mono-retro text-xs text-stone-600 max-w-xs mx-auto">
              Tap the button below or top bar to add your first expense for {formatMonthTitle(selectedMonth)}.
            </p>
            <button
              onClick={handleOpenAddExpense}
              className="retro-btn text-xs px-4 py-2 font-mono-retro mt-2 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> ADD FIRST EXPENSE
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedExpenses.map((group) => (
              <div key={group.date} className="space-y-2">
                {/* Date Header with Day Total */}
                <div className="flex items-center justify-between px-1 font-mono-retro text-xs font-bold text-[#1C1917]">
                  <span className="bg-[#1C1917] text-white px-2 py-0.5 border border-[#1C1917]">
                    {formatDateHeader(group.date)}
                  </span>
                  <span className="text-stone-700">
                    Day Total: ৳{group.dayTotal.toFixed(2)}
                  </span>
                </div>

                {/* Items in this date group */}
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {group.items.map((item) => {
                      const categoryObj =
                        typeof item.categoryId === "object"
                          ? item.categoryId
                          : null;
                      const catName = categoryObj?.name || "Expense";
                      const catIcon = categoryObj?.icon || "🏷️";

                      return (
                        <motion.div
                          key={item._id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="bg-[#FFFDF9] border-2 border-[#1C1917] shadow-[3px_3px_0px_0px_#1C1917] p-3 flex items-center justify-between gap-3 hover:bg-[#FEF08A]/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Icon badge */}
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-xl bg-[#FBF7EE] border-2 border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917]">
                              {catIcon}
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                              <h4 className="font-mono-retro text-xs font-bold text-[#1C1917] truncate">
                                {catName}
                              </h4>
                              {item.note && (
                                <p className="font-sans text-xs text-stone-600 truncate mt-0.5">
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Amount & Actions */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="font-mono-retro font-bold text-sm text-[#1C1917] text-right">
                              -৳{item.amount.toFixed(2)}
                            </div>

                            {/* Action icons */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditExpense(item)}
                                className="w-8 h-8 flex items-center justify-center bg-[#FFFDF9] border-2 border-[#1C1917] shadow-[1.5px_1.5px_0px_0px_#1C1917] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[#FEF08A] transition-all"
                                title="Edit Expense"
                                aria-label="Edit Expense"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[#1C1917]" />
                              </button>
                              <button
                                onClick={() => setDeletingExpenseId(item._id)}
                                className="w-8 h-8 flex items-center justify-center bg-[#FEE2E2] border-2 border-[#1C1917] shadow-[1.5px_1.5px_0px_0px_#1C1917] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[#EF4444] hover:text-white transition-all group"
                                title="Delete Expense"
                                aria-label="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#991B1B] group-hover:text-white" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenAddExpense={handleOpenAddExpense} />

      {/* Expense Modal (Add/Edit) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={fetchExpenses}
        categories={categories}
        editingExpense={editingExpense}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingExpenseId}
        title="DELETE EXPENSE"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={handleDeleteExpense}
        loading={deleteLoading}
      />
    </div>
  );
}
