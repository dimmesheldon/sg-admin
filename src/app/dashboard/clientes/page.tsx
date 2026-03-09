"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";

interface Customer {
  id: string; name: string; slug: string; domain: string | null; plan: string;
  status: string; isOnline: boolean; isEnabled: boolean; disableReason: string | null;
  unreadAdmin: number; unresolvedLogs: number; lastPingAt: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: "#065f4633", color: "#34d399" },
  TRIAL: { bg: "#78350f33", color: "#fbbf24" },
  SUSPENDED: { bg: "#7f1d1d33", color: "#f87171" },
  CANCELLED: { bg: "#1e293b", color: "#64748b" },
};
const PLAN_LABELS: Record<string, string> = { FREE: "Free", BASIC: "Básico", PRO: "Pro", ENTERPRISE: "Enterprise" };

const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, outline: "none" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };

function ClientesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", domain: "", plan: "BASIC", status: "TRIAL" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [disableModal, setDisableModal] = useState<{ id: string; name: string } | null>(null);
  const [disableReason, setDisableReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      const data = await api<{ ok: boolean; customers: Customer[] }>(`/api/admin/customers?${params}`);
      if (data.ok) setCustomers(data.customers);
    } catch {}
    setLoading(false);
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const data = await api<{ ok: boolean; message?: string }>("/api/admin/customers", { method: "POST", body: form });
      if (data.ok) { setMsg("✅ Cliente criado com sucesso!"); setShowNew(false); setForm({ name: "", slug: "", domain: "", plan: "BASIC", status: "TRIAL" }); load(); }
      else setMsg(`❌ ${data.message}`);
    } catch (err: any) { setMsg(`❌ ${err.message}`); }
    setSaving(false);
  }

  async function toggleCustomer(c: Customer, enable: boolean) {
    if (!enable) { setDisableModal({ id: c.id, name: c.name }); setDisableReason(""); return; }
    await executeToggle(c.id, true, "");
  }

  async function executeToggle(id: string, enable: boolean, reason: string) {
    setToggleBusy(id);
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/customers/${id}/toggle`, { method: "POST", body: { enabled: enable, reason } });
      if (data.ok) setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, isEnabled: enable, disableReason: enable ? null : reason } : c));
      else alert(data.message ?? "Erro ao alternar");
    } catch { alert("Erro de rede"); }
    setToggleBusy(null); setDisableModal(null);
  }

  const msgStyle: React.CSSProperties = msg.startsWith("✅")
    ? { background: "#065f4633", color: "#34d399", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }
    : { background: "#7f1d1d", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>👥 Clientes</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Gerencie as igrejas cadastradas no sistema</p>
        </div>
        <button onClick={() => setShowNew((p) => !p)} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Novo Cliente</button>
      </div>

      {msg && <div style={msgStyle}>{msg}</div>}

      {showNew && (
        <form onSubmit={createCustomer} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h2 style={{ ...labelStyle, marginBottom: 14 }}>Novo cliente</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={labelStyle}>Nome *</label><input style={inputStyle} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Igreja XYZ" /></div>
            <div><label style={labelStyle}>Slug (único) *</label><input style={inputStyle} required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} placeholder="igreja-xyz" /></div>
            <div><label style={labelStyle}>Domínio</label><input style={inputStyle} value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="app.igrejaxyz.com" /></div>
            <div><label style={labelStyle}>Plano</label>
              <select style={inputStyle} value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}>
                <option value="FREE">Free</option><option value="BASIC">Básico</option><option value="PRO">Pro</option><option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="submit" disabled={saving} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Salvando…" : "Criar"}</button>
            <button type="button" onClick={() => setShowNew(false)} style={{ background: "none", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, slug ou domínio…" />
        <select style={{ ...inputStyle, width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option><option value="TRIAL">Trial</option><option value="ACTIVE">Ativo</option><option value="SUSPENDED">Suspenso</option><option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3].map((i) => <div key={i} style={{ height: 50, borderRadius: 8, background: "#1e293b" }} />)}</div>
      ) : (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Cliente", "Plano", "Status", "Acesso", "Online", "Erros", "Chats", "Ações"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 14px", color: "#475569" }}>Nenhum cliente encontrado</td></tr>
              ) : customers.map((c) => {
                const enabled = c.isEnabled !== false;
                const isBusy = toggleBusy === c.id;
                const sc = STATUS_COLORS[c.status] || STATUS_COLORS.CANCELLED;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #334155", opacity: enabled ? 1 : 0.5, transition: "all 0.15s" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{c.name}</span>
                        {!enabled && <span style={{ fontSize: 9, background: "#7f1d1d", color: "#fca5a5", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>DESLIGADO</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {c.slug}{c.domain ? ` · ${c.domain}` : ""}
                        {!enabled && c.disableReason && <span style={{ marginLeft: 4, color: "#f87171" }}>({c.disableReason})</span>}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{PLAN_LABELS[c.plan] ?? c.plan}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{c.status}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => toggleCustomer(c, !enabled)} disabled={isBusy} title={enabled ? "Desligar" : "Ligar"}
                        style={{ position: "relative", width: 40, height: 22, borderRadius: 11, border: "none", background: enabled ? "#22c55e" : "#475569", cursor: isBusy ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                        <span style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: 9, background: "#fff", boxShadow: "0 1px 3px #0003", transition: "all 0.2s", left: enabled ? 20 : 2 }} />
                      </button>
                    </td>
                    <td style={{ padding: "10px 14px" }}>{c.isOnline ? <span style={{ color: "#22c55e" }}>🟢 Sim</span> : <span style={{ color: "#475569" }}>⚫ Não</span>}</td>
                    <td style={{ padding: "10px 14px" }}>{c.unresolvedLogs > 0 ? <span style={{ color: "#f87171" }}>🐛 {c.unresolvedLogs}</span> : <span style={{ color: "#475569" }}>—</span>}</td>
                    <td style={{ padding: "10px 14px" }}>{c.unreadAdmin > 0 ? <span style={{ color: "#fbbf24" }}>💬 {c.unreadAdmin}</span> : <span style={{ color: "#475569" }}>—</span>}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => router.push(`/dashboard/clientes/${c.id}`)} style={{ background: "none", border: "1px solid #334155", color: "#60a5fa", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>👁 Ver</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal desligar */}
      {disableModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
          <div style={{ width: "100%", maxWidth: 420, margin: "0 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>🔌 Desligar acesso</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>Desligar o acesso de <strong style={{ color: "#f87171" }}>{disableModal.name}</strong>? O cliente não conseguirá acessar o sistema.</p>
            <label style={labelStyle}>Motivo (opcional)</label>
            <input style={{ ...inputStyle, marginBottom: 16 }} value={disableReason} onChange={(e) => setDisableReason(e.target.value)} placeholder="Ex: Inadimplência, manutenção…" autoFocus />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDisableModal(null)} style={{ background: "none", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => executeToggle(disableModal.id, false, disableReason)} disabled={toggleBusy === disableModal.id} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: toggleBusy === disableModal.id ? 0.5 : 1 }}>
                {toggleBusy === disableModal.id ? "Desligando…" : "🔌 Desligar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<div style={{ color: "#64748b" }}>Carregando…</div>}>
      <ClientesContent />
    </Suspense>
  );
}
