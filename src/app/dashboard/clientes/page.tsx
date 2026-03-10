"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface Customer {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: string;
  status: string;
  isOnline: boolean;
  isEnabled: boolean;
  disableReason: string | null;
  unreadAdmin: number;
  unresolvedLogs: number;
  lastPingAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  TRIAL: "#f59e0b",
  SUSPENDED: "#ef4444",
  CANCELLED: "#6b7280",
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  BASIC: "Básico",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

function ClientesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [showNew, setShowNew] = useState(searchParams.get("new") === "1");
  const [form, setForm] = useState({ name: "", slug: "", domain: "", plan: "BASIC", status: "TRIAL" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [disableModal, setDisableModal] = useState<{ id: string; name: string } | null>(null);
  const [disableReason, setDisableReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const data = await fetchApi(`/api/admin/customers?${params}`);

    if (data.ok) setCustomers(data.customers);
    setLoading(false);
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const data = await fetchApi("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (data.ok) {
      setMsg("✅ Cliente criado!");
      setShowNew(false);
      setForm({ name: "", slug: "", domain: "", plan: "BASIC", status: "TRIAL" });
      load();
    } else {
      setMsg(`❌ ${data.message}`);
    }
    setSaving(false);
  }

  async function toggleCustomer(c: Customer, enable: boolean) {
    if (!enable) {
      // Desligando: abre modal para motivo
      setDisableModal({ id: c.id, name: c.name });
      setDisableReason("");
      return;
    }
    // Ligando: executa direto
    await executeToggle(c.id, true, "");
  }

  async function executeToggle(id: string, enable: boolean, reason: string) {
    setToggleBusy(id);
    try {
      const data = await fetchApi(`/api/admin/customers/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enable, reason }),
      });
      if (data.ok) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, isEnabled: enable, disableReason: enable ? null : reason } : c
          )
        );
      } else {
        alert(data.message ?? "Erro ao alternar");
      }
    } catch {
      alert("Erro de rede");
    }
    setToggleBusy(null);
    setDisableModal(null);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>Clientes</h1>
        <button
          onClick={() => setShowNew((p) => !p)}
          style={{ padding: "8px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Novo cliente
        </button>
      </div>

      {showNew && (
        <form onSubmit={createCustomer} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h2 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", marginBottom: 16 }}>Novo cliente</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input style={inputStyle} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Igreja XYZ" />
            </div>
            <div>
              <label style={labelStyle}>Slug (único) *</label>
              <input style={inputStyle} required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} placeholder="igreja-xyz" />
            </div>
            <div>
              <label style={labelStyle}>Domínio</label>
              <input style={inputStyle} value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="app.igrejaxyz.com" />
            </div>
            <div>
              <label style={labelStyle}>Plano</label>
              <select style={inputStyle} value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}>
                <option value="FREE">Free</option>
                <option value="BASIC">Básico</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>
          {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{msg}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Salvando…" : "Criar"}
            </button>
            <button type="button" onClick={() => setShowNew(false)} style={{ padding: "8px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, slug ou domínio…"
        />
        <select style={{ ...inputStyle, width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Ativo</option>
          <option value="SUSPENDED">Suspenso</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: "#64748b" }}>Carregando…</div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 10, border: "1px solid #334155", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0f172a" }}>
                {["Cliente", "Plano", "Status", "Acesso", "Online", "Erros", "Chats", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 20, color: "#64748b", textAlign: "center" }}>Nenhum cliente encontrado</td></tr>
              ) : (
                customers.map((c) => {
                  const enabled = c.isEnabled !== false;
                  const isBusy = toggleBusy === c.id;
                  return (
                  <tr key={c.id} style={{ borderTop: "1px solid #334155", opacity: enabled ? 1 : 0.6 }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{c.name}</div>
                        {!enabled && <span style={{ fontSize: 10, background: "#7f1d1d", color: "#fca5a5", borderRadius: 3, padding: "1px 5px", fontWeight: 700 }}>DESLIGADO</span>}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        {c.slug}{c.domain ? ` · ${c.domain}` : ""}
                        {!enabled && c.disableReason && <span style={{ marginLeft: 6, color: "#f87171", fontSize: 10 }}>({c.disableReason})</span>}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{PLAN_LABELS[c.plan] ?? c.plan}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: STATUS_COLORS[c.status] + "22", color: STATUS_COLORS[c.status], borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        onClick={() => toggleCustomer(c, !enabled)}
                        disabled={isBusy}
                        title={enabled ? "Clique para desligar acesso" : "Clique para ligar acesso"}
                        style={{
                          position: "relative",
                          width: 44,
                          height: 24,
                          borderRadius: 12,
                          border: "none",
                          cursor: isBusy ? "not-allowed" : "pointer",
                          background: enabled ? "#22c55e" : "#475569",
                          transition: "background .2s",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 3,
                            left: enabled ? 23 : 3,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#fff",
                            transition: "left .2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                          }}
                        />
                      </button>
                    </td>
                    <td style={{ padding: "10px 14px", color: c.isOnline ? "#4ade80" : "#475569" }}>
                      {c.isOnline ? "🟢 Sim" : "⚫ Não"}
                    </td>
                    <td style={{ padding: "10px 14px", color: c.unresolvedLogs > 0 ? "#f87171" : "#64748b" }}>
                      {c.unresolvedLogs > 0 ? `🐛 ${c.unresolvedLogs}` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: c.unreadAdmin > 0 ? "#fbbf24" : "#64748b" }}>
                      {c.unreadAdmin > 0 ? `💬 ${c.unreadAdmin}` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                        style={{ padding: "4px 12px", background: "transparent", color: "#60a5fa", border: "1px solid #1e40af", borderRadius: 5, fontSize: 12, cursor: "pointer" }}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para motivo de desligamento */}
      {disableModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw" }}>
            <h3 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔌 Desligar acesso</h3>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>
              Desligar o acesso de <strong style={{ color: "#f87171" }}>{disableModal.name}</strong>?
              O cliente não conseguirá acessar o sistema até que seja ligado novamente.
            </p>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Motivo (opcional)</label>
            <input
              style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none", marginBottom: 16 }}
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              placeholder="Ex: Inadimplência, manutenção programada…"
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDisableModal(null)}
                style={{ padding: "8px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => executeToggle(disableModal.id, false, disableReason)}
                disabled={toggleBusy === disableModal.id}
                style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
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

const labelStyle: React.CSSProperties = {
  display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600,
  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em",
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#0f172a", border: "1px solid #334155",
  borderRadius: 6, padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none",
};
