"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

interface LogEntry {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  url: string | null;
  resolved: boolean;
  createdAt: string;
  customer: { id: string; name: string; slug: string };
}

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "#ef4444",
  WARN: "#f59e0b",
  INFO: "#3b82f6",
  DEBUG: "#6b7280",
};

function LogsContent() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resolvedFilter, setResolvedFilter] = useState(searchParams.get("resolved") ?? "false");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (resolvedFilter) params.set("resolved", resolvedFilter);
    params.set("page", String(page));
    try {
      const data = await fetchApi(`/api/admin/logs?${params}`);

      if (data.ok) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [resolvedFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleResolved(logId: string, resolved: boolean) {
    const data = await fetchApi(`/api/admin/logs/${logId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    });
    if (data.ok) {
      setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, resolved } : l));
    }
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>
          Logs de Erros
          {total > 0 && <span style={{ color: "#64748b", fontSize: 14, fontWeight: 400, marginLeft: 8 }}>({total})</span>}
        </h1>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Não resolvidos", value: "false" },
          { label: "Resolvidos", value: "true" },
          { label: "Todos", value: "" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setResolvedFilter(f.value); setPage(1); }}
            style={{
              padding: "6px 14px",
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #334155",
              cursor: "pointer",
              background: resolvedFilter === f.value ? "#334155" : "transparent",
              color: resolvedFilter === f.value ? "#f1f5f9" : "#94a3b8",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "#64748b" }}>Carregando…</div>
      ) : logs.length === 0 ? (
        <div style={{ background: "#1e293b", borderRadius: 10, border: "1px solid #334155", padding: 40, textAlign: "center", color: "#64748b" }}>
          🎉 Nenhum log {resolvedFilter === "false" ? "pendente" : "encontrado"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.map((log) => (
            <div key={log.id} style={{ background: "#1e293b", border: `1px solid ${log.resolved ? "#334155" : "#7f1d1d44"}`, borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{
                  background: (LEVEL_COLORS[log.level] ?? "#6b7280") + "22",
                  color: LEVEL_COLORS[log.level] ?? "#94a3b8",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  {log.level}
                </span>
                <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>{log.customer.name}</span>
                <span style={{ color: "#475569", fontSize: 11 }}>{log.customer.slug}</span>
                <span style={{ color: "#475569", fontSize: 11, marginLeft: "auto" }}>
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>

              <div style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 4, lineHeight: 1.5 }}>
                {log.message}
              </div>

              {log.url && (
                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>URL: {log.url}</div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                {log.stack && (
                  <button
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    style={{ padding: "3px 10px", background: "transparent", color: "#60a5fa", border: "1px solid #1e40af", borderRadius: 5, fontSize: 11, cursor: "pointer" }}
                  >
                    {expandedId === log.id ? "Esconder stack" : "Ver stack"}
                  </button>
                )}
                <button
                  onClick={() => toggleResolved(log.id, !log.resolved)}
                  style={{
                    padding: "3px 10px",
                    background: log.resolved ? "#7f1d1d" : "#064e3b",
                    color: log.resolved ? "#fca5a5" : "#4ade80",
                    border: "none",
                    borderRadius: 5,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {log.resolved ? "↩ Reabrir" : "✓ Resolver"}
                </button>
              </div>

              {expandedId === log.id && log.stack && (
                <pre style={{ marginTop: 8, background: "#0f172a", borderRadius: 6, padding: 12, fontSize: 11, color: "#94a3b8", overflow: "auto", maxHeight: 200, whiteSpace: "pre-wrap" }}>
                  {log.stack}
                </pre>
              )}
            </div>
          ))}

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtnStyle}>← Anterior</button>
              <span style={{ color: "#64748b", fontSize: 13, padding: "6px 0" }}>Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pageBtnStyle}>Próxima →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div style={{ color: "#64748b" }}>Carregando…</div>}>
      <LogsContent />
    </Suspense>
  );
}

const pageBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  background: "transparent",
  color: "#94a3b8",
  border: "1px solid #334155",
  borderRadius: 5,
  fontSize: 12,
  cursor: "pointer",
};
