"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Device {
  id: string; customerId: string; deviceId: string; deviceName: string; deviceModel: string;
  platform: string; appVersion: string; status: string; lastActiveAt: string | null;
  createdAt: string; customer?: { name: string };
}
interface Customer { id: string; name: string }

const panelStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 };

export default function DispositivosPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCustomer, setFilterCustomer] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [dData, cData] = await Promise.all([
        api<{ ok: boolean; devices: Device[] }>("/api/admin/devices"),
        api<{ ok: boolean; customers: Customer[] }>("/api/admin/customers"),
      ]);
      if (dData.ok) setDevices(dData.devices || []);
      if (cData.ok) setCustomers(cData.customers || []);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(d: Device, newStatus: string) {
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/devices/${d.id}`, { method: "PATCH", body: { status: newStatus } });
      if (data.ok) { setMsg(`\u2705 Dispositivo ${newStatus === "APPROVED" ? "aprovado" : newStatus === "REVOKED" ? "revogado" : "atualizado"}`); load(); }
      else setMsg(`\u274c ${data.message}`);
    } catch { setMsg("\u274c Erro"); }
  }

  async function deleteDevice(id: string) {
    if (!confirm("Excluir este dispositivo?")) return;
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/devices/${id}`, { method: "DELETE" });
      if (data.ok) { setMsg("\u2705 Dispositivo exclu\u00eddo"); load(); } else setMsg(`\u274c ${data.message}`);
    } catch { setMsg("\u274c Erro"); }
  }

  const filtered = devices.filter((d) => {
    if (filterStatus !== "ALL" && d.status !== filterStatus) return false;
    if (filterCustomer !== "ALL" && d.customerId !== filterCustomer) return false;
    return true;
  });

  const counts = { total: devices.length, APPROVED: devices.filter((d) => d.status === "APPROVED").length, PENDING: devices.filter((d) => d.status === "PENDING").length, REVOKED: devices.filter((d) => d.status === "REVOKED").length };
  const msgBg = msg.startsWith("\u2705") ? "#065f4633" : "#7f1d1d";
  const msgColor = msg.startsWith("\u2705") ? "#34d399" : "#fca5a5";

  if (loading) return <div style={{ color: "#64748b" }}>Carregando dispositivos\u2026</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>\ud83d\udcf1 Dispositivos</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Gerencie os dispositivos autorizados dos clientes</p>
        </div>
      </div>

      {msg && <div style={{ background: msgBg, color: msgColor, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{msg}</div>}

      {/* Contadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Total", value: counts.total, color: "#60a5fa", bg: "#1d4ed822", icon: "\ud83d\udcf1" },
          { label: "Aprovados", value: counts.APPROVED, color: "#34d399", bg: "#065f4633", icon: "\u2705" },
          { label: "Pendentes", value: counts.PENDING, color: "#fbbf24", bg: "#78350f33", icon: "\u23f3" },
          { label: "Revogados", value: counts.REVOKED, color: "#f87171", bg: "#7f1d1d33", icon: "\ud83d\udeab" },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, border: "1px solid #334155", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 600, color: "#64748b" }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["ALL", "PENDING", "APPROVED", "REVOKED"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid", fontWeight: 600, cursor: "pointer", background: filterStatus === s ? "#3b82f6" : "none", color: filterStatus === s ? "#fff" : "#94a3b8", borderColor: filterStatus === s ? "#3b82f6" : "#334155" }}>
              {s === "ALL" ? "Todos" : s === "PENDING" ? "\u23f3 Pendentes" : s === "APPROVED" ? "\u2705 Aprovados" : "\ud83d\udeab Revogados"}
            </button>
          ))}
        </div>
        <select style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "6px 12px", color: "#94a3b8", fontSize: 12 }} value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
          <option value="ALL">Todos os clientes</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {["Dispositivo", "Cliente", "Plataforma", "Status", "\u00daltimo acesso", "A\u00e7\u00f5es"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#475569" }}>Nenhum dispositivo encontrado</td></tr>
            ) : filtered.map((d) => {
              const statusMap: Record<string, { bg: string; color: string; label: string }> = {
                PENDING: { bg: "#78350f33", color: "#fbbf24", label: "Pendente" },
                APPROVED: { bg: "#065f4633", color: "#34d399", label: "Aprovado" },
                REVOKED: { bg: "#7f1d1d33", color: "#f87171", label: "Revogado" },
              };
              const sc = statusMap[d.status] || { bg: "#1e293b", color: "#64748b", label: d.status };
              return (
                <>
                  <tr key={d.id} style={{ borderBottom: "1px solid #334155", cursor: "pointer" }} onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{d.deviceName || d.deviceModel || "Desconhecido"}</div>
                      <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{d.deviceId?.slice(0, 20)}\u2026</div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>{d.customer?.name || "\u2014"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 12 }}>{d.platform === "android" ? "\ud83e\udd16" : d.platform === "ios" ? "\ud83c\udf4e" : "\ud83d\udcbb"} {d.platform}</span>
                      {d.appVersion && <div style={{ fontSize: 10, color: "#475569" }}>v{d.appVersion}</div>}
                    </td>
                    <td style={{ padding: "10px 14px" }}><span style={{ background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{sc.label}</span></td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>{d.lastActiveAt ? new Date(d.lastActiveAt).toLocaleDateString("pt-BR") : "\u2014"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        {d.status === "PENDING" && <button onClick={() => updateStatus(d, "APPROVED")} style={{ background: "none", border: "1px solid #334155", color: "#34d399", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>\u2705 Aprovar</button>}
                        {d.status === "APPROVED" && <button onClick={() => updateStatus(d, "REVOKED")} style={{ background: "none", border: "1px solid #334155", color: "#fbbf24", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>\ud83d\udeab Revogar</button>}
                        {d.status === "REVOKED" && <button onClick={() => updateStatus(d, "APPROVED")} style={{ background: "none", border: "1px solid #334155", color: "#34d399", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>\u2705 Reativar</button>}
                        <button onClick={() => deleteDevice(d.id)} style={{ background: "none", border: "1px solid #334155", color: "#f87171", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>\ud83d\uddd1</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === d.id && (
                    <tr key={`${d.id}-detail`} style={{ background: "#0f172a" }}>
                      <td colSpan={6} style={{ padding: "14px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, fontSize: 12 }}>
                          <div><span style={{ color: "#64748b", fontWeight: 600 }}>Device ID:</span> <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{d.deviceId}</span></div>
                          <div><span style={{ color: "#64748b", fontWeight: 600 }}>Modelo:</span> <span style={{ color: "#94a3b8" }}>{d.deviceModel || "\u2014"}</span></div>
                          <div><span style={{ color: "#64748b", fontWeight: 600 }}>App Vers\u00e3o:</span> <span style={{ color: "#94a3b8" }}>{d.appVersion || "\u2014"}</span></div>
                          <div><span style={{ color: "#64748b", fontWeight: 600 }}>Cadastro:</span> <span style={{ color: "#94a3b8" }}>{new Date(d.createdAt).toLocaleString("pt-BR")}</span></div>
                          <div><span style={{ color: "#64748b", fontWeight: 600 }}>\u00daltimo acesso:</span> <span style={{ color: "#94a3b8" }}>{d.lastActiveAt ? new Date(d.lastActiveAt).toLocaleString("pt-BR") : "\u2014"}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
