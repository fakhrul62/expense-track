"use client";
import { useEffect, useRef } from "react";

export function useModal(open: boolean, close: () => void, busy = false) {
  const closeRef = useRef(close);
  const busyRef = useRef(busy);
  useEffect(() => { closeRef.current = close; busyRef.current = busy; }, [close, busy]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const focused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const back = () => { if (!busyRef.current) closeRef.current(); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") back();
      if (event.key === "Tab") {
        const elements = document.querySelector('[role="dialog"]')?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("exptrack:back", back);
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("exptrack:back", back);
      document.removeEventListener("keydown", key);
      focused?.focus();
    };
  }, [open]);
}
