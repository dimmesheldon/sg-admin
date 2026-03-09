"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Stats {
  customers: number;
  plans: number;
  accounts: number;
  errors: number;
}

export default function DashboardPage() {
  const { admin } = useAuth();
  const [stats, setStats] = useState<Stats>({ customers: 0, plans: 0, accounts: 0, errors: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [c, p, a, l] = await Promise.all([
        apiGet<{ ok: boolean; customers: unknown[] }>("/api/admin/customers"),
        apiGet<{ ok: boolean; plans: unknown[] }>("/api/admin/plans"),
        apiGet<{ ok: boolean; accounts: unknown[] }>("/api/admin/bank-accounts"),
        apiGet<{ ok: boolean; total: number }>("/api/admin/logs?page=1&limit=1"),
      ]);
      setStats({
        customers: c.customers?.length || 0,
        plans: p.plans?.length || 0,
        accounts: a.accounts?.length || 0,
        errors: l.total || 0,
      });
    } catch (err: any) {
      console.error("Dashboard load error:", err);
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) loadStats();
  }, [admin, loadStats]);

  const cards = [
    { label: "Clientes", value: stats.customers, icon: "🏢", color: "bg-sky-50 text-sky-700", href: "/dashboard/clientes" },
    { label: "Planos", value: stats.plans, icon: "📋", color: "bg-emerald-50 text-emerald-700", href: "/dashboard/planos" },
    { label: "Contas Bancárias", value: stats.accounts, icon: "🏦", color: "bg-amber-50 text-amber-700", href: "/dashboard/contas" },
    { label: "Erros registrados", value: stats.errors, icon: "🐛", color: "bg-red-50 text-red-700", href: "/dashboard/logs" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Visão Geral</h1>
          <p className="text-sm text-gray-500">Painel administrativo SYSGE</p>
        </div>
        <button onClick={loadStats} disabled={loading} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition disabled:opacity-50">
          {loading ? "Carregando…" : "🔄 Atualizar"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg p-3 text-sm border bg-red-50 text-red-600 border-red-200">
          ❌ {error} — <button onClick={loadStats} className="underline font-semibold">tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              className={`rounded-xl p-5 ${card.color} border border-transparent hover:border-current/10 transition`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{card.icon}</span>
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-sm opacity-75 mt-1">{card.label}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
