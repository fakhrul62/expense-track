"use client";
import { CloudCheck, CloudOff, RefreshCw } from "lucide-react";
import { useSync } from "@/context/SyncContext";

export default function SyncStatus({ detailed = false }: { detailed?: boolean }) {
  const { status, pending, message, lastSynced, syncNow } = useSync();
  const label = status === "syncing" ? "Syncing..." : status === "synced" ? "Synced to your account" : status === "offline" ? "Offline · saved on this device" : "Saved here · waiting to sync";
  return <div className={detailed ? "space-y-3" : "text-xs opacity-80"}>
    <div className="flex items-center justify-between gap-3">
      <span role="status" className="flex items-center gap-2 text-xs min-w-0">
        {status === "syncing" ? <RefreshCw className="w-4 h-4 shrink-0 animate-spin" /> : status === "synced" ? <CloudCheck className="w-4 h-4 shrink-0" /> : <CloudOff className="w-4 h-4 shrink-0" />}
        <span>{label}{pending > 0 && ` (${pending} pending)`}</span>
      </span>
      {(detailed || status === "error") && <button disabled={status === "syncing"} onClick={syncNow} className="retro-btn-secondary px-3 min-h-9 text-xs shrink-0">SYNC NOW</button>}
    </div>
    {detailed && <><p className="text-sm">Sign in with the same account on the app and website. Entries, edits, deletions and categories sync when connected. Offline changes are saved here until they upload.</p><p className="text-xs opacity-75">{lastSynced ? `Last synced: ${new Date(lastSynced).toLocaleString()}` : "Waiting for the first sync."} If the same entry is edited on two devices, the last change to reach the server wins.</p></>}
    {message && (detailed || status === "synced") && <p className="text-xs mt-2 opacity-75">{message}</p>}
  </div>;
}
