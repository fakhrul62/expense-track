"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HandCoins, Plus, X, Check, ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import ExpenseModal, { type CategoryType } from "@/components/ExpenseModal";
import { addLoan, repayLoan, getTransactions, getCategories, localDate, errorMessage } from "@/lib/local-store";
import { loanSummaries, type LoanSummary } from "@/lib/loan-ledger";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/lib/use-modal";

const money = (value: number) => `৳ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function LoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("active");
  const [form, setForm] = useState<"add" | LoanSummary | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    try {
      const [entries, cats] = await Promise.all([getTransactions(undefined, true), getCategories()]);
      if (version !== request.current) return;
      setLoans(loanSummaries(entries, localDate())); setCategories(cats); setError("");
    } catch (e) { if (version === request.current) setError(errorMessage(e)); }
    finally { if (version === request.current) setLoading(false); }
  }, []);
  const invalidate = useCallback(() => { request.current++; }, []);
  useEffect(() => {
    if (!user) return;
    void Promise.resolve().then(refresh);
    const update = () => { void refresh(); };
    window.addEventListener("exptrack:cloud-change", update);
    window.addEventListener("exptrack:local-change", update);
    window.addEventListener("exptrack:resume", update);
    document.addEventListener("visibilitychange", update);
    return () => { invalidate(); window.removeEventListener("exptrack:cloud-change", update); window.removeEventListener("exptrack:local-change", update); window.removeEventListener("exptrack:resume", update); document.removeEventListener("visibilitychange", update); };
  }, [user, refresh, invalidate]);
  const current = loans.filter(l => l.date <= localDate());
  const total = (field: "amount" | "paid" | "remaining") => current.reduce((n,l) => n + Math.round(l[field] * 100), 0) / 100;
  const shown = loans.filter(l => filter === "all" || (filter === "cleared" ? l.remaining === 0 : l.remaining > 0));
  return <div className="min-h-screen pb-32 md:pb-12">
    <Navbar />
    <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-mono-retro font-black text-xl flex items-center gap-2"><HandCoins size={24} /> LOANS</h1><p className="text-xs opacity-70 mt-1">What you borrowed. What you’ve paid back.</p></div>
        <button className="retro-btn px-3 text-xs flex items-center gap-1 shrink-0" onClick={() => setForm("add")}><Plus size={16} /> ADD LOAN</button>
      </div>
      <section className="retro-box-lg p-5 space-y-4" aria-label="Loan totals">
        <div><p className="font-mono-retro text-xs opacity-70">TOTAL LEFT TO REPAY</p><p data-testid="loan-total" className="font-mono-retro text-2xl sm:text-3xl font-black tabular-nums break-all mt-1">{money(total("remaining"))}</p></div>
        <div className="grid grid-cols-2 gap-3 font-mono-retro text-xs border-t border-current/20 pt-3"><div><p className="opacity-60 mb-1">TOTAL BORROWED</p><p className="font-bold break-all">{money(total("amount"))}</p></div><div><p className="opacity-60 mb-1">TOTAL REPAID</p><p data-testid="loan-paid" className="font-bold break-all">{money(total("paid"))}</p></div></div>
        <p className="text-xs opacity-70">Money received adds to your cash balance. Repayments reduce it. The amount you owe stays separate.</p>
      </section>
      {error && <p role="alert" className="retro-box p-3 text-sm">{error}<button onClick={refresh} className="retro-btn-secondary px-3 ml-2">Retry</button></p>}
      <div role="group" aria-label="Filter loans" className="flex gap-2">{["active", "cleared", "all"].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={`${filter === f ? "retro-btn" : "retro-btn-secondary"} px-3 text-xs font-mono-retro capitalize`}>{f} ({loans.filter(l => f === "all" || (f === "cleared" ? l.remaining === 0 : l.remaining > 0)).length})</button>)}</div>
      {loading ? <p className="retro-box p-6 font-mono-retro text-sm">Loading loans…</p> : !shown.length ? <div className="retro-box p-8 text-center space-y-3"><HandCoins className="mx-auto opacity-50" size={36} /><h2 className="font-mono-retro font-bold">{filter === "cleared" ? "No cleared loans yet" : filter === "active" && loans.length ? "All paid up!" : "No loans here yet"}</h2><p className="text-sm opacity-70">{filter === "active" && loans.length ? "Your repayment history is in Cleared." : "Add a loan to start keeping track."}</p></div> : <div className="space-y-4">{shown.map(loan => <article key={loan._id} data-loan-id={loan._id} className="retro-box p-4 space-y-3">
        <div className="flex justify-between gap-3"><div className="min-w-0"><h2 className="font-mono-retro font-bold break-words">{loan.details.lender}</h2><p className="text-xs opacity-60 mt-1">Borrowed {dateLabel(loan.date)}</p></div><span className={`self-start text-[10px] font-mono-retro font-bold px-2 py-1 rounded-sm ${loan.remaining === 0 ? "bg-green-700/15 text-green-700 dark:text-green-300" : "bg-orange-600/15 text-orange-800 dark:text-orange-300"}`}>{loan.remaining === 0 ? "CLEARED" : loan.date > localDate() ? "UPCOMING" : "ACTIVE"}</span></div>
        {loan.details.note && <p className="text-sm opacity-75 break-words">{loan.details.note}</p>}
        {loan.details.received === false && <p className="text-xs opacity-60">Existing debt · no money added to available balance</p>}
        <div className="font-mono-retro"><p className="text-[10px] opacity-60">LEFT TO REPAY</p><p className="font-bold text-xl break-all tabular-nums">{money(loan.remaining)}</p><p className="text-[11px] opacity-70 mt-1 break-words">{money(loan.paid)} repaid of {money(loan.amount)}</p></div>
        <div className="h-1.5 bg-current/10 overflow-hidden rounded-full" role="progressbar" aria-label={`Repayment progress for ${loan.details.lender}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(loan.paid / loan.amount * 100))}><div className="h-full bg-green-600 dark:bg-green-400 rounded-full" style={{width: `${Math.min(100,loan.paid / loan.amount * 100)}%`}} /></div>
        {loan.credit > 0 && <p role="status" className="text-xs">Repayments exceed this loan by {money(loan.credit)}. Check payments made on other devices.</p>}
        {loan.remaining > 0 && loan.date <= localDate() && <button className="retro-btn-secondary w-full text-xs font-mono-retro" onClick={() => setForm(loan)}>REPAY / CLEAR LOAN</button>}
        {loan.payments.length > 0 && <details className="border-t border-current/15 pt-2"><summary className="text-xs font-mono-retro cursor-pointer py-1 flex items-center justify-between">REPAYMENT HISTORY ({loan.payments.length}) <ChevronDown size={14} /></summary><ul className="mt-2 space-y-2">{loan.payments.map(p => <li key={p._id} className="flex justify-between gap-2 text-xs"><span>{dateLabel(p.date)}</span><span className="font-mono-retro font-bold">{money(p.amount)}</span></li>)}</ul></details>}
      </article>)}</div>}
      <p className="text-xs opacity-60 leading-relaxed">Existing “Loan received” entries appear here automatically. Cleared loans stay in your history.</p>
    </main>
    <BottomNav onOpenAddExpense={() => setExpenseOpen(true)} />
    <ExpenseModal isOpen={expenseOpen} onClose={() => setExpenseOpen(false)} onSuccess={refresh} categories={categories} />
    {form && <LoanForm loan={form === "add" ? undefined : form} onClose={() => setForm(null)} onSuccess={refresh} />}
  </div>;
}

