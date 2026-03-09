"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { admin, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) router.replace("/login");
  }, [loading, admin, router]);

  if (loading) return <div style={{ background: "#0f172a", minHeight: "100vh", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>Carregando…</div>;
  if (!admin) return null;

  const nav = [
    { href: "/dashboard", icon: "📊", label: "Dashboard" },
    { href: "/dashboard/clientes", icon: "👥", label: "Clientes" },
    { href: "/dashboard/planos", icon: "📋", label: "Planos" },
    { href: "/dashboard/financeiro", icon: "💰", label: "Financeiro" },
    { href: "/dashboard/contas", icon: "🏦", label: "Dados Bancários" },
    { href: "/dashboard/dispositivos", icon: "📱", label: "Dispositivos" },
    { href: "/dashboard/logs", icon: "🐛", label: "Logs" },
    { href: "/dashboard/suporte", icon: "💬", label: "Chat" },
  ];

  return (
    <div className="gi-admin">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .gi-admin { display: flex; min-height: 100vh; }
        .gi-sidebar { width: 220px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; position: fixed; top: 0; bottom: 0; left: 0; z-index: 50; }
        .gi-sidebar-brand { padding: 20px 18px; border-bottom: 1px solid #334155; }
        .gi-sidebar-brand h1 { font-size: 16px; font-weight: 700; color: #f1f5f9; }
        .gi-sidebar-brand p { font-size: 11px; color: #64748b; margin-top: 2px; }
        .gi-nav { flex: 1; padding: 12px 0; overflow-y: auto; }
        .gi-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 18px; color: #94a3b8; text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.15s; border-right: 3px solid transparent; }
        .gi-nav-item:hover { background: #ffffff08; color: #e2e8f0; }
        .gi-nav-active { background: #1d4ed822; color: #60a5fa; border-right: 3px solid #3b82f6; }
        .gi-main { flex: 1; margin-left: 220px; padding: 24px 28px; background: #0f172a; min-height: 100vh; }
      `}</style>

      <aside className="gi-sidebar">
        <div className="gi-sidebar-brand">
          <h1>⛪ SG Admin</h1>
          <p>Painel de controle</p>
        </div>
        <nav className="gi-nav">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href + "/"));
            return (
              <Link key={n.href} href={n.href} className={`gi-nav-item ${active ? "gi-nav-active" : ""}`}>
                <span>{n.icon}</span> {n.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "14px 18px", borderTop: "1px solid #334155" }}>
          <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>{admin.name}</div>
          <div style={{ color: "#475569", fontSize: 11, marginBottom: 8 }}>{admin.role}</div>
          <button onClick={logout} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, cursor: "pointer", padding: 0 }}>
            Sair
          </button>
        </div>
      </aside>

      <main className="gi-main">{children}</main>
    </div>
  );
}
