"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, DollarSign, FileText } from "lucide-react";

export interface CategoryType {
  _id: string;
  name: string;
  icon: string;
  isDefault: boolean;
}

export interface ExpenseItem {
  _id: string;
  amount: number;
  categoryId: CategoryType | string;
  note?: string;
  date: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryType[];
  editingExpense?: ExpenseItem | null;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editingExpense,
}: ExpenseModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      const catId = typeof editingExpense.categoryId === "object"
        ? editingExpense.categoryId._id
        : editingExpense.categoryId;
      setCategoryId(catId);
      setNote(editingExpense.note || "");
      setDate(editingExpense.date);
    } else {
      setAmount("");
      if (categories.length > 0) {
        setCategoryId(categories[0]._id);
      }
      setNote("");
      const today = new Date().toISOString().split("T")[0];
      setDate(today);
    }
    setError("");
  }, [editingExpense, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        amount: parseFloat(amount),
        categoryId,
        note,
        date: date || new Date().toISOString().split("T")[0],
      };

      const url = editingExpense
        ? `/api/expenses/${editingExpense._id}`
        : "/api/expenses";
      const method = editingExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save expense");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#FFFDF9] border-t-3 sm:border-3 border-[#1C1917] shadow-[6px_6px_0px_0px_#1C1917] p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#1C1917] pb-3 mb-5">
            <h2 className="font-mono-retro font-bold text-lg text-[#1C1917] flex items-center gap-2">
              <span className="bg-[#FEF08A] px-2 py-0.5 border border-[#1C1917]">
                {editingExpense ? "EDIT EXPENSE" : "+ NEW EXPENSE"}
              </span>
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-[#FFFDF9] border-2 border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150"
            >
              <X className="w-5 h-5 text-[#1C1917]" />
            </button>
          </div>

          {error && (
            <div className="bg-[#FEE2E2] border-2 border-[#1C1917] p-3 mb-4 font-mono-retro text-xs text-[#991B1B]">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
                Amount (৳ / $) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1C1917] z-10">
                  <DollarSign className="w-5 h-5" />
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="retro-input retro-input-icon text-xl font-mono-retro font-bold"
                  autoFocus
                />
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
                Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border-2 border-[#1C1917] bg-[#FBF7EE]">
                {categories.map((cat) => {
                  const isSelected = categoryId === cat._id;
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => setCategoryId(cat._id)}
                      className={`flex flex-col items-center justify-center p-2.5 min-h-[52px] border-2 transition-all duration-150 ${
                        isSelected
                          ? "bg-[#EA580C] text-white border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917]"
                          : "bg-[#FFFDF9] text-[#1C1917] border-[#1C1917] hover:bg-[#FEF08A]"
                      }`}
                    >
                      <span className="text-xl mb-0.5">{cat.icon}</span>
                      <span className="font-mono-retro text-[11px] font-bold truncate max-w-full">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
                Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1C1917] z-10">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="retro-input retro-input-icon font-mono-retro text-sm"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
                Note (Optional)
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 pointer-events-none text-[#1C1917] z-10">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Morning commute, Lunch combo..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="retro-input retro-input-icon text-sm"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="retro-btn-secondary flex-1 font-mono-retro"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="retro-btn flex-1 font-mono-retro"
              >
                {loading ? "SAVING..." : editingExpense ? "UPDATE" : "SAVE"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
