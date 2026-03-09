"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

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
    { label: "Clientes", value: stats.customers, icon: "👥", bg: "#0c4a6e22", color: "#38bdf8", href: "/dashboard/clientes" },
    { label: "Planos", value: stats.plans, icon: "📋", bg: "#065f4622", color: "#34d399", href: "/dashboard/planos" },
    { label: "Contas Bancárias", value: stats.accounts, icon: "🏦", bg: "#78350f22", color: "#fbbf24", href: "/dashboard/contas" },
    { label: "Erros registrados", value: stats.errors, icon: "🐛", bg: "#7f1d1d22", color: "#f87171", href: "/dashboard/logs" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 }}>Visão Geral</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Painel administrativo SYSGE</p>
        </div>
        <button onClick={loadStats} disabled={loading} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Carregando…" : "🔄 Atualizar"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          ❌ {error} — <button onClick={loadStats} style={{ background: "none", border: "none", color: "#fca5a5", textDecoration: "underline", fontWeight: 600, cursor: "pointer" }}>tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 110, borderRadius: 12, background: "#1e293b", animation: "pulse 2s infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {cards.map((card) => (
            <Link key={card.label} href={card.href} style={{ textDecoration: "none", background: card.bg, border: "1px solid #334155", borderRadius: 12, padding: 20, transition: "all 0.15s" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{card.icon}</div>
              <p style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</p>
              <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{card.label}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
