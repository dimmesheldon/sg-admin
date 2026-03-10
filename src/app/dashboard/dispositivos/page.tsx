"use client";
import { useEffect, useState, useCallback } from "react";

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

interface Device {
  id: string;
  customerId: string;
  customer: { id: string; name: string; slug: string };
  userId: string;
  deviceId: string;
  label: string | null;
  ipHint: string | null;
  status: string;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
}

interface CustomerMin { id: string; name: string; slug: string }

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REVOKED: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REVOKED: "Revogado",
};

const emptyForm = { customerId: "", userId: "", deviceId: "", label: "", ipHint: "", status: "APPROVED" };

export default function DispositivosPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // Modal novo dispositivo
  const [showNew, setShowNew] = useState(false);
  const [customers, setCustomers] = useState<CustomerMin[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Detalhes expandido
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCustomer) params.set("customerId", filterCustomer);
    const data = await fetchApi(`/api/admin/devices?${params}`);

    if (data.ok) setDevices(data.devices);
    setLoading(false);
  }, [filterStatus, filterCustomer]);

  useEffect(() => { load(); }, [load]);

  async function loadCustomers() {
    if (customers.length > 0) return;
    try {
      const data = await fetchApi("/api/admin/customers");

      if (data.ok) setCustomers(data.customers.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })));
    } catch { /* ignore */ }
  }

  function openNewForm() {
    setShowNew(true);
    setForm({ ...emptyForm });
    setFormError("");
    loadCustomers();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.customerId || !form.userId.trim() || !form.deviceId.trim()) {
      setFormError("Cliente, ID do usuário e ID do dispositivo são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const data = await fetchApi("/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (data.ok) {
        setMsg("✅ Dispositivo cadastrado com sucesso");
        setShowNew(false);
        setForm({ ...emptyForm });
        load();
      } else {
        setFormError(data.message || "Erro ao cadastrar");
      }
    } catch {
      setFormError("Erro de conexão");
    }
    setSaving(false);
  }

  async function handleAction(deviceId: string, action: "approve" | "revoke") {
    setActing(deviceId);
    setMsg("");
    try {
      const data = await fetchApi("/api/admin/devices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, action }),
      });
      if (data.ok) {
        setMsg(`✅ ${data.message}`);
        load();
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch {
      setMsg("❌ Erro ao processar ação");
    }
    setActing(null);
  }

  async function handleDelete(deviceId: string) {
    if (!confirm("Remover este dispositivo permanentemente?")) return;
    setActing(deviceId);
    try {
      const data = await fetchApi(`/api/admin/devices?id=${deviceId}`, { method: "DELETE" });

      if (data.ok) {
        setMsg("✅ Dispositivo removido");
        load();
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch {
      setMsg("❌ Erro ao remover");
    }
    setActing(null);
  }

  const pendingCount = devices.filter((d) => d.status === "PENDING").length;
  const approvedCount = devices.filter((d) => d.status === "APPROVED").length;
  const revokedCount = devices.filter((d) => d.status === "REVOKED").length;

  // Clientes únicos da lista atual
  const uniqueCustomers = Array.from(new Map(devices.map((d) => [d.customer.id, d.customer])).values());

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>
            📱 Dispositivos Autorizados
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            Gerencie os dispositivos que têm acesso ao módulo de Finanças dos clientes.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {pendingCount > 0 && (
            <span style={{ background: "#f59e0b22", color: "#f59e0b", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>
              ⏳ {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </span>
          )}
          <button onClick={openNewForm} style={btnPrimary}>
            + Novo dispositivo
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{
          marginBottom: 16, padding: "10px 16px",
          background: msg.startsWith("✅") ? "#16a34a22" : "#ef444422",
          color: msg.startsWith("✅") ? "#4ade80" : "#f87171",
          borderRadius: 8, fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{msg}</span>
          <button onClick={() => setMsg("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Counters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: devices.length, color: "#94a3b8" },
          { label: "Aprovados", value: approvedCount, color: "#22c55e" },
          { label: "Pendentes", value: pendingCount, color: "#f59e0b" },
          { label: "Revogados", value: revokedCount, color: "#ef4444" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 16px", minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select style={inputStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="APPROVED">Aprovado</option>
          <option value="REVOKED">Revogado</option>
        </select>
        {uniqueCustomers.length > 1 && (
          <select style={inputStyle} value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
            <option value="">Todos os clientes</option>
            {uniqueCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button onClick={() => { setFilterStatus(""); setFilterCustomer(""); }} style={btnSecondary}>Limpar filtros</button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ color: "#64748b" }}>Carregando…</div>
      ) : devices.length === 0 ? (
        <div style={{
          background: "#1e293b", borderRadius: 10, border: "1px solid #334155",
          padding: 40, textAlign: "center", color: "#64748b",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
            Nenhum dispositivo encontrado
          </div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>
            {filterStatus || filterCustomer
              ? "Tente ajustar os filtros ou cadastre um novo dispositivo."
              : "Cadastre o primeiro dispositivo clicando no botão acima."}
          </div>
          <button onClick={openNewForm} style={btnPrimary}>
            + Cadastrar dispositivo
          </button>
        </div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 10, border: "1px solid #334155", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0f172a" }}>
                {["Cliente", "Usuário", "Dispositivo", "IP", "Status", "Data", "Ações"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <>
                  <tr key={d.id} style={{ borderTop: "1px solid #334155", cursor: "pointer" }} onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                    <td style={tdStyle}>
                      <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{d.customer.name}</div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>{d.customer.slug}</div>
                    </td>
                    <td style={{ ...tdStyle, color: "#cbd5e1", fontSize: 12, fontFamily: "monospace" }}>
                      {d.userId.length > 20 ? `${d.userId.slice(0, 8)}…${d.userId.slice(-6)}` : d.userId}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: "#e2e8f0", fontSize: 12 }}>{d.label || "—"}</div>
                      <div style={{ color: "#475569", fontSize: 10, fontFamily: "monospace" }}>
                        {d.deviceId.length > 20 ? `${d.deviceId.slice(0, 12)}…` : d.deviceId}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>
                      {d.ipHint || "—"}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: (STATUS_COLORS[d.status] || "#6b7280") + "22",
                        color: STATUS_COLORS[d.status] || "#6b7280",
                        borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                      }}>
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#64748b", fontSize: 11 }}>
                      {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                      {d.approvedAt && (
                        <div style={{ color: "#475569", fontSize: 10 }}>
                          Aprovado: {new Date(d.approvedAt).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {d.status === "PENDING" && (
                          <button onClick={() => handleAction(d.id, "approve")} disabled={acting === d.id} style={btnApprove}>
                            ✓ Aprovar
                          </button>
                        )}
                        {d.status === "APPROVED" && (
                          <button onClick={() => handleAction(d.id, "revoke")} disabled={acting === d.id} style={btnRevoke}>
                            ✗ Revogar
                          </button>
                        )}
                        {d.status === "REVOKED" && (
                          <button onClick={() => handleAction(d.id, "approve")} disabled={acting === d.id} style={btnReactivate}>
                            ↻ Reativar
                          </button>
                        )}
                        <button onClick={() => handleDelete(d.id)} disabled={acting === d.id} style={btnDelete} title="Remover dispositivo">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === d.id && (
                    <tr key={`${d.id}-detail`} style={{ background: "#0f172a" }}>
                      <td colSpan={7} style={{ padding: "12px 14px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 12 }}>
                          <div>
                            <span style={detailLabel}>ID do dispositivo (completo)</span>
                            <div style={detailValue}>{d.deviceId}</div>
                          </div>
                          <div>
                            <span style={detailLabel}>ID do usuário (completo)</span>
                            <div style={detailValue}>{d.userId}</div>
                          </div>
                          <div>
                            <span style={detailLabel}>Aprovado por</span>
                            <div style={detailValue}>{d.approvedBy || "—"}</div>
                          </div>
                          <div>
                            <span style={detailLabel}>Cliente ID</span>
                            <div style={detailValue}>{d.customerId}</div>
                          </div>
                          <div>
                            <span style={detailLabel}>Label</span>
                            <div style={detailValue}>{d.label || "—"}</div>
                          </div>
                          <div>
                            <span style={detailLabel}>IP Hint</span>
                            <div style={detailValue}>{d.ipHint || "—"}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== MODAL NOVO DISPOSITIVO ===== */}
      {showNew && (
        <div style={overlayStyle} onClick={() => setShowNew(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ color: "#f1f5f9", fontSize: 17, fontWeight: 700 }}>Novo dispositivo</h2>
              <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {formError && (
              <div style={{ marginBottom: 14, padding: "8px 12px", background: "#ef444422", color: "#f87171", borderRadius: 6, fontSize: 12 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <label style={labelStyle}>Cliente *</label>
              <select style={inputStyleFull} required value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}>
                <option value="">Selecione o cliente…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>)}
              </select>

              <label style={{ ...labelStyle, marginTop: 14 }}>ID do usuário *</label>
              <input style={inputStyleFull} required placeholder="Ex: cllkd83hg0001vk... ou email" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
              <div style={helpText}>O ID do usuário no sistema da igreja (CUID ou identificador único).</div>

              <label style={{ ...labelStyle, marginTop: 14 }}>ID do dispositivo *</label>
              <input style={inputStyleFull} required placeholder="Ex: fingerprint hash do device" value={form.deviceId} onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))} />
              <div style={helpText}>Hash ou fingerprint único do dispositivo.</div>

              <label style={{ ...labelStyle, marginTop: 14 }}>Label (nome do dispositivo)</label>
              <input style={inputStyleFull} placeholder='Ex: "MacBook Pro — Chrome"' value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />

              <label style={{ ...labelStyle, marginTop: 14 }}>IP Hint</label>
              <input style={inputStyleFull} placeholder="Ex: 192.168.1" value={form.ipHint} onChange={(e) => setForm((f) => ({ ...f, ipHint: e.target.value }))} />
              <div style={helpText}>Primeiros 3 octetos do IP (opcional, para referência).</div>

              <label style={{ ...labelStyle, marginTop: 14 }}>Status inicial</label>
              <select style={inputStyleFull} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="APPROVED">Aprovado (pronto para uso)</option>
                <option value="PENDING">Pendente (aguardando aprovação)</option>
              </select>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, padding: "10px 20px" }}>
                  {saving ? "Cadastrando…" : "Cadastrar dispositivo"}
                </button>
                <button type="button" onClick={() => setShowNew(false)} style={{ ...btnSecondary, padding: "10px 16px" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Estilos ===== */
const inputStyle: React.CSSProperties = {
  background: "#0f172a", border: "1px solid #334155", borderRadius: 6,
  padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none", minWidth: 160,
};

const inputStyleFull: React.CSSProperties = {
  ...inputStyle, width: "100%", minWidth: "unset",
};

const labelStyle: React.CSSProperties = {
  display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600,
  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em",
};

const helpText: React.CSSProperties = {
  color: "#475569", fontSize: 11, marginTop: 3,
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 18px", background: "#1d4ed8", color: "#fff", border: "none",
  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 16px", background: "transparent", color: "#94a3b8",
  border: "1px solid #334155", borderRadius: 6, fontSize: 13, cursor: "pointer",
};

const btnApprove: React.CSSProperties = {
  padding: "4px 10px", background: "#16a34a", color: "#fff", border: "none",
  borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
};

const btnRevoke: React.CSSProperties = {
  padding: "4px 10px", background: "#dc2626", color: "#fff", border: "none",
  borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
};

const btnReactivate: React.CSSProperties = {
  padding: "4px 10px", background: "transparent", color: "#22c55e",
  border: "1px solid #166534", borderRadius: 5, fontSize: 11, cursor: "pointer",
};

const btnDelete: React.CSSProperties = {
  padding: "4px 10px", background: "transparent", color: "#64748b",
  border: "1px solid #334155", borderRadius: 5, fontSize: 11, cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px", color: "#94a3b8", fontWeight: 600, textAlign: "left",
  fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = { padding: "10px 14px" };

const detailLabel: React.CSSProperties = {
  display: "block", color: "#64748b", fontSize: 10, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2,
};

const detailValue: React.CSSProperties = {
  color: "#cbd5e1", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  background: "#1e293b", border: "1px solid #334155", borderRadius: 14,
  padding: 28, width: 440, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflowY: "auto",
};
