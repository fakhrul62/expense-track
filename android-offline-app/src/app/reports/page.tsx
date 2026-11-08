"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import ExpenseModal, { type CategoryType, type ExpenseItem } from "@/components/ExpenseModal";
import { getTransactions, getCategories, localDate, errorMessage } from "@/lib/local-store";
import { makeReport } from "@/lib/reports";
import { useAuth } from "@/context/AuthContext";

const money = (n: number) => `৳ ${n.toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function ReportsPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => localDate().slice(0,7));
  const [entries, setEntries] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++version.current;
    try { const [items,cats] = await Promise.all([getTransactions(),getCategories()]); if (request === version.current) { setEntries(items); setCategories(cats); setError(""); } }
    catch (e) { if (request === version.current) setError(errorMessage(e)); }
    finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => {
    if (!user) return;
    void Promise.resolve().then(refresh);
    const update = () => { void refresh(); };
    window.addEventListener("exptrack:local-change",update); window.addEventListener("exptrack:cloud-change",update); window.addEventListener("exptrack:resume",update); document.addEventListener("visibilitychange",update);
    return () => { window.removeEventListener("exptrack:local-change",update); window.removeEventListener("exptrack:cloud-change",update); window.removeEventListener("exptrack:resume",update); document.removeEventListener("visibilitychange",update); };
  }, [user,refresh]);
  const report = useMemo(() => makeReport(entries,month,localDate()),[entries,month]);
  const title = new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  function changeMonth(delta: number) { const [y,m] = month.split("-").map(Number),date = new Date(y,m-1+delta,1); setMonth(localDate(date).slice(0,7)); }
  return <div className="min-h-screen pb-32 md:pb-12"><Navbar onOpenAddExpense={() => setOpen(true)} />
    <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-mono-retro text-xl font-black flex gap-2 items-center"><BarChart3 /> REPORTS</h1><Link href="/" className="text-xs underline">Back to Home</Link></div>
      <section className="retro-box month-selector flex items-center justify-between" aria-label="Report month"><button type="button" aria-label="Previous report month" onClick={() => changeMonth(-1)} className="retro-btn-secondary"><ChevronLeft /></button><span className="font-mono-retro font-bold text-sm">{title}</span><button type="button" aria-label="Next report month" onClick={() => changeMonth(1)} className="retro-btn-secondary"><ChevronRight /></button></section>
      {error && <p role="alert" className="retro-box p-3 text-sm">{error}<button onClick={refresh} className="retro-btn-secondary ml-2 px-3">Retry</button></p>}
      {loading ? <p className="retro-box p-6">Loading report…</p> : <>
        <div className="grid grid-cols-2 gap-3">{([['Income',report.income,'report-income'],['Expenses',report.expense,'report-expense']] as const).map(([label,amount,id]) => <div key={id} className="retro-box p-4 min-w-0"><p className="text-xs uppercase opacity-65">{label}</p><p data-testid={id} className="font-mono-retro font-bold text-xl break-all mt-1 tabular-nums">{money(amount)}</p></div>)}</div>
        <section className="retro-box-lg p-4 space-y-3"><div><p className="text-xs opacity-65">NET CASH FLOW · INCOME − EXPENSES</p><p data-testid="report-net" className="text-2xl font-bold font-mono-retro tabular-nums break-all">{money(report.net)}</p></div><div className="grid grid-cols-2 gap-3 border-t border-current/20 pt-3 text-xs"><p><span className="block opacity-65 mb-1">Starting balance</span><strong data-testid="report-opening" className="font-mono-retro break-all">{money(report.opening)}</strong></p><p><span className="block opacity-65 mb-1">Ending balance</span><strong data-testid="report-closing" className="font-mono-retro break-all">{money(report.closing)}</strong></p></div></section>
        <DailyChart report={report} month={month} />
        <section className="retro-box p-4 space-y-3"><h2 className="font-mono-retro text-sm font-bold">BY CATEGORY</h2>{!report.count ? <p className="text-sm opacity-70">No entries recorded for this month.</p> : <div className="overflow-x-auto"><table className="w-full text-xs text-left"><caption className="sr-only">Income and expense categories for {title}</caption><thead className="border-b border-current/20"><tr><th className="py-2">Category</th><th className="py-2">Type</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>{report.categories.map(c => <tr key={c.id} className="border-b border-current/10"><th scope="row" className="py-3 pr-2 font-normal max-w-44 break-words">{c.name}</th><td className="pr-2 opacity-70">{c.income ? "Income" : "Expense"}</td><td className="py-3 text-right tabular-nums font-mono-retro">{money(c.amount)}</td></tr>)}</tbody></table></div>}</section>
        <p className="text-xs opacity-60 leading-relaxed">{report.count} entries. Cash-based totals include opening bank balances and loan cash movements; they are not a profit calculation. Existing debt without a cash entry is excluded.{report.futureCount > 0 && ` ${report.futureCount} future entries excluded until their date.`}</p>
      </>}
    </main><BottomNav onOpenAddExpense={() => setOpen(true)} /><ExpenseModal isOpen={open} onClose={() => setOpen(false)} onSuccess={refresh} categories={categories} /></div>;
}
function DailyChart({ report, month }: { report: ReturnType<typeof makeReport>; month: string }) {
  const [year,m] = month.split("-").map(Number), dayCount = new Date(year,m,0).getDate();
  const points = Array.from({length:dayCount},(_,i) => report.days.find(d => Number(d.date.slice(-2)) === i+1) ?? {date:`${month}-${String(i+1).padStart(2,"0")}`,income:0,expense:0});
  const max = Math.max(1,...points.flatMap(p => [p.income,p.expense])), step = 560/dayCount;
  const labels = [...new Set([1,8,15,22,dayCount])];
  return <section className="retro-box p-4 space-y-3"><h2 className="font-mono-retro text-sm font-bold">DAILY INCOME & EXPENSES</h2><div className="flex gap-5 text-xs"><span className="flex gap-2 items-center"><span className="w-3 h-3 bg-teal-600 inline-block border border-current" />Income</span><span className="flex gap-2 items-center"><span className="w-3 h-3 bg-orange-600 inline-block" />Expenses</span></div>
    {!report.count ? <p className="py-8 text-center text-sm opacity-65">Your chart appears when you record income or expenses.</p> : <><svg viewBox="0 0 620 220" className="w-full" role="img" aria-label={`Daily income and expense chart for ${month}. Income ${money(report.income)}, expenses ${money(report.expense)}. Daily values are available below.`}>
      <title>Daily income and expenses</title><text x="42" y="16" fontSize="16" fill="currentColor">৳ {max.toLocaleString('en-US',{maximumFractionDigits:2})}</text>
      {[0,1,2].map(i => <line key={i} x1="42" x2="606" y1={34+i*74} y2={34+i*74} stroke="currentColor" strokeOpacity=".15" />)}
      {points.map((p,i) => <g key={p.date}>{([['income','#0d9488'],['expense','#ea580c']] as const).map(([type,color],j) => {const height=p[type]/max*148;return <rect key={type} x={44+i*step+j*step*.39} y={182-height} width={step*.34} height={height} fill={color} stroke={type === 'income' ? 'currentColor' : 'none'} strokeWidth=".5"><title>{p.date}: {type} {money(p[type])}</title></rect>;})}</g>)}
      {labels.map(day => <text key={day} x={44+(day-1)*step} y="205" fontSize="16" fill="currentColor">{day}</text>)}<text x="8" y="186" fontSize="16" fill="currentColor">0</text>
    </svg><details><summary className="text-xs cursor-pointer underline py-2">View daily figures</summary><table className="w-full text-xs text-right"><caption className="sr-only">Daily chart values</caption><thead><tr><th className="text-left py-2">Date</th><th>Income</th><th>Expenses</th></tr></thead><tbody>{report.days.map(d => <tr key={d.date} className="border-t border-current/15"><th className="text-left py-2 font-normal">{d.date.slice(5)}</th><td>{money(d.income)}</td><td>{money(d.expense)}</td></tr>)}</tbody></table></details></>}
  </section>;
}
