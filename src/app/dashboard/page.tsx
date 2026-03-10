"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchApi(path: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("sg_admin_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, credentials: "include" });
  return res.json();
}

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  onlineNow: number;
  trialCustomers: number;
  pendingInvoices: number;
  pendingInvoicesTotal: number;
  unresolvedLogs: number;
  unreadChats: number;
  pendingDevices: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi("/api/admin/customers");

        if (!data.ok) return;

        const customers: any[] = data.customers;
        const onlineNow = customers.filter((c) => c.isOnline).length;
        const activeCustomers = customers.filter((c) => c.status === "ACTIVE").length;
        const trialCustomers = customers.filter((c) => c.status === "TRIAL").length;

        // Busca logs não resolvidos
        const logsData = await fetchApi("/api/admin/logs?resolved=false");

        // Dispositivos pendentes
        const devicesData = await fetchApi("/api/admin/devices?status=PENDING");

        const pendingDevices = devicesData.ok ? (devicesData.devices?.length ?? 0) : 0;

        // Faturas pendentes
        let pendingInvoices = 0;
        let pendingInvoicesTotal = 0;
        for (const c of customers) {
          if (c.nextDue) {
            pendingInvoices++;
            pendingInvoicesTotal += Number(c.nextDue.amount ?? 0);
          }
        }

        const unreadChats = customers.reduce((acc: number, c: any) => acc + (c.unreadAdmin ?? 0), 0);

        setStats({
          totalCustomers: customers.length,
          activeCustomers,
          onlineNow,
          trialCustomers,
          pendingInvoices,
          pendingInvoicesTotal,
          unresolvedLogs: logsData.total ?? 0,
          unreadChats,
          pendingDevices,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = stats
    ? [
        { label: "Clientes ativos", value: stats.activeCustomers, sub: `${stats.trialCustomers} em trial`, icon: "🏢", href: "/dashboard/clientes" },
        { label: "Online agora", value: stats.onlineNow, sub: `de ${stats.totalCustomers} total`, icon: "🟢", href: "/dashboard/clientes" },
        { label: "Faturas pendentes", value: stats.pendingInvoices, sub: `R$ ${stats.pendingInvoicesTotal.toFixed(2)}`, icon: "💰", href: "/dashboard/financeiro" },
        { label: "Erros não resolvidos", value: stats.unresolvedLogs, sub: "clique para triagem", icon: "🐛", href: "/dashboard/logs" },
        { label: "Chats não lidos", value: stats.unreadChats, sub: "mensagens pendentes", icon: "💬", href: "/dashboard/chat" },
        { label: "Dispositivos pendentes", value: stats.pendingDevices, sub: "aguardando aprovação", icon: "📱", href: "/dashboard/dispositivos" },
      ]
    : [];

  return (
    <div>
      <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      {loading ? (
        <div style={{ color: "#64748b" }}>Carregando…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          {cards.map((card) => (
            <Link key={card.label} href={card.href} style={{ textDecoration: "none" }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9" }}>{card.value}</div>
                <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{card.label}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{card.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ background: "#1e293b", borderRadius: 10, padding: 20, border: "1px solid #334155" }}>
        <h2 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
          Ações rápidas
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/dashboard/clientes?new=1" style={actionBtnStyle}>+ Novo cliente</Link>
          <Link href="/dashboard/financeiro?new=1" style={actionBtnStyle}>+ Nova fatura</Link>
          <Link href="/dashboard/logs?resolved=false" style={{ ...actionBtnStyle, background: "#7f1d1d", color: "#fca5a5" }}>Ver erros</Link>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "20px 18px",
  cursor: "pointer",
  transition: "border-color .15s",
};

const actionBtnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 16px",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  transition: "background .15s",
};