function LoanForm({ loan, onClose, onSuccess }: { loan?: LoanSummary; onClose: () => void; onSuccess: () => Promise<void> }) {
  const [full, setFull] = useState(false);
  const [amount, setAmount] = useState("");
  const [lender, setLender] = useState("");
  const [received, setReceived] = useState(true);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(localDate());
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  useModal(true, onClose, busy);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      if (loan) await repayLoan(loan._id, full ? loan.remaining : Number(amount), date, note);
      else await addLoan({ lender, amount: Number(amount), date, note, received });
      await onSuccess(); onClose();
    } catch (e) { setError(errorMessage(e)); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4 py-6"><section role="dialog" aria-modal="true" aria-labelledby="loan-form-title" className="retro-box-lg p-5 w-full max-w-md max-h-[90dvh] overflow-y-auto">
    <div className="flex items-center justify-between gap-2 mb-4"><h2 id="loan-form-title" className="font-mono-retro font-bold">{loan ? "REPAY LOAN" : "ADD LOAN"}</h2><button type="button" aria-label="Close loan form" disabled={busy} onClick={onClose} className="retro-btn-secondary p-2"><X size={18}/></button></div>
    <form onSubmit={submit} className="space-y-4">
      {loan ? <><p className="text-sm break-words">{loan.details.lender} · {money(loan.remaining)} remaining</p><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={!full} disabled={busy} onClick={() => setFull(false)} className={`${!full ? "retro-btn" : "retro-btn-secondary"} text-xs`}>PARTIAL PAYMENT</button><button type="button" aria-pressed={full} disabled={busy} onClick={() => setFull(true)} className={`${full ? "retro-btn" : "retro-btn-secondary"} text-xs`}>CLEAR IN FULL</button></div></> : <label className="block text-xs font-mono-retro">Lender / borrowed from<input autoFocus required maxLength={80} disabled={busy} value={lender} onChange={e => setLender(e.target.value)} placeholder="Person, bank or organization" className="retro-input w-full mt-2" /></label>}
      {!loan && <fieldset className="space-y-2"><legend className="text-xs font-mono-retro mb-2">How should this be recorded?</legend><label className="flex items-start gap-2 text-sm"><input type="radio" name="loan-cash" checked={received} disabled={busy} onChange={() => setReceived(true)} className="mt-1" /><span>Money received<span className="block text-xs opacity-60">Add this borrowing to available balance.</span></span></label><label className="flex items-start gap-2 text-sm"><input type="radio" name="loan-cash" checked={!received} disabled={busy} onChange={() => setReceived(false)} className="mt-1" /><span>Existing debt only<span className="block text-xs opacity-60">Already owed or recorded. Keep available balance unchanged.</span></span></label></fieldset>}
      <label className="block text-xs font-mono-retro">Amount (৳)<input autoFocus={!!loan} type="number" required min="0.01" max={loan?.remaining ?? 999999999.99} step="0.01" value={full && loan ? loan.remaining : amount} onChange={e => setAmount(e.target.value)} disabled={busy || full} className="retro-input w-full mt-2" /></label>
      <label className="block text-xs font-mono-retro">{loan ? "Repayment date" : "Borrowing date"}<input type="date" required min={loan?.date} max={localDate()} value={date} disabled={busy} onChange={e => setDate(e.target.value)} className="retro-input w-full mt-2" /></label>
      <label className="block text-xs font-mono-retro">Note (optional)<textarea maxLength={150} rows={2} value={note} disabled={busy} onChange={e => setNote(e.target.value)} className="retro-input w-full mt-2" /></label>
      <p className="text-xs opacity-70">{loan ? `${full ? money(loan.remaining) : "This payment"} will be deducted from your available balance.` : received ? "This amount will be added to your available balance." : "Only the amount you owe is recorded. Your available balance will not change."}</p>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <button type="submit" disabled={busy} className="retro-btn w-full text-xs flex items-center justify-center gap-2"><Check size={16}/>{busy ? "SAVING…" : loan ? full ? "CONFIRM FULL REPAYMENT" : "SAVE REPAYMENT" : "SAVE LOAN"}</button>
    </form>
  </section></div>;
}
