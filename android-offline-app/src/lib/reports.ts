import type { ExpenseItem } from "@/components/ExpenseModal";
import { incomeLabel, isIncomeCategory } from "@/lib/income";
import { paymentSource } from "@/lib/wallet";
import { loanDetails, transactionNote } from "@/lib/loan-ledger";

export type ReportRange = { start: string; end: string };
export type ReportPeriod = "daily" | "weekly" | "monthly" | "custom";
export function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) === date;
}
export function periodRange(period: ReportPeriod, anchor: string, custom?: ReportRange): ReportRange {
  if (!validDate(anchor)) throw new Error("Choose a valid date.");
  if (period === "custom") {
    if (!custom || !validDate(custom.start) || !validDate(custom.end) || custom.start > custom.end) throw new Error("Choose a start date on or before the end date.");
    return custom;
  }
  const date = new Date(`${anchor}T12:00:00Z`), iso = (d: Date) => d.toISOString().slice(0,10);
  if (period === "daily") return {start:anchor,end:anchor};
  if (period === "weekly") {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay()+6)%7);
    const start = iso(date); date.setUTCDate(date.getUTCDate()+6); return {start,end:iso(date)};
  }
  const start = anchor.slice(0,7)+"-01";
  date.setUTCMonth(date.getUTCMonth()+1,0); return {start,end:iso(date)};
}
export function makeReport(entries: ExpenseItem[], range: string | ReportRange, today: string) {
  if (typeof range === "string" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(range)) throw new Error("Choose a valid month.");
  const {start,end} = typeof range === "string" ? periodRange("monthly",`${range}-01`) : periodRange("custom",today,range);
  const posted = entries.filter(e => e.date <= today && loanDetails(e)?.received !== false);
  const selected = posted.filter(e => e.date >= start && e.date <= end);
  const sums = (items: ExpenseItem[], income: boolean) => items.reduce((n,e) => n + (isIncomeCategory(e.categoryId) === income ? Math.round(e.amount * 100) : 0), 0);
  const income = sums(selected, true), expense = sums(selected, false);
  const prior = posted.filter(e => e.date < start);
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
    start, end, entries: selected,
    income: income/100, expense: expense/100, net: (income-expense)/100, opening: opening/100, closing: (opening+income-expense)/100,
    count: selected.length, futureCount: entries.filter(e => e.date >= start && e.date <= end && e.date > today && loanDetails(e)?.received !== false).length,
    categories: [...groups.values()].map(g => ({ ...g, amount: g.cents/100 })).sort((a,b) => Number(b.income)-Number(a.income) || b.cents-a.cents),
    days: [...days.values()].sort((a,b) => a.date.localeCompare(b.date)).map(d => ({...d, income:d.income/100, expense:d.expense/100})),
  };
}

// Quote every cell and neutralize spreadsheet formulas in user-supplied text.
const cell = (value: unknown) => '"' + String(value).replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
export function reportCSV(report: ReturnType<typeof makeReport>) {
  const rows: unknown[][] = [["EXPTRACK report",report.start,report.end],["Income",report.income.toFixed(2)],["Expenses",report.expense.toFixed(2)],["Net",report.net.toFixed(2)],[],["Date","Type","Category","Source","Amount (BDT)","Note"]];
  for (const e of [...report.entries].sort((a,b)=>a.date.localeCompare(b.date))) rows.push([e.date,isIncomeCategory(e.categoryId)?"Income":"Expense",typeof e.categoryId === "string" ? "Uncategorized" : incomeLabel(e.categoryId.name),paymentSource(e),e.amount.toFixed(2),transactionNote(e) ?? ""]);
  return "\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n");
}
export function reportHTML(report: ReturnType<typeof makeReport>) {
  const escape = (v: unknown) => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const amount = (n:number) => "BDT "+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  const bar = (n:number) => Math.max(0,n)/Math.max(1,report.income,report.expense)*100;
  return `<!doctype html><html><head><meta charset="utf-8"><title>EXPTRACK Report</title><style>body{font:14px Arial,sans-serif;color:#18231f;margin:32px}h1{font-size:24px}h2{font-size:18px;margin-top:28px}.metrics{display:flex;gap:30px}.bar{height:18px;margin:6px 0 18px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{padding:9px 4px;border-bottom:1px solid #ddd;text-align:left}tr{break-inside:avoid}thead{display:table-header-group}.right{text-align:right}@page{margin:14mm}</style></head><body><h1>EXPTRACK · Money report</h1><p>${escape(report.start)} to ${escape(report.end)}</p><div class="metrics"><p>Income<br><b>${amount(report.income)}</b></p><p>Expenses<br><b>${amount(report.expense)}</b></p><p>Net cash flow<br><b>${amount(report.net)}</b></p></div><h2>Income vs. expenses</h2><div>Income<div class="bar" style="width:${bar(report.income)}%;background:#187768"></div></div><div>Expenses<div class="bar" style="width:${bar(report.expense)}%;background:#c55d27"></div></div><h2>Category breakdown</h2><table><thead><tr><th>Category</th><th>Type</th><th class="right">Amount</th></tr></thead><tbody>${report.categories.map(c=>`<tr><td>${escape(c.name)}</td><td>${c.income?"Income":"Expense"}</td><td class="right">${amount(c.amount)}</td></tr>`).join("")}</tbody></table><h2>Transactions (${report.count})</h2><table><thead><tr><th>Date / category</th><th>Source / note</th><th class="right">Amount</th></tr></thead><tbody>${report.entries.map(e=>`<tr><td>${escape(e.date)}<br>${escape(typeof e.categoryId === "string" ? "Uncategorized" : incomeLabel(e.categoryId.name))}</td><td>${paymentSource(e)}<br>${escape(transactionNote(e)??"")}</td><td class="right">${isIncomeCategory(e.categoryId)?"+":"−"}${amount(e.amount)}</td></tr>`).join("")}</tbody></table><p>Cash movements only. Loan money and opening balances are included; existing debt and future entries are excluded. This is not a profit statement.</p></body></html>`;
}
