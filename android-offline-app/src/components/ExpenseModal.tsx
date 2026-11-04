"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { saveExpense, saveExpenses, localDate, errorMessage } from "@/lib/local-store";
import { useModal } from "@/lib/use-modal";

export interface CategoryType { _id: string; name: string; icon: string; isDefault: boolean }
export interface ExpenseItem { _id: string; amount: number; categoryId: CategoryType | string; note?: string; date: string }
interface ExpenseModalProps {
  income?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryType[];
  editingExpense?: ExpenseItem | null;
}
type Draft = { key: string; amount: string; categoryId: string; note: string; date: string };
const MAX_EXPENSES = 20;
const validDraft = (row: Draft) => {
  const amount = Number(row.amount), cents = Math.round(amount * 100);
  if (!row.amount || !Number.isFinite(amount) || cents < 1 || cents > 99999999999 || Math.abs(amount * 100 - cents) > .0001) return "Enter an amount with up to two decimal places.";
  if (!row.categoryId) return "Choose a category.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || localDate(new Date(`${row.date}T12:00:00`)) !== row.date) return "Choose a valid date.";
  if (row.note.length > 500) return "Keep the note within 500 characters.";
  return "";
};

export default function ExpenseModal(props: ExpenseModalProps) {
  return props.isOpen ? <ExpenseForm {...props} /> : null;
}

