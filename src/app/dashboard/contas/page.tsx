"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";

interface Account { id: string; bankName: string; accountType: string; pixKey: string | null; isActive: boolean; }

export default function ContasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ accounts: Account[] }>("/api/admin/bank-accounts");
      setAccounts(data.accounts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Contas Bancárias</h1>
      <p className="text-sm text-gray-500 mb-6">Contas para recebimento de assinaturas</p>

      {loading ? (
        <div className="h-20 rounded-lg bg-gray-100 animate-pulse" />
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🏦</p>
          <p>Nenhuma conta cadastrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-xl bg-white border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{a.bankName}</p>
                <p className="text-xs text-gray-400">{a.accountType} · PIX: {a.pixKey || "—"}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                {a.isActive ? "Ativa" : "Inativa"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
