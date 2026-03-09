/**
 * Cliente HTTP para comunicar com o backend (gestao-igreja).
 * Em produção: aponta para www.adebcomadesma.com.br (temporário)
 * Futuro: cada cliente terá seu próprio domínio.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = opts;

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
