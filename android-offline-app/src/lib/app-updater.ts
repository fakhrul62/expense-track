import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface UpdateState { currentVersion: string; currentCode: number; latestVersion?: string; latestCode?: number; available: boolean; ready: boolean; canInstall: boolean }
interface Updater {
  getState(): Promise<UpdateState>;
  check(): Promise<UpdateState>;
  download(): Promise<UpdateState>;
  install(): Promise<{ status: "permission" | "installer" }>;
  cancelDownload(): Promise<void>;
  addListener(name: "downloadProgress", listener: (event: {percent: number}) => void): Promise<PluginListenerHandle>;
}
export const appUpdater = registerPlugin<Updater>("AppUpdater");
export const updateAvailable = (state: UpdateState | null) => !!state?.available && Number.isInteger(state.latestCode) && state.latestCode! > state.currentCode;
