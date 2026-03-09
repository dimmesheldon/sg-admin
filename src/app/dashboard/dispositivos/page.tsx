"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Device {
  id: string; customerId: string; deviceId: string; deviceName: string; deviceModel: string;
  platform: string; appVersion: string; status: string; lastActiveAt: string | null;
  createdAt: string; customer?: { name: string };
}
interface Customer { id: string; name: string }

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
      if (data.ok) { setMsg(`✅ Dispositivo ${newStatus === "APPROVED" ? "aprovado" : newStatus === "REVOKED" ? "revogado" : "atualizado"}`); load(); }
      else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro"); }
  }

  async function deleteDevice(id: string) {
    if (!confirm("Excluir este dispositivo?")) return;
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/devices/${id}`, { method: "DELETE" });
      if (data.ok) { setMsg("✅ Dispositivo excluído"); load(); } else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro"); }
  }

  const filtered = devices.filter((d) => {
    if (filterStatus !== "ALL" && d.status !== filterStatus) return false;
    if (filterCustomer !== "ALL" && d.customerId !== filterCustomer) return false;
    return true;
  });

  const counts = { total: devices.length, APPROVED: devices.filter((d) => d.status === "APPROVED").length, PENDING: devices.filter((d) => d.status === "PENDING").length, REVOKED: devices.filter((d) => d.status === "REVOKED").length };

  if (loading) return <div className="text-gray-400">Carregando dispositivos…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📱 Dispositivos</h1>
          <p className="text-sm text-gray-500">Gerencie os dispositivos autorizados dos clientes</p>
        </div>
      </div>

      {msg && <div className={`mb-4 rounded-lg p-3 text-sm border ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{msg}</div>}

      {/* Contadores */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: counts.total, color: "text-sky-600", bg: "bg-sky-50 border-sky-200", icon: "📱" },
          { label: "Aprovados", value: counts.APPROVED, color: "text-green-600", bg: "bg-green-50 border-green-200", icon: "✅" },
          { label: "Pendentes", value: counts.PENDING, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: "⏳" },
          { label: "Revogados", value: counts.REVOKED, color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "🚫" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-4 border ${c.bg}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{c.icon}</span>
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-400">{c.label}</div>
                <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-2">
          {["ALL", "PENDING", "APPROVED", "REVOKED"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`text-xs px-3 py-1.5 rounded-lg border transition font-semibold ${filterStatus === s ? "bg-sky-500 text-white border-sky-500" : "text-gray-500 border-gray-300 hover:bg-gray-50"}`}>
              {s === "ALL" ? "Todos" : s === "PENDING" ? "⏳ Pendentes" : s === "APPROVED" ? "✅ Aprovados" : "🚫 Revogados"}
            </button>
          ))}
        </div>
        <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
          <option value="ALL">Todos os clientes</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Dispositivo</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Plataforma</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Último acesso</th>
              <th className="text-left px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum dispositivo encontrado</td></tr>
            ) : filtered.map((d) => (
              <>
                <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-700">{d.deviceName || d.deviceModel || "Desconhecido"}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{d.deviceId?.slice(0, 20)}…</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{d.customer?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{d.platform === "android" ? "🤖" : d.platform === "ios" ? "🍎" : "💻"} {d.platform}</span>
                    {d.appVersion && <div className="text-[10px] text-gray-400">v{d.appVersion}</div>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.lastActiveAt ? new Date(d.lastActiveAt).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {d.status === "PENDING" && <button onClick={() => updateStatus(d, "APPROVED")} className="text-[10px] text-green-600 border border-green-300 rounded px-2 py-0.5 hover:bg-green-50 font-semibold">✅ Aprovar</button>}
                      {d.status === "APPROVED" && <button onClick={() => updateStatus(d, "REVOKED")} className="text-[10px] text-amber-600 border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-50 font-semibold">🚫 Revogar</button>}
                      {d.status === "REVOKED" && <button onClick={() => updateStatus(d, "APPROVED")} className="text-[10px] text-green-600 border border-green-300 rounded px-2 py-0.5 hover:bg-green-50 font-semibold">✅ Reativar</button>}
                      <button onClick={() => deleteDevice(d.id)} className="text-[10px] text-red-500 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 font-semibold">🗑</button>
                    </div>
                  </td>
                </tr>
                {expanded === d.id && (
                  <tr key={`${d.id}-detail`} className="bg-gray-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div><span className="text-gray-400 font-semibold">Device ID:</span> <span className="font-mono text-gray-600">{d.deviceId}</span></div>
                        <div><span className="text-gray-400 font-semibold">Modelo:</span> <span className="text-gray-600">{d.deviceModel || "—"}</span></div>
                        <div><span className="text-gray-400 font-semibold">App Versão:</span> <span className="text-gray-600">{d.appVersion || "—"}</span></div>
                        <div><span className="text-gray-400 font-semibold">Cadastro:</span> <span className="text-gray-600">{new Date(d.createdAt).toLocaleString("pt-BR")}</span></div>
                        <div><span className="text-gray-400 font-semibold">Último acesso:</span> <span className="text-gray-600">{d.lastActiveAt ? new Date(d.lastActiveAt).toLocaleString("pt-BR") : "—"}</span></div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { PENDING: "bg-amber-100 text-amber-700", APPROVED: "bg-green-100 text-green-700", REVOKED: "bg-red-100 text-red-700" };
  const labels: Record<string, string> = { PENDING: "Pendente", APPROVED: "Aprovado", REVOKED: "Revogado" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${map[status] || "bg-gray-100 text-gray-500"}`}>{labels[status] || status}</span>;
}
