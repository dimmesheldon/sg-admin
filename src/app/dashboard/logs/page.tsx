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
      if (data.ok) { setMsg(`\u2705 Log ${log.resolved ? "reaberto" : "resolvido"}`); load(); }
      else setMsg(`\u274c ${data.message}`);
    } catch { setMsg("\u274c Erro"); }
  }

  const totalPages = Math.ceil(total / perPage);
  const msgBg = msg.startsWith("\u2705") ? "#065f4633" : "#7f1d1d";
  const msgColor = msg.startsWith("\u2705") ? "#34d399" : "#fca5a5";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>\ud83d\udc1b Logs de Erros</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>{total} registro{total !== 1 && "s"} encontrado{total !== 1 && "s"}</p>
        </div>
      </div>

      {msg && <div style={{ background: msgBg, color: msgColor, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["ALL", "UNRESOLVED", "RESOLVED"].map((s) => (
          <button key={s} onClick={() => setFilterResolved(s)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid", fontWeight: 600, cursor: "pointer", background: filterResolved === s ? "#3b82f6" : "none", color: filterResolved === s ? "#fff" : "#94a3b8", borderColor: filterResolved === s ? "#3b82f6" : "#334155" }}>
            {s === "ALL" ? "Todos" : s === "UNRESOLVED" ? "\ud83d\udd34 N\u00e3o resolvidos" : "\u2705 Resolvidos"}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: "#64748b", padding: 30, textAlign: "center" }}>Carregando logs\u2026</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>Nenhum log encontrado</div>
          ) : logs.map((log) => {
            const levelColors: Record<string, { dot: string; bg: string; color: string }> = {
              ERROR: { dot: "#ef4444", bg: "#7f1d1d33", color: "#f87171" },
              WARN: { dot: "#f59e0b", bg: "#78350f33", color: "#fbbf24" },
              INFO: { dot: "#3b82f6", bg: "#1d4ed822", color: "#60a5fa" },
            };
            const lc = levelColors[log.level] || levelColors.INFO;
            return (
              <div key={log.id} style={{ background: "#1e293b", border: `1px solid ${log.resolved ? "#334155" : "#7f1d1d55"}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: lc.dot }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.message}</div>
                    <div style={{ fontSize: 10, color: "#475569", display: "flex", gap: 12, marginTop: 2 }}>
                      <span>{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                      <span>{log.source}</span>
                      {log.customer && <span>{log.customer.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ background: lc.bg, color: lc.color, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{log.level}</span>
                    {log.resolved && <span style={{ background: "#065f4633", color: "#34d399", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>RESOLVIDO</span>}
                    <button onClick={(e) => { e.stopPropagation(); toggleResolved(log); }} style={{ background: "none", border: "1px solid #334155", color: log.resolved ? "#fbbf24" : "#34d399", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                      {log.resolved ? "\ud83d\udd13 Reabrir" : "\u2705 Resolver"}
                    </button>
                    <span style={{ color: "#475569", fontSize: 12 }}>{expanded === log.id ? "\u25b2" : "\u25bc"}</span>
                  </div>
                </div>
                {expanded === log.id && log.stack && (
                  <div style={{ padding: "0 16px 16px" }}>
                    <pre style={{ background: "#0f172a", color: "#4ade80", fontSize: 11, padding: 12, borderRadius: 8, overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{log.stack}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", color: "#94a3b8", background: "none", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.3 : 1 }}>\u2190 Anterior</button>
          <span style={{ fontSize: 12, color: "#64748b" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", color: "#94a3b8", background: "none", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.3 : 1 }}>Pr\u00f3xima \u2192</button>
        </div>
      )}
    </div>
  );
}
