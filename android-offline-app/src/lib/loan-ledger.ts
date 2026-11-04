import type { ExpenseItem } from "@/components/ExpenseModal";

// Keep each cash movement in the existing, atomically saved and synced ledger.
// A versioned envelope associates repayments with their original borrowing.
const PREFIX = "EXTRACK-LOAN:1:";
export const LOAN_CATEGORY = "10000000-0000-4000-8000-000000000002";
export const REPAYMENT_CATEGORY = "20000000-0000-4000-8000-000000000001";
type Details = { kind: "loan" | "payment"; lender: string; note: string; loanId?: string; received?: boolean };
export function loanDetails(item: ExpenseItem): Details | null {
  const category = typeof item.categoryId === "string" ? item.categoryId : item.categoryId._id;
  if (item.note?.startsWith(PREFIX)) {
    try {
      const data = JSON.parse(item.note.slice(PREFIX.length));
      if (typeof data.lender === "string" && typeof data.note === "string" &&
        ((category === LOAN_CATEGORY && data.kind === "loan") ||
        (category !== LOAN_CATEGORY && data.kind === "payment" && typeof data.loanId === "string"))) return data;
    } catch { /* Legacy notes remain readable. */ }
  }
  return category === LOAN_CATEGORY ? { kind: "loan", lender: item.note?.trim() || "Loan received", note: "" } : null;
}
export const encodeLoan = (details: Details) => PREFIX + JSON.stringify(details);
export function transactionNote(item: ExpenseItem) {
  const details = loanDetails(item);
  return details ? `${details.kind === "payment" ? "Repaid to " : "Borrowed from "}${details.lender}${details.note ? ` · ${details.note}` : ""}` : item.note;
}
export function loanSummaries(entries: ExpenseItem[], today: string) {
  return entries.filter(e => loanDetails(e)?.kind === "loan").map(entry => {
    const payments = entries.filter(e => { const d = loanDetails(e); return d?.kind === "payment" && d.loanId === entry._id; }).sort((a,b) => b.date.localeCompare(a.date));
    const paidCents = payments.filter(p => p.date <= today).reduce((sum,p) => sum + Math.round(p.amount * 100), 0);
    const principalCents = Math.round(entry.amount * 100);
    return { ...entry, details: loanDetails(entry)!, payments, paid: paidCents / 100,
      remaining: Math.max(0, principalCents - paidCents) / 100, credit: Math.max(0, paidCents - principalCents) / 100 };
  }).sort((a,b) => b.date.localeCompare(a.date));
}
export type LoanSummary = ReturnType<typeof loanSummaries>[number];
