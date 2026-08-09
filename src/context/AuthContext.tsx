"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import PageLoader from "@/components/PageLoader";

export interface UserType {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface AuthContextType {
  user: UserType | null;
  loading: boolean;
  globalLoadingState: string | null;
  setGlobalLoadingState: (state: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/login", "/register"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [globalLoadingState, setGlobalLoadingState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Handle route protection
  useEffect(() => {
    if (!loading) {
      const isPublicPath = PUBLIC_PATHS.includes(pathname);
      if (!user && !isPublicPath) {
        router.push("/login");
      } else if (user && isPublicPath) {
        router.push("/");
      }
      setGlobalLoadingState(null);
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    setGlobalLoadingState("AUTHENTICATING...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      setUser(data.user);
      setGlobalLoadingState("REDIRECTING...");
      router.push("/");
    } catch (err) {
      setGlobalLoadingState(null);
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setGlobalLoadingState("CREATING ACCOUNT...");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register");
      }

      setUser(data.user);
      setGlobalLoadingState("REDIRECTING...");
      router.push("/");
    } catch (err) {
      setGlobalLoadingState(null);
      throw err;
    }
  };

  const logout = async () => {
    setGlobalLoadingState("LOGGING OUT...");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        globalLoadingState,
        setGlobalLoadingState,
        login,
        register,
        logout,
        refreshUser: fetchUser,
      }}
    >
      <PageLoader
        isGlobalLoading={!!globalLoadingState}
        loadingText={globalLoadingState || "LOADING..."}
      />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
