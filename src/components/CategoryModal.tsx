"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag } from "lucide-react";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_EMOJIS = [
  "☕", "🛒", "⚡", "🚕", "🎬", "🍔", "🎁", "💊", 
  "🏠", "📦", "💻", "👕", "📚", "✈️", "🏋️", "🎮"
];

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const [name, setName] = useState<string>("");
  const [icon, setIcon] = useState<string>("🏷️");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !name.trim()) {
      setError("Please enter a category name");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon: icon || "🏷️" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      setName("");
      setIcon("🏷️");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-[#FFFDF9] border-t-3 sm:border-3 border-[#1C1917] shadow-[6px_6px_0px_0px_#1C1917] p-5 sm:p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#1C1917] pb-3 mb-4">
            <h2 className="font-mono-retro font-bold text-base text-[#1C1917] flex items-center gap-2">
              <span className="bg-[#FEF08A] px-2 py-0.5 border border-[#1C1917]">
                + NEW CATEGORY
              </span>
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-[#FFFDF9] border-2 border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150"
            >
              <X className="w-5 h-5 text-[#1C1917]" />
            </button>
          </div>

          {error && (
            <div className="bg-[#FEE2E2] border-2 border-[#1C1917] p-3 mb-4 font-mono-retro text-xs text-[#991B1B]">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Name */}
            <div>
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
                Category Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#1C1917]">
                  <Tag className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Snacks, Coffee, Taxi..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="retro-input pl-10 text-sm font-mono-retro font-bold"
                  autoFocus
                />
              </div>
            </div>

            {/* Icon / Emoji Selection */}
            <div>
              <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
                Icon / Emoji
              </label>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-12 h-12 flex items-center justify-center text-2xl bg-[#FEF08A] border-2 border-[#1C1917] shadow-[2px_2px_0px_0px_#1C1917]">
                  {icon || "🏷️"}
                </div>
                <input
                  type="text"
                  placeholder="Emoji"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={4}
                  className="retro-input text-center text-xl w-24 font-mono-retro"
                />
              </div>
              <div className="grid grid-cols-8 gap-1.5 p-2 border-2 border-[#1C1917] bg-[#FBF7EE]">
                {PRESET_EMOJIS.map((eItem) => (
                  <button
                    key={eItem}
                    type="button"
                    onClick={() => setIcon(eItem)}
                    className={`w-8 h-8 text-lg flex items-center justify-center border transition-all ${
                      icon === eItem
                        ? "bg-[#EA580C] border-[#1C1917]"
                        : "bg-[#FFFDF9] border-stone-300 hover:bg-[#FEF08A]"
                    }`}
                  >
                    {eItem}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="retro-btn-secondary flex-1 font-mono-retro"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="retro-btn flex-1 font-mono-retro"
              >
                {loading ? "SAVING..." : "ADD CATEGORY"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
