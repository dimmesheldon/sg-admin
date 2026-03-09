"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const { login, admin, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Se já logado, redireciona
  if (!loading && admin) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-sky-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Image src="/sysge-logo.svg" alt="SYSGE" width={180} height={180} className="mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">SG Admin</h1>
          <p className="text-sm text-gray-500">Sistema de Gestão Eclesiástica</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          <h2 className="mb-6 text-lg font-semibold text-gray-700">Entrar no painel</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <label className="block mb-4">
            <span className="text-sm font-medium text-gray-600">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
              placeholder="sgadmin@sysge.com.br"
            />
          </label>

          <label className="block mb-6">
            <span className="text-sm font-medium text-gray-600">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          SYSGE © {new Date().getFullYear()} — Sistema de Gestão Eclesiástica
        </p>
      </div>
    </div>
  );
}
