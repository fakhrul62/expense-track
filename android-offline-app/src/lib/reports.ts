import type { ExpenseItem } from "@/components/ExpenseModal";
import { incomeLabel, isIncomeCategory } from "@/lib/income";
import { loanDetails } from "@/lib/loan-ledger";

export function makeReport(entries: ExpenseItem[], month: string, today: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a valid month.");
  const posted = entries.filter(e => e.date <= today && loanDetails(e)?.received !== false);
  const selected = posted.filter(e => e.date.startsWith(`${month}-`));
  const sums = (items: ExpenseItem[], income: boolean) => items.reduce((n,e) => n + (isIncomeCategory(e.categoryId) === income ? Math.round(e.amount * 100) : 0), 0);
  const income = sums(selected, true), expense = sums(selected, false);
  const prior = posted.filter(e => e.date < `${month}-01`);
  const opening = sums(prior, true) - sums(prior, false);
  const groups = new Map<string, { id: string; name: string; income: boolean; cents: number; count: number }>();
  const days = new Map<string, { date: string; income: number; expense: number }>();
  for (const entry of selected) {
    const incoming = isIncomeCategory(entry.categoryId), id = typeof entry.categoryId === "string" ? entry.categoryId : entry.categoryId._id;
    const name = typeof entry.categoryId === "string" ? "Uncategorized" : incomeLabel(entry.categoryId.name);
    const group = groups.get(id) ?? { id, name, income: incoming, cents: 0, count: 0 };
    const cents = Math.round(entry.amount * 100); group.cents += cents; group.count++; groups.set(id, group);
    const day = days.get(entry.date) ?? {date: entry.date, income: 0, expense: 0};
    day[incoming ? "income" : "expense"] += cents; days.set(entry.date, day);
  }
  return {
    income: income/100, expense: expense/100, net: (income-expense)/100, opening: opening/100, closing: (opening+income-expense)/100,
    count: selected.length, futureCount: entries.filter(e => e.date.startsWith(`${month}-`) && e.date > today && loanDetails(e)?.received !== false).length,
    categories: [...groups.values()].map(g => ({ ...g, amount: g.cents/100 })).sort((a,b) => Number(b.income)-Number(a.income) || b.cents-a.cents),
    days: [...days.values()].sort((a,b) => a.date.localeCompare(b.date)).map(d => ({...d, income:d.income/100, expense:d.expense/100})),
  };
}
