"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

const menuItems = [
  { href: "/dashboard", label: "Visão Geral", icon: "📊" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "🏢" },
  { href: "/dashboard/planos", label: "Planos", icon: "📋" },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: "💰" },
  { href: "/dashboard/contas", label: "Contas Bancárias", icon: "🏦" },
  { href: "/dashboard/logs", label: "Logs de Erro", icon: "🐛" },
  { href: "/dashboard/dispositivos", label: "Dispositivos", icon: "📱" },
  { href: "/dashboard/suporte", label: "Suporte / Chat", icon: "💬" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { admin, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !admin) router.replace("/login");
  }, [admin, loading, router]);

  if (loading || !admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <Image src="/sysge-icon.svg" alt="SYSGE" width={36} height={36} />
          <div>
            <h1 className="text-base font-bold text-gray-800">SG Admin</h1>
            <p className="text-[11px] text-gray-400">SYSGE</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
                  ${active ? "bg-sky-50 text-sky-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{admin.name}</p>
              <p className="text-xs text-gray-400 truncate">{admin.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap ml-2"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar mobile */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Image src="/sysge-icon.svg" alt="" width={28} height={28} />
          <span className="text-sm font-semibold text-gray-700">SG Admin</span>
        </div>

        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
