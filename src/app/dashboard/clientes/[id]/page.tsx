"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  description: string | null;
  pixCode: string | null;
  pixQrBase64: string | null;
  paidAt: string | null;
  coverageMonths?: number;
  expiresAt?: string | null;
  gracePeriodEnd?: string | null;
}

interface Customer {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  hostProvider: string | null;
  plan: string;
  status: string;
  isEnabled: boolean;
  disabledAt: string | null;
  disableReason: string | null;
  notes: string | null;
  licenseKey: string;
  lastPingAt: string | null;
  isOnline: boolean;
  invoices: Invoice[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e", TRIAL: "#f59e0b", SUSPENDED: "#ef4444", CANCELLED: "#6b7280",
};
const INV_STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b", PAID: "#22c55e", OVERDUE: "#ef4444", CANCELLED: "#6b7280",
};

export default function ClienteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newInv, setNewInv] = useState(false);
  const [invForm, setInvForm] = useState({ amount: "", dueDate: "", description: "", months: "1" });
  const [copiedPix, setCopiedPix] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [rotateBusy, setRotateBusy] = useState(false);
  const [rotateMsg, setRotateMsg] = useState("");
  const [toggleBusy, setToggleBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchApi(`/api/admin/customers/${id}`)
      .then((data) => {
        if (data.ok) {
          setCustomer(data.customer);
          setForm({
            name: data.customer.name,
            domain: data.customer.domain ?? "",
            hostProvider: data.customer.hostProvider ?? "",
            plan: data.customer.plan,
            status: data.customer.status,
            notes: data.customer.notes ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const data = await fetchApi(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (data.ok) {
      setMsg("✅ Salvo!");
      setCustomer((c) => c ? { ...c, ...data.customer } : c);
      setEditing(false);
    } else {
      setMsg(`❌ ${data.message}`);
    }
    setSaving(false);
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const data = await fetchApi(`/api/admin/customers/${id}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...invForm, amount: Number(invForm.amount), months: Number(invForm.months) || 1 }),
    });
    if (data.ok) {
      setCustomer((c) => c ? { ...c, invoices: [data.invoice, ...(c.invoices ?? [])] } : c);
      setNewInv(false);
      setInvForm({ amount: "", dueDate: "", description: "", months: "1" });
    } else {
      alert(data.message);
    }
    setSaving(false);
  }

  async function copyPix(code: string, invId: string) {
    await navigator.clipboard.writeText(code);
    setCopiedPix(invId);
    setTimeout(() => setCopiedPix(null), 2000);
  }

  async function handleInvoiceAction(invoiceId: string, action: "pay" | "cancel" | "overdue") {
    if (action === "pay" && !confirm("Confirma dar baixa nesta fatura? O cliente será reativado se suspenso.")) return;
    if (action === "cancel" && !confirm("Confirma cancelar esta fatura?")) return;
    setActionBusy(invoiceId);
    try {
      const data = await fetchApi(`/api/admin/customers/${id}/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (data.ok) {
        // Reload customer data
        const d2 = await fetchApi(`/api/admin/customers/${id}`);

        if (d2.ok) setCustomer(d2.customer);
      } else {
        alert(data.message ?? "Erro ao executar ação");
      }
    } catch { alert("Erro de rede"); }
    setActionBusy(null);
  }

  async function rotateLicenseKey() {
    if (!confirm("Gerar nova chave de licença? A chave atual será invalidada e o cliente precisará atualizar.")) return;
    setRotateBusy(true);
    setRotateMsg("");
    try {
      const data = await fetchApi(`/api/admin/customers/${id}/rotate-license`, { method: "POST" });

      if (data.ok) {
        setRotateMsg(`✅ Nova chave: ${data.newKey}`);
        setCustomer((c) => c ? { ...c, licenseKey: data.newKey } : c);
      } else {
        setRotateMsg(`❌ ${data.message}`);
      }
    } catch { setRotateMsg("❌ Erro de rede"); }
    setRotateBusy(false);
  }

  async function handleToggle() {
    if (!customer) return;
    const enabling = customer.isEnabled === false;
    if (!enabling && !confirm(`Desligar o acesso de "${customer.name}"?`)) return;
    setToggleBusy(true);
    try {
      const data = await fetchApi(`/api/admin/customers/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enabling, reason: enabling ? "" : "Desligado manualmente" }),
      });
      if (data.ok) {
        setCustomer((c) => c ? { ...c, isEnabled: data.customer.isEnabled, disabledAt: data.customer.disabledAt, disableReason: data.customer.disableReason } : c);
      } else {
        alert(data.message ?? "Erro");
      }
    } catch { alert("Erro de rede"); }
    setToggleBusy(false);
  }

  if (loading) return <div style={{ color: "#64748b" }}>Carregando…</div>;
  if (!customer) return <div style={{ color: "#ef4444" }}>Cliente não encontrado.</div>;

  return (
    <div>
      <button onClick={() => router.push("/dashboard/clientes")} style={{ color: "#60a5fa", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 16 }}>
        ← Voltar
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>{customer.name}</h1>
        <span style={{ background: STATUS_COLORS[customer.status] + "22", color: STATUS_COLORS[customer.status], borderRadius: 4, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
          {customer.status}
        </span>
        <span style={{ color: customer.isOnline ? "#4ade80" : "#475569", fontSize: 13 }}>
          {customer.isOnline ? "🟢 Online" : "⚫ Offline"}
        </span>
        {/* Toggle liga/desliga */}
        <button
          onClick={handleToggle}
          disabled={toggleBusy}
          title={customer.isEnabled !== false ? "Desligar acesso do cliente" : "Ligar acesso do cliente"}
          style={{
            position: "relative", width: 44, height: 24, borderRadius: 12, border: "none",
            cursor: toggleBusy ? "not-allowed" : "pointer",
            background: customer.isEnabled !== false ? "#22c55e" : "#475569",
            transition: "background .2s", marginLeft: 4,
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: customer.isEnabled !== false ? 23 : 3,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
          }} />
        </button>
        <span style={{ fontSize: 11, color: customer.isEnabled !== false ? "#4ade80" : "#f87171", fontWeight: 600 }}>
          {customer.isEnabled !== false ? "Ligado" : "Desligado"}
        </span>
      </div>

      {/* Banner desligado */}
      {customer.isEnabled === false && (
        <div style={{ background: "#7f1d1d", border: "1px solid #991b1b", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔌</span>
          <div>
            <div style={{ color: "#fca5a5", fontWeight: 600, fontSize: 14 }}>Acesso desligado</div>
            {customer.disableReason && <div style={{ color: "#fb923c", fontSize: 12 }}>Motivo: {customer.disableReason}</div>}
            {customer.disabledAt && <div style={{ color: "#94a3b8", fontSize: 11 }}>Em: {new Date(customer.disabledAt).toLocaleString("pt-BR")}</div>}
          </div>
          <button
            onClick={handleToggle}
            disabled={toggleBusy}
            style={{ marginLeft: "auto", padding: "6px 14px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {toggleBusy ? "…" : "⚡ Religar"}
          </button>
        </div>
      )}

      {/* Info / Edit */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={sectionTitle}>Informações</h2>
          <button onClick={() => setEditing((p) => !p)} style={editBtnStyle}>{editing ? "Cancelar" : "Editar"}</button>
        </div>

        {editing ? (
          <form onSubmit={saveCustomer}>
            <div style={grid2}>
              <div><label style={labelStyle}>Nome</label><input style={inputStyle} value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
              <div><label style={labelStyle}>Domínio</label><input style={inputStyle} value={form.domain} onChange={(e) => setForm((f: any) => ({ ...f, domain: e.target.value }))} /></div>
              <div><label style={labelStyle}>Hosting</label><input style={inputStyle} value={form.hostProvider} onChange={(e) => setForm((f: any) => ({ ...f, hostProvider: e.target.value }))} /></div>
              <div>
                <label style={labelStyle}>Plano</label>
                <select style={inputStyle} value={form.plan} onChange={(e) => setForm((f: any) => ({ ...f, plan: e.target.value }))}>
                  {["FREE", "BASIC", "PRO", "ENTERPRISE"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={form.status} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                  {["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Notas internas</label>
                <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            {msg && <div style={{ color: msg.startsWith("✅") ? "#4ade80" : "#f87171", fontSize: 13, marginTop: 8 }}>{msg}</div>}
            <button type="submit" disabled={saving} style={{ marginTop: 12, padding: "8px 20px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </form>
        ) : (
          <div style={grid2}>
            <Info label="Slug" value={customer.slug} />
            <Info label="Domínio" value={customer.domain ?? "—"} />
            <Info label="Hosting" value={customer.hostProvider ?? "—"} />
            <Info label="Plano" value={customer.plan} />
            <Info label="Licença" value={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ fontSize: 11, color: "#94a3b8" }}>{customer.licenseKey}</code>
                <button
                  onClick={rotateLicenseKey}
                  disabled={rotateBusy}
                  style={{ padding: "2px 8px", background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: rotateBusy ? "not-allowed" : "pointer" }}
                  title="Gerar nova chave — invalida a atual"
                >
                  {rotateBusy ? "…" : "🔑 Rotacionar"}
                </button>
              </div>
            } />
            {rotateMsg && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: rotateMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{rotateMsg}</div>}
            <Info label="Último ping" value={customer.lastPingAt ? new Date(customer.lastPingAt).toLocaleString("pt-BR") : "Nunca"} />
            {customer.notes && <Info label="Notas" value={customer.notes} />}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={sectionTitle}>Faturas</h2>
          <button onClick={() => setNewInv((p) => !p)} style={editBtnStyle}>+ Nova fatura</button>
        </div>

        {newInv && (
          <form onSubmit={createInvoice} style={{ background: "#0f172a", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={grid2}>
              <div><label style={labelStyle}>Valor (R$) *</label><input style={inputStyle} type="number" step="0.01" min="1" required value={invForm.amount} onChange={(e) => setInvForm((f) => ({ ...f, amount: e.target.value }))} placeholder="99.90" /></div>
              <div><label style={labelStyle}>Vencimento *</label><input style={inputStyle} type="date" required value={invForm.dueDate} onChange={(e) => setInvForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
              <div>
                <label style={labelStyle}>Meses de cobertura *</label>
                <select style={inputStyle} required value={invForm.months} onChange={(e) => setInvForm((f) => ({ ...f, months: e.target.value }))}>
                  <option value="1">1 mês (mensal)</option>
                  <option value="2">2 meses</option>
                  <option value="3">3 meses (trimestral)</option>
                  <option value="6">6 meses (semestral)</option>
                  <option value="12">12 meses (anual)</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Descrição</label><input style={inputStyle} value={invForm.description} onChange={(e) => setInvForm((f) => ({ ...f, description: e.target.value }))} placeholder="Licença mensal — plano Pro" /></div>
            </div>
            <button type="submit" disabled={saving} style={{ marginTop: 12, padding: "8px 20px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Gerando…" : "Criar e gerar Pix"}
            </button>
          </form>
        )}

        {customer.invoices.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13 }}>Nenhuma fatura</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Vencimento", "Valor", "Meses", "Validade", "Status", "Pix", "Ações"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", color: "#64748b", fontWeight: 600, textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customer.invoices.map((inv) => {
                const isPending = inv.status === "PENDING";
                const isOverdue = inv.status === "OVERDUE";
                const isPaid = inv.status === "PAID";
                return (
                <tr key={inv.id} style={{ borderTop: "1px solid #1e293b" }}>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</td>
                  <td style={{ padding: "8px 10px", color: "#f1f5f9", fontWeight: 600 }}>R$ {Number(inv.amount).toFixed(2)}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8", textAlign: "center" }}>
                    {inv.coverageMonths ?? 1}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {inv.expiresAt ? (
                      <span style={{ fontSize: 11, color: new Date(inv.expiresAt) < new Date() ? "#f87171" : "#4ade80" }}>
                        {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                      </span>
                    ) : <span style={{ color: "#64748b", fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ background: INV_STATUS_COLORS[inv.status] + "22", color: INV_STATUS_COLORS[inv.status], borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                      {inv.status}
                    </span>
                    {isPaid && inv.paidAt && (
                      <div style={{ fontSize: 10, color: "#4ade80", marginTop: 2 }}>
                        Pago em {new Date(inv.paidAt).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {inv.pixCode ? (
                      <button
                        onClick={() => copyPix(inv.pixCode!, inv.id)}
                        style={{ padding: "3px 10px", background: "#064e3b", color: "#4ade80", border: "1px solid #065f46", borderRadius: 5, fontSize: 11, cursor: "pointer" }}
                      >
                        {copiedPix === inv.id ? "✅ Copiado!" : "📋 Copiar"}
                      </button>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(isPending || isOverdue) && (
                        <>
                          <button
                            onClick={() => handleInvoiceAction(inv.id, "pay")}
                            disabled={actionBusy === inv.id}
                            style={{ padding: "3px 8px", background: "#065f46", color: "#4ade80", border: "1px solid #047857", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                            title="Dar baixa — marca como PAID e reativa cliente"
                          >
                            ✅ Baixa
                          </button>
                          <button
                            onClick={() => handleInvoiceAction(inv.id, "cancel")}
                            disabled={actionBusy === inv.id}
                            style={{ padding: "3px 8px", background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                            title="Cancelar fatura"
                          >
                            ❌
                          </button>
                        </>
                      )}
                      {isPaid && <span style={{ fontSize: 11, color: "#64748b" }}>—</span>}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 20 };
const sectionTitle: React.CSSProperties = { color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const editBtnStyle: React.CSSProperties = { padding: "5px 14px", background: "transparent", color: "#60a5fa", border: "1px solid #1e40af", borderRadius: 6, fontSize: 12, cursor: "pointer" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none" };
