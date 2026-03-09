/**
 * Cliente HTTP para comunicar com o backend (gestao-igreja).
 * Usa Bearer token para autenticação cross-origin.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const TOKEN_KEY = "sg_admin_token";

// Token management
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = opts;

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
    }
    throw new Error(data.message || `Erro ${res.status}`);
  }
  return data as T;
}

// Atalhos
export const apiGet = <T = unknown>(path: string) => api<T>(path);
export const apiPost = <T = unknown>(path: string, body: unknown) => api<T>(path, { method: "POST", body });
export const apiPut = <T = unknown>(path: string, body: unknown) => api<T>(path, { method: "PUT", body });
export const apiPatch = <T = unknown>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body });
export const apiDelete = <T = unknown>(path: string) => api<T>(path, { method: "DELETE" });
