"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { admin, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) router.replace("/login");
  }, [loading, admin, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f172a" }}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Carregando…</div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <>
      <div className="gi-admin">
        <aside className="gi-sidebar">
          <div className="gi-sidebar-brand">
            <span className="gi-brand-icon">⛪</span>
            <span className="gi-brand-name">Sysge Admin</span>
          </div>

          <nav className="gi-nav">
            {[
              { href: "/dashboard", label: "📊 Dashboard", exact: true },
              { href: "/dashboard/clientes", label: "🏢 Clientes" },
              { href: "/dashboard/planos", label: "📋 Planos" },
              { href: "/dashboard/financeiro", label: "💰 Financeiro" },
              { href: "/dashboard/dados-bancarios", label: "🏦 Dados Bancários" },
              { href: "/dashboard/dispositivos", label: "📱 Dispositivos" },
              { href: "/dashboard/logs", label: "🐛 Logs" },
              { href: "/dashboard/chat", label: "💬 Chat" },
            ].map(({ href, label, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <a key={href} href={href} className={`gi-nav-item${isActive ? " gi-nav-active" : ""}`}>
                  {label}
                </a>
              );
            })}
          </nav>

          <div className="gi-sidebar-footer">
            <div className="gi-admin-info">
              <div className="gi-admin-name">{admin.name}</div>
              <div className="gi-admin-role">{admin.role}</div>
            </div>
            <button className="gi-logout-btn" onClick={logout}>
              Sair
            </button>
          </div>
        </aside>

        <main className="gi-main">{children}</main>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .gi-admin { display: flex; height: 100vh; background: #0f172a; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }
        .gi-sidebar { width: 220px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; flex-shrink: 0; }
        .gi-sidebar-brand { padding: 20px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #334155; }
        .gi-brand-icon { font-size: 22px; }
        .gi-brand-name { font-size: 16px; font-weight: 700; color: #f1f5f9; }
        .gi-nav { flex: 1; padding: 12px 0; }
        .gi-nav-item { display: flex; align-items: center; gap: 8px; padding: 9px 16px; font-size: 13px; color: #94a3b8; text-decoration: none; transition: background .15s, color .15s; }
        .gi-nav-item:hover { background: #334155; color: #f1f5f9; }
        .gi-nav-active { background: #1d4ed822; color: #60a5fa !important; border-right: 3px solid #3b82f6; }
        .gi-sidebar-footer { padding: 12px 16px; border-top: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .gi-admin-name { font-size: 12px; font-weight: 600; color: #f1f5f9; }
        .gi-admin-role { font-size: 11px; color: #64748b; }
        .gi-logout-btn { font-size: 12px; color: #ef4444; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; }
        .gi-logout-btn:hover { background: #450a0a; }
        .gi-main { flex: 1; overflow-y: auto; padding: 28px; }
      `}</style>
    </>
  );
}
