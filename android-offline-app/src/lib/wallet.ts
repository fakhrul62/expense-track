import type { ExpenseItem } from "@/components/ExpenseModal";
import { isIncomeCategory } from "@/lib/income";

export type PaymentSource = "cash" | "bank";
export const BANK_CATEGORY = "10000000-0000-4000-8000-000000000006";
const PREFIX = "EXTRACK-MONEY:1:";
export function moneyDetails(note = ""): { note: string; source: PaymentSource } | null {
  if (!note.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(note.slice(PREFIX.length));
    if (typeof data.note === "string" && (data.source === "bank" || data.source === "cash")) return data;
  } catch { /* Preserve unrecognized legacy notes verbatim. */ }
  return null;
}
export function encodeMoney(note: string, source: PaymentSource) {
  const encoded = PREFIX + JSON.stringify({ note: note.trim(), source });
  if (encoded.length > 500) throw new Error("Please shorten the note so it fits with its payment source.");
  return encoded;
}
// JSON escaping and source metadata count toward the shared 500-character limit.
export const moneyNoteCapacity = (note: string, source: PaymentSource) => 500 - (PREFIX + JSON.stringify({ note: note.trim(), source })).length;
export function paymentSource(entry: Pick<ExpenseItem, "note" | "categoryId">): PaymentSource {
  const money = moneyDetails(entry.note);
  if (money) return money.source;
  if (entry.note?.startsWith("EXTRACK-LOAN:1:")) {
    try { const d = JSON.parse(entry.note.slice("EXTRACK-LOAN:1:".length)); if (d.source === "bank" || d.source === "cash") return d.source; } catch { /* Legacy fallback below. */ }
  }
  const id = typeof entry.categoryId === "string" ? entry.categoryId : entry.categoryId._id;
  return id === BANK_CATEGORY ? "bank" : "cash";
}
export function walletBalances(entries: ExpenseItem[], today: string) {
  const cents = { cash: 0, bank: 0 };
  for (const entry of entries) {
    if (entry.date > today) continue;
    if (entry.note?.startsWith("EXTRACK-LOAN:1:")) {
      try { if (JSON.parse(entry.note.slice("EXTRACK-LOAN:1:".length)).received === false) continue; } catch { /* Legacy fallback. */ }
    }
    cents[paymentSource(entry)] += Math.round(entry.amount * 100) * (isIncomeCategory(entry.categoryId) ? 1 : -1);
  }
  return { cash: cents.cash / 100, bank: cents.bank / 100, available: (cents.cash + cents.bank) / 100 };
}
