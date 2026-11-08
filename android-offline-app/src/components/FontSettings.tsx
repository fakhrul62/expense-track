"use client";
import { useEffect, useSyncExternalStore } from "react";

export const FONT_CHOICES = [
  { id: "inter", label: "Inter", family: '"Inter", sans-serif', hint: "Clean & easy to read" },
  { id: "arial", label: "Arial style", family: 'Arial, "Arimo", sans-serif', hint: "Familiar & clear" },
  { id: "calibri", label: "Calibri style", family: 'Calibri, "Carlito", sans-serif', hint: "Soft & readable" },
  { id: "system", label: "Phone default", family: 'system-ui, sans-serif', hint: "Your device font" },
  { id: "retro", label: "Retro", family: '"Space Mono", monospace', hint: "Original look" },
];
function subscribe(callback: () => void) {
  window.addEventListener("exptrack:font", callback); window.addEventListener("storage", callback);
  return () => { window.removeEventListener("exptrack:font", callback); window.removeEventListener("storage", callback); };
}
function snapshot() {
  try { const value = localStorage.getItem("exptrack-font"); return FONT_CHOICES.some(font => font.id === value) ? value! : "inter"; }
  catch { return "inter"; }
}
function useFont() { return useSyncExternalStore(subscribe, snapshot, () => "inter"); }
export function FontPreference() {
  const font = useFont();
  useEffect(() => { document.documentElement.dataset.appFont = font; }, [font]);
  return null;
}
export default function FontSettings() {
  const selected = useFont();
  function choose(value: string) { localStorage.setItem("exptrack-font", value); window.dispatchEvent(new Event("exptrack:font")); }
  return <section className="retro-box-lg p-5 space-y-3" aria-labelledby="font-heading">
    <h2 id="font-heading" className="font-mono-retro font-bold text-sm">APP FONT</h2>
    <p className="text-xs opacity-70">Choose what is comfortable to read. Saved on this device.</p>
    <div className="grid grid-cols-2 gap-3" role="group" aria-label="Choose app font">{FONT_CHOICES.map(font => <button key={font.id} type="button" aria-pressed={selected === font.id} onClick={() => choose(font.id)} className={`${selected === font.id ? "retro-btn" : "retro-btn-secondary"} flex-col items-start px-3 py-3 gap-1 min-w-0`} style={{fontFamily:font.family}}><span className="text-sm font-bold">{font.label}</span><span className="text-base tabular-nums">Aa 1,234.50</span><span className="text-[10px] opacity-70">{font.hint}</span></button>)}</div>
    <p className="text-[11px] opacity-60">Arial-style and Calibri-style fonts are bundled alternatives, so they work offline on Android.</p>
  </section>;
}