function ExpenseForm({ income = false, isOpen, onClose, onSuccess, categories, editingExpense }: ExpenseModalProps) {
  const [rows, setRows] = useState<Draft[]>(() => [{ key: crypto.randomUUID(), amount: editingExpense?.amount.toString() ?? "", categoryId: editingExpense ? (typeof editingExpense.categoryId === "object" ? editingExpense.categoryId._id : editingExpense.categoryId) : categories[0]?._id ?? "", note: editingExpense?.note ?? "", date: editingExpense?.date ?? localDate() }]);
  const [activeKey, setActiveKey] = useState(rows[0].key);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const active = rows.find(row => row.key === activeKey) ?? rows[0];
  const activeIndex = rows.findIndex(row => row.key === active.key);
  const batch = rows.length > 1;
  const canBatch = !income && !editingExpense;
  const total = rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.amount)) ? Math.round(Number(row.amount) * 100) : 0), 0) / 100;
  useModal(isOpen, onClose, loading);

  function update(key: string, patch: Partial<Draft>) {
    setRows(previous => previous.map(row => row.key === key ? { ...row, ...patch } : row));
    setError("");
  }
  function addAnother() {
    if (loading || rows.length >= MAX_EXPENSES || !form.current?.reportValidity()) return;
    const invalid = rows.map(validDraft).find(Boolean);
    if (invalid) { setError(invalid); return; }
    const previous = rows[rows.length - 1];
    const next = { key: crypto.randomUUID(), amount: "", categoryId: previous.categoryId, date: previous.date, note: "" };
    setRows(previous => [...previous, next]); setActiveKey(next.key); setError("");
  }
  function remove(key: string) {
    const remaining = rows.filter(row => row.key !== key);
    setRows(remaining);
    if (key === active.key) setActiveKey(remaining[Math.max(0, activeIndex - 1)].key);
    setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    for (const [index, row] of rows.entries()) {
      const invalid = validDraft(row);
      if (invalid) { setActiveKey(row.key); setError(`${batch ? `Expense ${index + 1}: ` : ""}${invalid}`); return; }
    }
    submitting.current = true; setLoading(true); setError("");
    try {
      const inputs = rows.map(row => ({ amount: Number(row.amount), categoryId: row.categoryId, note: row.note, date: row.date }));
      if (canBatch) await saveExpenses(inputs, rows.map(row => row.key));
      else await saveExpense(inputs[0], editingExpense?._id);
      onSuccess(); onClose();
    } catch (err) { setError(errorMessage(err)); }
    finally { submitting.current = false; setLoading(false); }
  }

  return <div className="expense-overlay fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4">
    <motion.div role="dialog" aria-modal="true" aria-label={income ? editingExpense ? "Edit income" : "Add money" : editingExpense ? "Edit expense" : "New expense"}
      initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .18 }}
      className="expense-dialog w-full max-w-lg bg-[#FFFDF9] dark:bg-[#1E1E22] border-t-3 sm:border-3 border-[#1C1917] dark:border-[#3F3F46] shadow-[6px_6px_0px_0px_#1C1917] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b-2 border-current/20 px-5 py-3 shrink-0">
        <h2 className="font-mono-retro font-bold text-xs sm:text-sm min-w-0 flex-1"><span className="inline-block max-w-full truncate align-middle bg-[#FEF08A] dark:bg-[#854D0E] px-2 py-1">{income ? editingExpense ? "EDIT INCOME" : "+ ADD MONEY" : editingExpense ? "EDIT EXPENSE" : batch ? `+ ${rows.length} EXPENSES` : "EXPENSE"}</span></h2>
        {canBatch && <button type="button" aria-label="+ Add Another" onClick={addAnother} disabled={loading || rows.length >= MAX_EXPENSES} className="retro-btn-secondary px-2 text-[10px] sm:text-xs font-mono-retro flex items-center justify-center gap-1 shrink-0"><Plus size={14} aria-hidden="true" /><span>Add Another</span></button>}
        <button type="button" aria-label="Close expense" onClick={onClose} disabled={loading} className="retro-btn-secondary p-2"><X size={18} /></button>
      </div>
      <form ref={form} onSubmit={submit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="expense-form-body flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {error && <p role="alert" className="border border-red-700 bg-red-100 dark:bg-red-950 p-3 text-xs text-red-800 dark:text-red-200">{error}</p>}
          {rows.map((row, index) => <fieldset key={row.key} data-expense-key={row.key} aria-label={`Expense ${index + 1}`} disabled={loading} className={`space-y-4 min-w-0 ${batch ? "expense-stack-card border border-current/25 p-3" : ""}`}>
            {batch && <div className="flex items-center justify-between gap-2"><h3 className="font-mono-retro font-bold text-xs">EXPENSE {index + 1}</h3><button type="button" aria-label={`Remove expense ${index + 1}`} onClick={() => remove(row.key)} className="retro-btn-secondary p-2"><Trash2 size={14} /></button></div>}
            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0 font-mono-retro text-xs font-bold">AMOUNT (৳)<input type="number" inputMode="decimal" aria-label="Amount" required min="0.01" max="999999999.99" step="0.01" placeholder="0.00" value={row.amount} onChange={e => update(row.key, {amount:e.target.value})} autoFocus={row.key === activeKey} className="retro-input w-full min-w-0 mt-2 font-mono-retro text-lg font-bold" /></label>
              <label className="block min-w-0 font-mono-retro text-xs font-bold">DATE<input type="date" aria-label="Date" required value={row.date} onChange={e => update(row.key, {date:e.target.value})} className="retro-input w-full min-w-0 mt-2 text-xs" /></label>
            </div>
            <div>
              <p className="font-mono-retro text-xs font-bold mb-2">CATEGORY</p>
              <div role="group" aria-label="Choose category" className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1 border border-current/20">
                {categories.map(cat => <button type="button" key={cat._id} title={cat.name} aria-pressed={cat._id === row.categoryId} onClick={() => update(row.key, {categoryId:cat._id})} className={`expense-category flex flex-col items-center justify-center gap-1 p-2 min-h-[52px] min-w-0 border-2 transition-colors ${cat._id === row.categoryId ? "bg-[#EA580C] text-white border-[#1C1917] dark:border-[#AC7146]" : "bg-[#FFFDF9] dark:bg-[#202428] border-current/20"}`}><span aria-hidden="true" className="text-lg">{cat.icon}</span><span className="font-mono-retro text-[9px] sm:text-[10px] truncate max-w-full">{cat.name}</span></button>)}
              </div>
            </div>
            <label className="block font-mono-retro text-xs font-bold">NOTE <span className="font-normal opacity-60">(OPTIONAL)</span><input type="text" aria-label="Note" maxLength={500} placeholder="What was it for?" value={row.note} onChange={e => update(row.key, {note:e.target.value})} className="retro-input w-full mt-2 text-sm font-normal" /></label>
          </fieldset>)}
        </div>
        <div className="expense-form-footer shrink-0 border-t-2 border-current/20 px-5 pt-3 pb-5 space-y-3">
          {batch && <div className="flex justify-between gap-2 font-mono-retro text-xs"><span>{rows.length} EXPENSES · TOTAL</span><strong className="break-all tabular-nums" data-testid="batch-total">৳ {total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>}
          <div className="flex gap-3"><button type="button" onClick={onClose} disabled={loading} className="retro-btn-secondary flex-1 font-mono-retro text-xs">CANCEL</button><button type="submit" disabled={loading} className="retro-btn flex-1 font-mono-retro text-xs">{loading ? "SAVING..." : editingExpense ? "UPDATE" : batch ? `SAVE ALL (${rows.length})` : "SAVE"}</button></div>
        </div>
      </form>
    </motion.div>
  </div>;
}
