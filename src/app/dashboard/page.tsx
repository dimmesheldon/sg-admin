"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Stats {
  customers: number;
  plans: number;
  accounts: number;
  errors: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ customers: 0, plans: 0, accounts: 0, errors: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{ customers: unknown[] }>("/api/admin/customers").catch(() => ({ customers: [] })),
      apiGet<{ plans: unknown[] }>("/api/admin/plans").catch(() => ({ plans: [] })),
      apiGet<{ accounts: unknown[] }>("/api/admin/bank-accounts").catch(() => ({ accounts: [] })),
      apiGet<{ total: number }>("/api/admin/logs").catch(() => ({ total: 0 })),
    ]).then(([c, p, a, l]) => {
      setStats({
        customers: c.customers?.length || 0,
        plans: p.plans?.length || 0,
        accounts: a.accounts?.length || 0,
        errors: l.total || 0,
      });
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: "Clientes", value: stats.customers, icon: "🏢", color: "bg-sky-50 text-sky-700", href: "/dashboard/clientes" },
    { label: "Planos", value: stats.plans, icon: "📋", color: "bg-emerald-50 text-emerald-700", href: "/dashboard/planos" },
    { label: "Contas Bancárias", value: stats.accounts, icon: "🏦", color: "bg-amber-50 text-amber-700", href: "/dashboard/contas" },
    { label: "Erros registrados", value: stats.errors, icon: "🐛", color: "bg-red-50 text-red-700", href: "/dashboard/logs" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Visão Geral</h1>
      <p className="text-sm text-gray-500 mb-8">Painel administrativo SYSGE</p>

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
