"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Download, Printer, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import ExpenseModal, { type CategoryType, type ExpenseItem } from "@/components/ExpenseModal";
import { getTransactions, getCategories, localDate, errorMessage } from "@/lib/local-store";
import { makeReport, periodRange, type ReportPeriod, type ReportRange } from "@/lib/reports";
import { exportReport, printReport } from "@/lib/report-export";
import { useAuth } from "@/context/AuthContext";

const money = (n: number) => `৳ ${n.toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2})}`;
const periods = [['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['custom','Custom']] as const;
export default function ReportsPage() {
  const { user } = useAuth();
  const [period,setPeriod] = useState<ReportPeriod>("monthly");
  const [anchor,setAnchor] = useState(localDate);
  const [custom,setCustom] = useState<ReportRange>(()=>({start:localDate().slice(0,7)+"-01",end:localDate()}));
  const [entries,setEntries] = useState<ExpenseItem[]>([]), [categories,setCategories] = useState<CategoryType[]>([]);
  const [loading,setLoading] = useState(true), [error,setError] = useState("");
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false), [status,setStatus] = useState("");
  const version = useRef(0);
  const refresh = useCallback(async()=>{
    const request = ++version.current;
    try {const [items,cats] = await Promise.all([getTransactions(),getCategories()]);if(request===version.current){setEntries(items);setCategories(cats);setError("");}}
    catch(e){if(request===version.current)setError(errorMessage(e));}finally{if(request===version.current)setLoading(false);}
  },[]);
  const invalidate = useCallback(()=>{version.current++;},[]);
  useEffect(()=>{
    if(!user)return;
    void Promise.resolve().then(refresh);
    const update=()=>{void refresh();};
    const events=['exptrack:local-change','exptrack:cloud-change','exptrack:resume'];events.forEach(e=>window.addEventListener(e,update));document.addEventListener('visibilitychange',update);
    return()=>{invalidate();events.forEach(e=>window.removeEventListener(e,update));document.removeEventListener('visibilitychange',update);};
  },[user,refresh,invalidate]);
  const selection = useMemo(()=>{try {return {report:makeReport(entries,periodRange(period,anchor,custom),localDate()),error:""};} catch(e){return {report:null,error:errorMessage(e)};}},[entries,period,anchor,custom]);
  const report=selection.report;
  async function output(print:boolean){if(!report||busy)return;setBusy(true);setStatus("");setError("");try{const result=await(print?printReport(report):exportReport(report));setStatus(result);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  return <div className="min-h-screen pb-32 md:pb-12"><Navbar onOpenAddExpense={()=>setOpen(true)}/><main className="report-page max-w-2xl mx-auto px-4 py-5 space-y-5">
    <div><p className="eyebrow">YOUR MONEY, EXPLAINED</p><h1 className="text-2xl font-bold flex items-center gap-2 mt-1"><BarChart3 size={24}/> Reports</h1><p className="text-xs opacity-80 mt-2">Choose a period. See what came in and where it went.</p></div>
    <section className="retro-box p-4 space-y-4 report-controls" aria-label="Report filters">
      <div role="group" aria-label="Report period" className="grid grid-cols-4 gap-2">{periods.map(([id,label])=><button key={id} type="button" aria-pressed={period===id} onClick={()=>{setPeriod(id);setStatus("");}} className={`${period===id?'retro-btn':'retro-btn-secondary'} text-xs px-1`}>{label}</button>)}</div>
      {period==='custom'?<div className="grid grid-cols-2 gap-3"><label className="text-xs min-w-0">From<input aria-label="Report start date" type="date" className="retro-input mt-2" value={custom.start} onChange={e=>setCustom({...custom,start:e.target.value})}/></label><label className="text-xs min-w-0">To<input aria-label="Report end date" type="date" className="retro-input mt-2" value={custom.end} onChange={e=>setCustom({...custom,end:e.target.value})}/></label></div>:<label className="block text-xs">{period==='weekly'?'Week containing (Monday–Sunday)':period==='monthly'?'Month':'Date'}<input aria-label="Report date" type={period==='monthly'?'month':'date'} value={period==='monthly'?anchor.slice(0,7):anchor} onChange={e=>setAnchor(period==='monthly'?e.target.value+'-01':e.target.value)} className="retro-input mt-2"/></label>}
    </section>
    {(error||selection.error)&&<p role="alert" className="retro-box p-3 text-sm">{error||selection.error}</p>}
    {status&&<p role="status" className="text-xs">{status}</p>}
    {loading?<p className="retro-box p-6">Loading report…</p>:report&&<>
      <div className="flex justify-between gap-2 text-xs opacity-80"><span data-testid="report-range">{report.start} — {report.end}</span><span>{report.count} entries</span></div>
      <section className="grid grid-cols-2 gap-3" aria-label="Income versus expense"><div className="retro-box report-income-card p-4 min-w-0"><ArrowDownLeft size={20} className="mb-3"/><p className="text-xs font-bold opacity-80">INCOME</p><p data-testid="report-income" className="font-bold text-xl sm:text-2xl tabular-nums break-all mt-2">{money(report.income)}</p></div><div className="retro-box report-expense-card p-4 min-w-0"><ArrowUpRight size={20} className="mb-3"/><p className="text-xs font-bold opacity-80">EXPENSES</p><p data-testid="report-expense" className="font-bold text-xl sm:text-2xl tabular-nums break-all mt-2">{money(report.expense)}</p></div></section>
      <section className="retro-box p-4 flex justify-between items-center gap-3"><div><p className="text-xs opacity-80 font-bold">NET CASH FLOW</p><p className="text-[11px] opacity-80 mt-1">Income minus expenses</p></div><p data-testid="report-net" className="text-xl font-bold tabular-nums break-all text-right">{money(report.net)}</p></section>
      <TrendChart report={report}/>
      <section className="retro-box p-4 space-y-5"><h2 className="text-base font-bold">Category breakdown</h2>{!report.count?<p className="text-sm opacity-80 py-4">No entries in this period. Try another date range.</p>:[true,false].map(incoming=>{
        const groups=report.categories.filter(c=>c.income===incoming),total=incoming?report.income:report.expense;
        return <div key={String(incoming)}><h3 className="eyebrow mb-3">{incoming?'INCOME SOURCES':'SPENDING CATEGORIES'}</h3>{!groups.length?<p className="text-xs opacity-80">None recorded</p>:<ul className="space-y-4">{groups.map(c=><li key={c.id}><div className="flex justify-between gap-3 text-xs"><span className="break-words min-w-0">{c.name}<span className="opacity-80 ml-1">({c.count})</span></span><strong className="shrink-0 tabular-nums">{money(c.amount)}</strong></div><div className="h-1.5 bg-current/10 rounded-full mt-2"><div className={`h-full rounded-full ${incoming?'bg-teal-600':'bg-orange-600'}`} style={{width:`${total?c.amount/total*100:0}%`}}/></div></li>)}</ul>}</div>;
      })}</section>
      <section className="retro-box p-4 space-y-3 report-controls"><h2 className="font-bold text-sm">Keep a copy</h2><p className="text-xs opacity-80">Export transactions to CSV, or print a report / save as PDF.</p><div className="grid grid-cols-2 gap-3"><button disabled={busy} onClick={()=>void output(false)} className="retro-btn-secondary text-xs gap-2 px-2"><Download size={16}/> Export CSV</button><button disabled={busy} onClick={()=>void output(true)} className="retro-btn text-xs gap-2 px-2"><Printer size={16}/> Print / PDF</button></div></section>
      <p className="text-[11px] opacity-80 leading-relaxed">Actual money movements, including loans and opening balances. Existing debts and future entries are excluded. This is cash flow, not profit.{report.futureCount>0&&` ${report.futureCount} future entries excluded.`}</p>
    </>}
  </main><BottomNav onOpenAddExpense={()=>setOpen(true)}/><ExpenseModal isOpen={open} onClose={()=>setOpen(false)} onSuccess={refresh} categories={categories}/></div>;
}
function TrendChart({report}:{report:ReturnType<typeof makeReport>}){
  // Large custom ranges use monthly groups; short periods keep daily detail.
  const monthly=(Date.parse(report.end)-Date.parse(report.start))/86400000>62;
  const grouped=new Map<string,{date:string;income:number;expense:number}>();
  for(const d of report.days){const key=monthly?d.date.slice(0,7):d.date;const g=grouped.get(key)??{date:key,income:0,expense:0};g.income+=d.income;g.expense+=d.expense;grouped.set(key,g);}
  if (report.count && !monthly) {
    const date=new Date(`${report.start}T12:00:00Z`);
    while(date.toISOString().slice(0,10)<=report.end){const key=date.toISOString().slice(0,10);if(!grouped.has(key))grouped.set(key,{date:key,income:0,expense:0});date.setUTCDate(date.getUTCDate()+1);}
  }
  const points=[...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date)),max=Math.max(1,...points.flatMap(p=>[p.income,p.expense])),step=520/Math.max(1,points.length);
  return <section className="retro-box p-4 space-y-4"><div><h2 className="text-base font-bold">Income vs. expenses</h2><p className="text-[11px] opacity-80 mt-1">{monthly?'Recorded months':'Daily movement'} in your selected period</p></div><div className="flex gap-5 text-xs"><span><i className="inline-block w-2.5 h-2.5 bg-teal-600 mr-2 rounded-sm"/>Income</span><span><i className="inline-block w-2.5 h-2.5 bg-orange-600 mr-2 rounded-sm"/>Expenses</span></div>{!points.length?<p className="text-center text-sm opacity-80 py-8">Your chart will appear here.</p>:<><svg role="img" aria-label={`Income versus expense chart. Income ${money(report.income)}, expenses ${money(report.expense)}.`} viewBox="0 0 600 230" className="w-full"><title>Income versus expenses by {monthly?'month':'day'}</title><text x="44" y="18" fontSize="14" fill="currentColor">৳ {max.toLocaleString('en-US',{maximumFractionDigits:0})}</text>{[0,1,2].map(i=><line key={i} x1="44" x2="580" y1={38+i*72} y2={38+i*72} stroke="currentColor" strokeOpacity=".12"/>)}{points.map((p,i)=><g key={p.date}>{(['income','expense'] as const).map((type,j)=><rect key={type} x={48+i*step+j*step*.4} y={182-p[type]/max*144} width={Math.min(36,step*.32)} height={p[type]/max*144} fill={type==='income'?'#0d9488':'#ea580c'} rx="2"><title>{p.date}: {type} {money(p[type])}</title></rect>)}{(i===0||i===points.length-1||i%Math.max(1,Math.ceil(points.length/5))===0)&&<text x={48+i*step} y="210" fontSize="14" fill="currentColor">{p.date.slice(5)}</text>}</g>)}</svg><details><summary className="text-xs underline cursor-pointer py-2">View chart figures</summary><div className="overflow-x-auto"><table className="w-full text-xs text-right"><caption className="sr-only">Chart values</caption><thead><tr><th className="text-left py-2">Date</th><th>Income</th><th>Expenses</th></tr></thead><tbody>{points.map(d=><tr key={d.date} className="border-t border-current/10"><th className="text-left py-2 font-normal">{d.date}</th><td>{money(d.income)}</td><td>{money(d.expense)}</td></tr>)}</tbody></table></div></details></>}</section>;
}
