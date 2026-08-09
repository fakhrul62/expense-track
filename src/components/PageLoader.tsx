"use client";

import React, { useState, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

function PageLoaderContent({
  isGlobalLoading = false,
  loadingText = "LOADING...",
}: {
  isGlobalLoading?: boolean;
  loadingText?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Clear loader on route change complete
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Intercept link clicks to trigger top loading indicator instantly
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
        const url = new URL(anchor.href);
        if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  const showLoader = isNavigating || isGlobalLoading;

  return (
    <>
      {/* Top Animated Retro Progress Bar */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: [0, 0.4, 0.8, 0.95], opacity: 1 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ transformOrigin: "0% 50%" }}
            className="fixed top-0 left-0 right-0 h-1.5 bg-[#EA580C] border-b border-[#1C1917] z-[100] shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
          />
        )}
      </AnimatePresence>

      {/* Retro Center Loading Overlay Badge for Auth & Global Actions */}
      <AnimatePresence>
        {isGlobalLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 10 }}
              className="bg-[#FFFDF9] border-3 border-[#1C1917] shadow-[6px_6px_0px_0px_#1C1917] p-5 flex items-center gap-3 font-mono-retro font-bold text-sm text-[#1C1917]"
            >
              <div className="w-7 h-7 flex items-center justify-center bg-[#FEF08A] border-2 border-[#1C1917]">
                <Loader2 className="w-4 h-4 text-[#EA580C] animate-spin" />
              </div>
              <span className="uppercase tracking-wider">{loadingText}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function PageLoader(props: {
  isGlobalLoading?: boolean;
  loadingText?: string;
}) {
  return (
    <Suspense fallback={null}>
      <PageLoaderContent {...props} />
    </Suspense>
  );
}
