"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api, setToken, clearToken, getToken } from "@/lib/api";

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
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ ok: boolean; admin: Admin }>("/api/admin/auth/session");
      if (data.ok && data.admin) {
        setAdmin(data.admin as Admin);
      } else {
        clearToken();
        setAdmin(null);
      }
    } catch {
      clearToken();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, password: string) => {
    const data = await api<{ ok: boolean; token: string; admin: Admin }>("/api/admin/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (data.ok && data.token) {
      setToken(data.token);
      setAdmin(data.admin);
    }
  };

  const logout = async () => {
    try {
      await api("/api/admin/auth/session", { method: "DELETE" });
    } catch { /* ignore */ }
    clearToken();
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
