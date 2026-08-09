"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import CategoryModal from "@/components/CategoryModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ExpenseModal, { CategoryType } from "@/components/ExpenseModal";
import { User, Mail, Plus, Trash2, ShieldCheck, LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [deletingCatName, setDeletingCatName] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const handleDeleteCategory = async () => {
    if (!deletingCatId) return;
    setDeleteLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/categories/${deletingCatId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete category");
      }

      setCategories((prev) => prev.filter((c) => c._id !== deletingCatId));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error deleting category");
      }
    } finally {
      setDeleteLoading(false);
      setDeletingCatId(null);
    }
  };

  const confirmDeleteCategory = (cat: CategoryType) => {
    if (cat.isDefault) return;
    setDeletingCatId(cat._id);
    setDeletingCatName(cat.name);
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[#FBF7EE] flex items-center justify-center p-4">
        <div className="retro-box p-6 font-mono-retro text-sm font-bold animate-pulse">
          LOADING SETTINGS...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EE] flex flex-col pb-24 md:pb-12">
      <Navbar onOpenAddExpense={() => setIsExpenseModalOpen(true)} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="retro-btn-secondary px-3 py-1.5 font-mono-retro text-xs gap-1.5 min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" /> BACK TO EXPENSES
          </Link>

          <span className="font-mono-retro font-bold text-xs bg-[#FEF08A] px-2 py-1 border border-[#1C1917]">
            SETTINGS & CONFIG
          </span>
        </div>

        {error && (
          <div className="bg-[#FEE2E2] border-2 border-[#1C1917] p-3 font-mono-retro text-xs text-[#991B1B]">
            ⚠️ {error}
          </div>
        )}

        {/* User Account Info */}
        <section className="bg-[#FFFDF9] border-3 border-[#1C1917] shadow-[5px_5px_0px_0px_#1C1917] p-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#1C1917] pb-3">
            <h2 className="font-mono-retro font-bold text-sm text-[#1C1917] flex items-center gap-2">
              <User className="w-4 h-4 text-[#EA580C]" />
              <span>USER PROFILE</span>
            </h2>
            <span className="bg-[#D1FAE5] text-[#065F46] border border-[#1C1917] text-[10px] font-mono-retro font-bold px-2 py-0.5">
              ACTIVE
            </span>
          </div>

          <div className="space-y-3 font-mono-retro text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-[#FBF7EE] border-2 border-[#1C1917]">
              <span className="text-stone-500">NAME:</span>
              <span className="font-bold text-[#1C1917]">{user?.name}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-[#FBF7EE] border-2 border-[#1C1917]">
              <span className="text-stone-500">EMAIL:</span>
              <span className="font-bold text-[#1C1917]">{user?.email}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="retro-btn-danger w-full font-mono-retro text-xs gap-2 py-2"
          >
            <LogOut className="w-4 h-4" /> LOG OUT OF ACCOUNT
          </button>
        </section>

        {/* Category Management */}
        <section className="bg-[#FFFDF9] border-3 border-[#1C1917] shadow-[5px_5px_0px_0px_#1C1917] p-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#1C1917] pb-3">
            <div>
              <h2 className="font-mono-retro font-bold text-sm text-[#1C1917] uppercase">
                Expense Categories
              </h2>
              <p className="font-mono-retro text-[11px] text-stone-600 mt-0.5">
                Manage default &amp; custom categories
              </p>
            </div>

            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="retro-btn text-xs px-3 py-1.5 font-mono-retro gap-1 min-h-[36px]"
            >
              <Plus className="w-4 h-4" /> ADD
            </button>
          </div>

          {/* List of categories */}
          {loading ? (
            <div className="p-4 text-center font-mono-retro text-xs animate-pulse">
              LOADING CATEGORIES...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className="p-3 border-2 border-[#1C1917] bg-[#FBF7EE] shadow-[2px_2px_0px_0px_#1C1917] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl flex-shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <span className="font-mono-retro font-bold text-xs text-[#1C1917] truncate block">
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-mono-retro text-stone-500 uppercase">
                        {cat.isDefault ? "Default Category" : "Custom Category"}
                      </span>
                    </div>
                  </div>

                  {cat.isDefault ? (
                    <span
                      title="Default category cannot be deleted"
                      className="px-2 py-0.5 bg-[#FEF08A] text-[#1C1917] border border-[#1C1917] font-mono-retro text-[10px] font-bold flex-shrink-0 flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3 text-[#EA580C]" /> DEFAULT
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmDeleteCategory(cat)}
                      className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-[#FEE2E2] border-2 border-[#1C1917] shadow-[1px_1px_0px_0px_#1C1917] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-[#EF4444] hover:text-white transition-all group"
                      title={`Delete ${cat.name}`}
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#991B1B] group-hover:text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav onOpenAddExpense={() => setIsExpenseModalOpen(true)} />

      {/* Add Custom Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={fetchCategories}
      />

      {/* Delete Category Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingCatId}
        title="DELETE CATEGORY"
        message={`Are you sure you want to delete category "${deletingCatName}"? Note: Categories with associated expenses cannot be deleted until those expenses are reassigned or removed.`}
        onClose={() => setDeletingCatId(null)}
        onConfirm={handleDeleteCategory}
        loading={deleteLoading}
      />

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          // If on settings page, switch to dashboard or refresh
        }}
        categories={categories}
      />
    </div>
  );
}
