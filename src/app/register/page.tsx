"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { User as UserIcon, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to register account");
      }
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#FBF7EE] relative">
      <div className="w-full max-w-md bg-[#FFFDF9] border-3 border-[#1C1917] shadow-[6px_6px_0px_0px_#1C1917] p-6 sm:p-8">
        {/* Branding Header */}
        <div className="text-center border-b-2 border-[#1C1917] pb-5 mb-6">
          <div className="inline-block bg-[#FEF08A] border-2 border-[#1C1917] px-3 py-1 font-mono-retro font-black text-2xl tracking-tighter text-[#1C1917] shadow-[3px_3px_0px_0px_#1C1917] mb-3">
            EXPTRACK
          </div>
          <h1 className="font-mono-retro text-lg font-bold text-[#1C1917] tracking-tight">
            CREATE AN ACCOUNT
          </h1>
          <p className="font-mono-retro text-xs text-stone-600 mt-1">
            Start tracking daily expenses today
          </p>
        </div>

        {error && (
          <div className="bg-[#FEE2E2] border-2 border-[#1C1917] p-3 mb-5 font-mono-retro text-xs text-[#991B1B]">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1C1917] z-10">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="retro-input retro-input-icon text-sm font-mono-retro"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1C1917] z-10">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="retro-input retro-input-icon text-sm font-mono-retro"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block font-mono-retro text-xs font-bold text-[#1C1917] mb-1.5 uppercase">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1C1917] z-10">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="retro-input retro-input-icon text-sm font-mono-retro"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="retro-btn w-full font-mono-retro text-sm gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>CREATING ACCOUNT...</span>
              </>
            ) : (
              <>
                <span>REGISTER NOW</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-5 border-t-2 border-[#1C1917] text-center">
          <p className="font-mono-retro text-xs text-[#1C1917]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold underline decoration-[#EA580C] underline-offset-2 hover:text-[#EA580C]"
            >
              LOG IN HERE
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
