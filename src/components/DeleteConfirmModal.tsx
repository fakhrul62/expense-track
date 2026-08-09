"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  title = "CONFIRM DELETE",
  message,
  onClose,
  onConfirm,
  loading = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="w-full max-w-sm bg-[#FFFDF9] border-3 border-[#1C1917] shadow-[6px_6px_0px_0px_#1C1917] p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#1C1917] pb-2.5 mb-4">
            <h3 className="font-mono-retro font-bold text-sm text-[#991B1B] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>{title}</span>
            </h3>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center bg-[#FFFDF9] border-2 border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150"
            >
              <X className="w-4 h-4 text-[#1C1917]" />
            </button>
          </div>

          <p className="font-mono-retro text-xs text-[#1C1917] mb-6 leading-relaxed bg-[#FEE2E2] p-3 border-2 border-[#1C1917]">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="retro-btn-secondary flex-1 font-mono-retro text-xs"
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="retro-btn-danger flex-1 font-mono-retro text-xs"
            >
              {loading ? "DELETING..." : "YES, DELETE"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
