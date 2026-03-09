"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const data = await api<{ ok: boolean; admin: Admin }>("/api/admin/auth/session");
      if (data.ok) setAdmin(data.admin);
      else setAdmin(null);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, password: string) => {
    const data = await api<{ ok: boolean; admin: Admin }>("/api/admin/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (data.ok) setAdmin(data.admin);
  };

  const logout = async () => {
    try {
      await api("/api/admin/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve estar dentro de AuthProvider");
  return ctx;
}
