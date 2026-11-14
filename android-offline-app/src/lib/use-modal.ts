"use client";
import { useEffect, useRef } from "react";

let lastPointerTarget: HTMLElement | null = null;
let subscribers = 0;
const rememberTrigger = (event: PointerEvent) => {
  if (event.target instanceof Element) lastPointerTarget = event.target.closest<HTMLElement>('button, a[href], [role="button"]');
};
export function useModal(open: boolean, close: () => void, busy = false) {
  const closeRef = useRef(close);
  const busyRef = useRef(busy);
  useEffect(() => { closeRef.current = close; busyRef.current = busy; }, [close, busy]);
  useEffect(() => {
    if (subscribers++ === 0) document.addEventListener("pointerdown", rememberTrigger, true);
    return () => { if (--subscribers === 0) { document.removeEventListener("pointerdown", rememberTrigger, true); lastPointerTarget = null; } };
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const active = document.activeElement as HTMLElement | null;
    // Android touch can blur a button before its click opens the dialog.
    const focused = active && active !== document.body ? active : lastPointerTarget;
    const focusKey = focused?.dataset.focusKey;
    document.body.style.overflow = "hidden";
    const dialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1);
    const previousTabIndex = dialog?.getAttribute("tabindex");
    if (dialog) dialog.tabIndex = -1;
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? [])].filter(element => element.getClientRects().length > 0 && !element.closest('[inert]'));
    const hidden: { element: HTMLElement; inert: boolean }[] = [];
    // Inert siblings along the ancestor path without disabling the dialog itself.
    for (let branch = dialog; branch?.parentElement && branch !== document.body; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) if (sibling !== branch && sibling instanceof HTMLElement) {
        hidden.push({ element: sibling, inert: sibling.inert }); sibling.inert = true;
      }
    }
    const moveInside = () => {
      const preferred = dialog?.querySelector<HTMLElement>('[data-modal-initial-focus], [autofocus]');
      (preferred ?? focusable()[0] ?? dialog)?.focus();
    };
    if (dialog && !dialog.contains(document.activeElement)) moveInside();
    const contain = (event: FocusEvent) => { if (dialog && !dialog.inert && !dialog.contains(event.target as Node)) moveInside(); };
    const back = () => { if (!busyRef.current) closeRef.current(); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") back();
      if (event.key === "Tab") {
        const elements = focusable();
        if (!elements.length) { event.preventDefault(); dialog?.focus(); return; }
        const first = elements[0], last = elements[elements.length - 1];
        if (!dialog?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("exptrack:back", back);
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", contain);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("exptrack:back", back);
      document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", contain);
      for (const { element, inert } of hidden) element.inert = inert;
      if (dialog) { if (previousTabIndex == null) dialog.removeAttribute("tabindex"); else dialog.setAttribute("tabindex", previousTabIndex); }
      const restore = focused?.isConnected ? focused : focusKey ? document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]`) : null;
      restore?.focus();
    };
  }, [open]);
}
