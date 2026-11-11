import { Capacitor, registerPlugin } from "@capacitor/core";
import { makeReport, reportCSV, reportHTML } from "@/lib/reports";
const native = registerPlugin<{ save(options:{text:string;filename:string}):Promise<{cancelled?:boolean}>; print(options:{html:string}):Promise<void> }>("ReportExport");
type Report = ReturnType<typeof makeReport>;
export async function exportReport(report:Report) {
  const text=reportCSV(report),filename=`EXPTRACK-${report.start}-to-${report.end}.csv`;
  if(Capacitor.isNativePlatform()){const result=await native.save({text,filename});return result.cancelled?"Export cancelled.":"Report saved to your chosen folder.";}
  const url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);return "CSV download started.";
}
export async function printReport(report:Report) {
  const html=reportHTML(report);
  if(Capacitor.isNativePlatform())await native.print({html});
  else {
    const frame=document.createElement('iframe');frame.setAttribute('title','Printable money report');frame.style.cssText='position:fixed;width:1px;height:1px;left:-9999px';
    frame.onload=()=>{frame.contentWindow?.focus();frame.contentWindow?.print();};frame.srcdoc=html;document.body.appendChild(frame);setTimeout(()=>frame.remove(),60000);
  }
  return "Print options opened. Choose Save as PDF or a printer.";
}
