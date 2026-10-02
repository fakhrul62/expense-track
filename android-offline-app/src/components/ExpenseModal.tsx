"use client";

import { saveExpense, localDate } from "@/lib/local-store";
import { useModal } from "@/lib/use-modal";
import React, { useState } from "react";
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

export default function ExpenseModal(props: ExpenseModalProps) {
  return props.isOpen ? <ExpenseForm {...props} /> : null;
}

function ExpenseForm({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editingExpense,
}: ExpenseModalProps) {
  const [amount, setAmount] = useState(() => editingExpense?.amount.toString() ?? "");
  const [categoryId, setCategoryId] = useState(() => editingExpense ? (typeof editingExpense.categoryId === "object" ? editingExpense.categoryId._id : editingExpense.categoryId) : categories[0]?._id ?? "");
  const [note, setNote] = useState(() => editingExpense?.note ?? "");
  const [date, setDate] = useState(() => editingExpense?.date ?? localDate());
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useModal(isOpen, onClose, loading);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
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
        date: date || localDate(),
      };

      await saveExpense(payload, editingExpense?._id);

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
          role="dialog" aria-modal="true" aria-label={editingExpense ? "Edit expense" : "New expense"}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#FFFDF9] dark:bg-[#1E1E22] border-t-3 sm:border-3 border-[#1C1917] dark:border-[#3F3F46] shadow-[6px_6px_0px_0px_#1C1917] dark:shadow-[6px_6px_0px_0px_#000000] p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#1C1917] dark:border-[#3F3F46] pb-3 mb-5">
            <h2 className="font-mono-retro font-bold text-lg text-[#1C1917] dark:text-[#FBF7EE] flex items-center gap-2">
              <span className="bg-[#FEF08A] dark:bg-[#854D0E] text-[#1C1917] dark:text-[#FBF7EE] px-2 py-0.5 border border-[#1C1917] dark:border-[#3F3F46]">
                {editingExpense ? "EDIT EXPENSE" : "+ NEW EXPENSE"}
              </span>
            </h2>
            <button
              onClick={() => !loading && onClose()}
              aria-label="Close expense"
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center bg-[#FFFDF9] dark:bg-[#27272A] border-2 border-[#1C1917] dark:border-[#3F3F46] shadow-[2px_2px_0px_0px_#1C1917] dark:shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150"
            >
              <X className="w-5 h-5 text-[#1C1917] dark:text-[#FBF7EE]" />
            </button>
          </div>

          {error && (
            <div className="bg-[#FEE2E2] dark:bg-[#450A0A] border-2 border-[#1C1917] dark:border-[#3F3F46] p-3 mb-4 font-mono-retro text-xs text-[#991B1B] dark:text-[#FCA5A5]">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] dark:text-[#FBF7EE] mb-1.5 uppercase">
                Amount (৳) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1C1917] dark:text-[#FBF7EE] z-10">
                  <DollarSign className="w-5 h-5" />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  max="999999999.99"
                  step="0.01"
                  min="0.01"
                  aria-label="Amount"
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
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] dark:text-[#FBF7EE] mb-1.5 uppercase">
                Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border-2 border-[#1C1917] dark:border-[#3F3F46] bg-[#FBF7EE] dark:bg-[#141416]">
                {categories.map((cat) => {
                  const isSelected = categoryId === cat._id;
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => setCategoryId(cat._id)}
                      className={`flex flex-col items-center justify-center p-2.5 min-h-[52px] border-2 transition-all duration-150 ${
                        isSelected
                          ? "bg-[#EA580C] dark:bg-[#F97316] text-white border-[#1C1917] dark:border-[#3F3F46] shadow-[2px_2px_0px_0px_#1C1917] dark:shadow-[2px_2px_0px_0px_#000000]"
                          : "bg-[#FFFDF9] dark:bg-[#1E1E22] text-[#1C1917] dark:text-[#FBF7EE] border-[#1C1917] dark:border-[#3F3F46] hover:bg-[#FEF08A] dark:hover:bg-[#3F3F46]"
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
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] dark:text-[#FBF7EE] mb-1.5 uppercase">
                Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1C1917] dark:text-[#FBF7EE] z-10">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  aria-label="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="retro-input retro-input-icon font-mono-retro text-sm"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] dark:text-[#FBF7EE] mb-1.5 uppercase">
                Note (Optional)
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 pointer-events-none text-[#1C1917] dark:text-[#FBF7EE] z-10">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Morning commute, Lunch combo..."
                  aria-label="Note"
                  maxLength={500}
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
                disabled={loading}
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
