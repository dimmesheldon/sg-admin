"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Log {
  id: string; level: string; message: string; stack: string | null; source: string;
  customerId: string | null; resolved: boolean; createdAt: string; customer?: { name: string };
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filterResolved, setFilterResolved] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const perPage = 20;

  async function load(p = page) {
    setLoading(true);
    try {
      const resolved = filterResolved === "ALL" ? "" : `&resolved=${filterResolved === "RESOLVED"}`;
      const data = await api<{ ok: boolean; logs: Log[]; total: number }>(`/api/admin/logs?page=${p}&limit=${perPage}${resolved}`);
      if (data.ok) { setLogs(data.logs || []); setTotal(data.total || 0); }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { setPage(1); load(1); }, [filterResolved]);
  useEffect(() => { load(); }, [page]);

  async function toggleResolved(log: Log) {
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/logs/${log.id}`, { method: "PATCH", body: { resolved: !log.resolved } });
      if (data.ok) { setMsg(`✅ Log ${log.resolved ? "reaberto" : "resolvido"}`); load(); }
      else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro"); }
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 Logs de Erros</h1>
          <p className="text-sm text-gray-500">{total} registro{total !== 1 && "s"} encontrado{total !== 1 && "s"}</p>
        </div>
      </div>

      {msg && <div className={`mb-4 rounded-lg p-3 text-sm border ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{msg}</div>}

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {["ALL", "UNRESOLVED", "RESOLVED"].map((s) => (
          <button key={s} onClick={() => setFilterResolved(s)} className={`text-xs px-3 py-1.5 rounded-lg border transition font-semibold ${filterResolved === s ? "bg-sky-500 text-white border-sky-500" : "text-gray-500 border-gray-300 hover:bg-gray-50"}`}>
            {s === "ALL" ? "Todos" : s === "UNRESOLVED" ? "🔴 Não resolvidos" : "✅ Resolvidos"}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400 py-8 text-center">Carregando logs…</div> : (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Nenhum log encontrado</div>
          ) : logs.map((log) => (
            <div key={log.id} className={`bg-white border rounded-xl overflow-hidden ${log.resolved ? "border-gray-200" : "border-red-200"}`}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.level === "ERROR" ? "bg-red-500" : log.level === "WARN" ? "bg-amber-500" : "bg-sky-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-700 truncate">{log.message}</div>
                  <div className="text-[10px] text-gray-400 flex gap-3 mt-0.5">
                    <span>{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                    <span>{log.source}</span>
                    {log.customer && <span>{log.customer.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.level === "ERROR" ? "bg-red-100 text-red-700" : log.level === "WARN" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>{log.level}</span>
                  {log.resolved && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">RESOLVIDO</span>}
                  <button onClick={(e) => { e.stopPropagation(); toggleResolved(log); }} className={`text-[10px] border rounded px-2 py-0.5 font-semibold ${log.resolved ? "text-amber-600 border-amber-300 hover:bg-amber-50" : "text-green-600 border-green-300 hover:bg-green-50"}`}>
                    {log.resolved ? "🔓 Reabrir" : "✅ Resolver"}
                  </button>
                  <span className="text-gray-300 text-xs">{expanded === log.id ? "▲" : "▼"}</span>
                </div>
              </div>
              {expanded === log.id && log.stack && (
                <div className="px-4 pb-4">
                  <pre className="bg-gray-900 text-green-400 text-[11px] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">{log.stack}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-30">← Anterior</button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-30">Próxima →</button>
        </div>
      )}
    </div>
  );
}
