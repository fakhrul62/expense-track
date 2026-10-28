import { Capacitor, registerPlugin } from "@capacitor/core";
import { accountServiceRequest } from "@/lib/account-client";

export const GoogleAuth = registerPlugin<{
  signIn(input: { clientId: string; nonce: string }): Promise<{ idToken: string }>;
  signOut(): Promise<void>;
}>("GoogleAuth");
export const nativeGoogle = () => Capacitor.getPlatform() === "android";
export const googleConfiguration = () => accountServiceRequest<{ clientId: string | null }>("google-config");
export const googleChallenge = () => accountServiceRequest<{ clientId: string; nonce: string }>("google-start", {});

export interface GoogleIdentityServices {
  accounts: { id: {
    initialize(options: { client_id: string; nonce: string; callback: (response: { credential: string }) => void; auto_select: boolean }): void;
    renderButton(element: HTMLElement, options: { type: string; theme: string; size: string; text: string; width: number }): void;
    disableAutoSelect(): void;
  } };
}
declare global { interface Window { google?: GoogleIdentityServices } }
let script: Promise<GoogleIdentityServices> | undefined;
export function loadGoogleIdentity() {
  return script ??= new Promise<GoogleIdentityServices>((resolve, reject) => {
    if (window.google) { resolve(window.google); return; }
    const element = document.createElement("script");
    element.src = "https://accounts.google.com/gsi/client";
    element.async = true;
    const timeout = window.setTimeout(() => { element.remove(); reject(new Error("Google sign-in could not load. Check your connection and try again.")); }, 15000);
    element.onload = () => {
      clearTimeout(timeout);
      if (window.google) resolve(window.google);
      else reject(new Error("Google sign-in could not load."));
    };
    element.onerror = () => { clearTimeout(timeout); element.remove(); reject(new Error("Google sign-in could not load. Check your connection and try again.")); };
    document.head.appendChild(element);
  }).catch(error => { script = undefined; throw error; });
}

export async function clearGoogleSignIn() {
  if (nativeGoogle()) await GoogleAuth.signOut();
  else window.google?.accounts.id.disableAutoSelect();
}
