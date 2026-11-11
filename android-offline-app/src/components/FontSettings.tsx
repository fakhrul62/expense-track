"use client";
import { useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { useTheme } from "@/context/ThemeContext";
const nativeAppearance=registerPlugin<{apply(options:{color:string;dark:boolean}):Promise<void>}>("AppAppearance");
const PALETTE:Record<string,readonly[string,string]>={studio:["#f3f5f9","#161e29"],paper:["#f6f0e5","#241f1a"],garden:["#edf3ed","#14251f"],ink:["#eef2f9","#161e29"],retro:["#FBF7EE","#151719"]};
export const FONT_CHOICES = [
  {id:"inter",label:"Inter",family:'"Inter", sans-serif',hint:"Clean"},
  {id:"arial",label:"Arial style",family:'Arial, "Arimo", sans-serif',hint:"Familiar"},
  {id:"calibri",label:"Calibri style",family:'Calibri, "Carlito", sans-serif',hint:"Soft"},
  {id:"system",label:"Phone default",family:'system-ui, sans-serif',hint:"Native"},
  {id:"retro",label:"Retro",family:'"Space Mono", monospace',hint:"Original"},
];
export const APPEARANCES = [
  {id:"studio",name:"Studio",font:"inter",mode:"light",colors:['#f3f5f9','#fff','#315cba'],hint:"Crisp & focused"},
  {id:"paper",name:"Paper",font:"calibri",mode:"light",colors:['#f6f0e5','#fffcf5','#86563c'],hint:"Warm & quiet"},
  {id:"garden",name:"Garden",font:"arial",mode:"light",colors:['#edf3ed','#fafdf9','#27624e'],hint:"Fresh & balanced"},
  {id:"ink",name:"Ink",font:"inter",mode:"dark",colors:['#121c29','#1d2b3e','#b4cbff'],hint:"Calm after dark"},
  {id:"retro",name:"Retro",font:"retro",mode:"light",colors:['#fbf7ee','#fef08a','#ea580c'],hint:"The original character"},
] as const;
function subscribe(callback:()=>void){window.addEventListener("exptrack:font",callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener("exptrack:font",callback);window.removeEventListener("storage",callback);};}
function fontSnapshot(){try{const value=localStorage.getItem('exptrack-font');return FONT_CHOICES.some(f=>f.id===value)?value!:"inter";}catch{return "inter";}}
function lookSnapshot(){try{const value=localStorage.getItem('exptrack-look');return APPEARANCES.some(t=>t.id===value)?value!:"studio";}catch{return "studio";}}
function useFont(){return useSyncExternalStore(subscribe,fontSnapshot,()=>"inter");}
function useLook(){return useSyncExternalStore(subscribe,lookSnapshot,()=>"studio");}
export function FontPreference(){const font=useFont(),look=useLook();const {theme}=useTheme();useEffect(()=>{document.documentElement.dataset.appFont=font;document.documentElement.dataset.look=look;if(Capacitor.isNativePlatform())void nativeAppearance.apply({color:PALETTE[look][theme==='dark'?1:0],dark:theme==='dark'}).catch(e=>console.warn("Appearance:",e));},[font,look,theme]);return null;}
export default function FontSettings(){
  const font=useFont(),look=useLook();
  function choose(id:string){const preset=APPEARANCES.find(t=>t.id===id)!;localStorage.setItem('exptrack-look',id);localStorage.setItem('exptrack-font',preset.font);localStorage.setItem('theme',preset.mode);window.dispatchEvent(new Event('exptrack:font'));window.dispatchEvent(new Event('exptrack:theme'));}
  return <section className="retro-box-lg p-5 space-y-4" aria-labelledby="appearance-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h2 id="appearance-heading" className="font-bold text-lg mt-1">Appearance</h2><p className="text-xs opacity-65 mt-2">Each look pairs a font, palette and card style. Saved on this device.</p></div>
    <div role="group" aria-label="Choose appearance" className="grid grid-cols-2 gap-3">{APPEARANCES.map(t=><button key={t.id} type="button" aria-pressed={look===t.id} onClick={()=>choose(t.id)} className="appearance-option min-w-0 text-left border-2 rounded-lg p-3 space-y-2" style={{"--preview-bg":t.colors[0],"--preview-text":t.id==='ink'?'#e8eefb':'#252b2a',"--preview-line":look===t.id?t.colors[2]:'transparent',background:t.colors[0],color:t.id==='ink'?'#e8eefb':'#252b2a',borderColor:look===t.id?t.colors[2]:'transparent',fontFamily:FONT_CHOICES.find(f=>f.id===t.font)!.family} as CSSProperties}><div className="flex gap-1.5" aria-hidden="true">{t.colors.map(c=><span key={c} className="w-5 h-5 rounded-full border border-black/10" style={{background:c}}/>)}</div><span className="block text-sm font-bold">{t.name}{look===t.id?' ✓':''}</span><span className="block text-[11px] opacity-70">{t.hint}</span></button>)}</div>
    <details className="border-t border-current/15 pt-3"><summary className="text-xs font-bold cursor-pointer py-1">Fine-tune the font</summary><label className="block mt-3 text-xs">App font<select aria-label="App font" value={font} onChange={e=>{localStorage.setItem('exptrack-font',e.target.value);window.dispatchEvent(new Event('exptrack:font'));}} className="retro-input mt-2">{FONT_CHOICES.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label><p className="text-[11px] opacity-60 mt-2">Arial-style and Calibri-style use bundled offline alternatives.</p></details>
  </section>;
}
