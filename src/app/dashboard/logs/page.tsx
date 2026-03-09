"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";

interface LogEntry { id: string; level: string; message: string; url: string | null; resolved: boolean; createdAt: string; }

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ logs: LogEntry[]; total: number }>("/api/admin/logs");
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const levelColor: Record<string, string> = {
    ERROR: "bg-red-100 text-red-700",
    WARN: "bg-yellow-100 text-yellow-700",
    INFO: "bg-blue-100 text-blue-700",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Logs de Erro</h1>
      <p className="text-sm text-gray-500 mb-6">{total} erro(s) registrado(s)</p>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">✅</p>
          <p>Nenhum erro registrado. Tudo limpo!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="rounded-xl bg-white border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[l.level] || "bg-gray-100"}`}>{l.level}</span>
                <span className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString("pt-BR")}</span>
                {l.resolved && <span className="text-xs text-green-600">✓ Resolvido</span>}
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{l.message}</p>
              {l.url && <p className="text-xs text-gray-400 mt-1">{l.url}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
