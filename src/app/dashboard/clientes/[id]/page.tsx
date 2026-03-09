"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Invoice {
  id: string; amount: number; dueDate: string; status: string; description: string | null;
  pixCode: string | null; pixQrBase64: string | null; paidAt: string | null;
  coverageMonths?: number; expiresAt?: string | null; gracePeriodEnd?: string | null;
}

interface Customer {
  id: string; name: string; slug: string; domain: string | null; hostProvider: string | null;
  plan: string; status: string; isEnabled: boolean; disabledAt: string | null; disableReason: string | null;
  notes: string | null; licenseKey: string; lastPingAt: string | null; isOnline: boolean; invoices: Invoice[];
}

const panelStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, outline: "none" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

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
    api<{ ok: boolean; customer: Customer }>(`/api/admin/customers/${id}`)
      .then((data) => { if (data.ok) { setCustomer(data.customer); setForm({ name: data.customer.name, domain: data.customer.domain ?? "", hostProvider: data.customer.hostProvider ?? "", plan: data.customer.plan, status: data.customer.status, notes: data.customer.notes ?? "" }); } })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const data = await api<{ ok: boolean; customer: Customer; message?: string }>(`/api/admin/customers/${id}`, { method: "PATCH", body: form });
      if (data.ok) { setMsg("\u2705 Salvo!"); setCustomer((c) => c ? { ...c, ...data.customer } : c); setEditing(false); }
      else setMsg(`\u274c ${data.message}`);
    } catch (err: any) { setMsg(`\u274c ${err.message}`); }
    setSaving(false);
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const data = await api<{ ok: boolean; invoice: Invoice; message?: string }>(`/api/admin/customers/${id}/invoices`, { method: "POST", body: { ...invForm, amount: Number(invForm.amount), months: Number(invForm.months) || 1 } });
      if (data.ok) { setCustomer((c) => c ? { ...c, invoices: [data.invoice, ...(c.invoices ?? [])] } : c); setNewInv(false); setInvForm({ amount: "", dueDate: "", description: "", months: "1" }); }
      else alert(data.message);
    } catch { alert("Erro de rede"); }
    setSaving(false);
  }

  async function copyPix(code: string, invId: string) { await navigator.clipboard.writeText(code); setCopiedPix(invId); setTimeout(() => setCopiedPix(null), 2000); }

  async function handleInvoiceAction(invoiceId: string, action: "pay" | "cancel" | "overdue") {
    if (action === "pay" && !confirm("Confirma dar baixa nesta fatura? O cliente ser\u00e1 reativado se suspenso.")) return;
    if (action === "cancel" && !confirm("Confirma cancelar esta fatura?")) return;
    setActionBusy(invoiceId);
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/customers/${id}/invoices/${invoiceId}`, { method: "PATCH", body: { action } });
      if (data.ok) { const d2 = await api<{ ok: boolean; customer: Customer }>(`/api/admin/customers/${id}`); if (d2.ok) setCustomer(d2.customer); }
      else alert(data.message ?? "Erro");
    } catch { alert("Erro de rede"); }
    setActionBusy(null);
  }

  async function rotateLicenseKey() {
    if (!confirm("Gerar nova chave de licen\u00e7a? A chave atual ser\u00e1 invalidada.")) return;
    setRotateBusy(true); setRotateMsg("");
    try {
      const data = await api<{ ok: boolean; newKey: string; message?: string }>(`/api/admin/customers/${id}/rotate-license`, { method: "POST" });
      if (data.ok) { setRotateMsg(`\u2705 Nova chave: ${data.newKey}`); setCustomer((c) => c ? { ...c, licenseKey: data.newKey } : c); }
      else setRotateMsg(`\u274c ${data.message}`);
    } catch { setRotateMsg("\u274c Erro de rede"); }
    setRotateBusy(false);
  }

  async function handleToggle() {
    if (!customer) return;
    const enabling = customer.isEnabled === false;
    if (!enabling && !confirm(`Desligar o acesso de "${customer.name}"?`)) return;
    setToggleBusy(true);
    try {
      const data = await api<{ ok: boolean; customer: any; message?: string }>(`/api/admin/customers/${id}/toggle`, { method: "POST", body: { enabled: enabling, reason: enabling ? "" : "Desligado manualmente" } });
      if (data.ok) setCustomer((c) => c ? { ...c, isEnabled: data.customer.isEnabled, disabledAt: data.customer.disabledAt, disableReason: data.customer.disableReason } : c);
      else alert(data.message ?? "Erro");
    } catch { alert("Erro de rede"); }
    setToggleBusy(false);
  }

  const msgBg = msg.startsWith("\u2705") ? "#065f4633" : "#7f1d1d";
  const msgColor = msg.startsWith("\u2705") ? "#34d399" : "#fca5a5";

  if (loading) return <div style={{ color: "#64748b" }}>Carregando\u2026</div>;
  if (!customer) return <div style={{ color: "#f87171" }}>Cliente n\u00e3o encontrado.</div>;

  const statusColors: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: "#065f4633", color: "#34d399" }, TRIAL: { bg: "#78350f33", color: "#fbbf24" },
    SUSPENDED: { bg: "#7f1d1d33", color: "#f87171" }, CANCELLED: { bg: "#1e293b", color: "#64748b" },
  };
  const stc = statusColors[customer.status] || { bg: "#1e293b", color: "#64748b" };

  return (
    <div>
      <button onClick={() => router.push("/dashboard/clientes")} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 13, cursor: "pointer", marginBottom: 14 }}>\u2190 Voltar</button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>{customer.name}</h1>
        <span style={{ background: stc.bg, color: stc.color, padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{customer.status}</span>
        <span style={{ fontSize: 13, color: customer.isOnline ? "#34d399" : "#475569" }}>{customer.isOnline ? "\ud83d\udfe2 Online" : "\u26ab Offline"}</span>
        <button onClick={handleToggle} disabled={toggleBusy} title={customer.isEnabled !== false ? "Desligar" : "Ligar"}
          style={{ position: "relative", width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: customer.isEnabled !== false ? "#22c55e" : "#475569", transition: "all 0.2s" }}>
          <span style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)", transition: "all 0.2s", left: customer.isEnabled !== false ? 23 : 3 }} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, color: customer.isEnabled !== false ? "#22c55e" : "#f87171" }}>{customer.isEnabled !== false ? "Ligado" : "Desligado"}</span>
      </div>

      {/* Banner desligado */}
      {customer.isEnabled === false && (
        <div style={{ background: "#7f1d1d33", border: "1px solid #7f1d1d55", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>\ud83d\udd0c</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#f87171", fontWeight: 600, fontSize: 13 }}>Acesso desligado</div>
            {customer.disableReason && <div style={{ color: "#fca5a5", fontSize: 11 }}>Motivo: {customer.disableReason}</div>}
            {customer.disabledAt && <div style={{ color: "#475569", fontSize: 11 }}>Em: {new Date(customer.disabledAt).toLocaleString("pt-BR")}</div>}
          </div>
          <button onClick={handleToggle} disabled={toggleBusy} style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{toggleBusy ? "\u2026" : "\u26a1 Religar"}</button>
        </div>
      )}

      {/* Info / Edit */}
      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Informa\u00e7\u00f5es</h2>
          <button onClick={() => setEditing((p) => !p)} style={{ background: "none", border: "1px solid #334155", color: "#60a5fa", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{editing ? "Cancelar" : "\u270f\ufe0f Editar"}</button>
        </div>

        {editing ? (
          <form onSubmit={saveCustomer}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Nome</label><input style={inputStyle} value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
              <div><label style={labelStyle}>Dom\u00ednio</label><input style={inputStyle} value={form.domain} onChange={(e) => setForm((f: any) => ({ ...f, domain: e.target.value }))} /></div>
              <div><label style={labelStyle}>Hosting</label><input style={inputStyle} value={form.hostProvider} onChange={(e) => setForm((f: any) => ({ ...f, hostProvider: e.target.value }))} /></div>
              <div><label style={labelStyle}>Plano</label><select style={inputStyle} value={form.plan} onChange={(e) => setForm((f: any) => ({ ...f, plan: e.target.value }))}>{["FREE","BASIC","PRO","ENTERPRISE"].map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label style={labelStyle}>Status</label><select style={inputStyle} value={form.status} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}>{["TRIAL","ACTIVE","SUSPENDED","CANCELLED"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Notas</label><textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            {msg && <div style={{ marginTop: 8, fontSize: 13, background: msgBg, color: msgColor, padding: "6px 10px", borderRadius: 6 }}>{msg}</div>}
            <button type="submit" disabled={saving} style={{ marginTop: 10, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Salvando\u2026" : "Salvar"}</button>
          </form>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Info label="Slug" value={customer.slug} />
            <Info label="Dom\u00ednio" value={customer.domain ?? "\u2014"} />
            <Info label="Hosting" value={customer.hostProvider ?? "\u2014"} />
            <Info label="Plano" value={customer.plan} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Info label="Licen\u00e7a" value={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ fontSize: 11, color: "#94a3b8", background: "#0f172a", padding: "2px 8px", borderRadius: 4 }}>{customer.licenseKey}</code>
                  <button onClick={rotateLicenseKey} disabled={rotateBusy} style={{ background: "none", border: "1px solid #334155", color: "#a78bfa", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{rotateBusy ? "\u2026" : "\ud83d\udd11 Rotacionar"}</button>
                </div>
              } />
            </div>
            {rotateMsg && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: rotateMsg.startsWith("\u2705") ? "#34d399" : "#f87171" }}>{rotateMsg}</div>}
            <Info label="\u00daltimo ping" value={customer.lastPingAt ? new Date(customer.lastPingAt).toLocaleString("pt-BR") : "Nunca"} />
            {customer.notes && <Info label="Notas" value={customer.notes} />}
          </div>
        )}
      </div>

      {/* Faturas */}
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Faturas</h2>
          <button onClick={() => setNewInv((p) => !p)} style={{ background: "none", border: "1px solid #334155", color: "#60a5fa", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Nova fatura</button>
        </div>

        {newInv && (
          <form onSubmit={createInvoice} style={{ background: "#0f172a", borderRadius: 10, padding: 16, marginBottom: 14, border: "1px solid #334155" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Valor (R$) *</label><input style={inputStyle} type="number" step="0.01" min="1" required value={invForm.amount} onChange={(e) => setInvForm((f) => ({ ...f, amount: e.target.value }))} placeholder="99.90" /></div>
              <div><label style={labelStyle}>Vencimento *</label><input style={inputStyle} type="date" required value={invForm.dueDate} onChange={(e) => setInvForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
              <div>
                <label style={labelStyle}>Meses de cobertura</label>
                <select style={inputStyle} value={invForm.months} onChange={(e) => setInvForm((f) => ({ ...f, months: e.target.value }))}>
                  <option value="1">1 m\u00eas</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Descri\u00e7\u00e3o</label><input style={inputStyle} value={invForm.description} onChange={(e) => setInvForm((f) => ({ ...f, description: e.target.value }))} placeholder="Licen\u00e7a mensal \u2014 plano Pro" /></div>
            </div>
            <button type="submit" disabled={saving} style={{ marginTop: 10, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Gerando\u2026" : "Criar e gerar Pix"}</button>
          </form>
        )}

        {customer.invoices.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 13 }}>Nenhuma fatura</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["Vencimento", "Valor", "Meses", "Validade", "Status", "Pix", "A\u00e7\u00f5es"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customer.invoices.map((inv) => {
                  const isPending = inv.status === "PENDING";
                  const isOverdue = inv.status === "OVERDUE";
                  const isPaid = inv.status === "PAID";
                  const invStatusColors: Record<string, { bg: string; color: string }> = {
                    PENDING: { bg: "#78350f33", color: "#fbbf24" }, PAID: { bg: "#065f4633", color: "#34d399" },
                    OVERDUE: { bg: "#7f1d1d33", color: "#f87171" }, CANCELLED: { bg: "#1e293b", color: "#64748b" },
                  };
                  const isc = invStatusColors[inv.status] || { bg: "#1e293b", color: "#64748b" };
                  return (
                    <tr key={inv.id} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#f1f5f9" }}>R$ {Number(inv.amount).toFixed(2)}</td>
                      <td style={{ padding: "8px 12px", color: "#94a3b8", textAlign: "center" }}>{inv.coverageMonths ?? 1}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {inv.expiresAt ? (
                          <span style={{ fontSize: 12, color: new Date(inv.expiresAt) < new Date() ? "#f87171" : "#34d399" }}>{new Date(inv.expiresAt).toLocaleDateString("pt-BR")}</span>
                        ) : <span style={{ color: "#475569" }}>\u2014</span>}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ background: isc.bg, color: isc.color, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{inv.status}</span>
                        {isPaid && inv.paidAt && <div style={{ fontSize: 10, color: "#34d399", marginTop: 2 }}>Pago em {new Date(inv.paidAt).toLocaleDateString("pt-BR")}</div>}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {inv.pixCode ? (
                          <button onClick={() => copyPix(inv.pixCode!, inv.id)} style={{ background: "none", border: "1px solid #334155", color: "#34d399", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                            {copiedPix === inv.id ? "\u2705 Copiado!" : "\ud83d\udccb Copiar"}
                          </button>
                        ) : "\u2014"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(isPending || isOverdue) && (
                            <>
                              <button onClick={() => handleInvoiceAction(inv.id, "pay")} disabled={actionBusy === inv.id} style={{ background: "none", border: "1px solid #334155", color: "#34d399", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }} title="Dar baixa">\u2705 Baixa</button>
                              <button onClick={() => handleInvoiceAction(inv.id, "cancel")} disabled={actionBusy === inv.id} style={{ background: "none", border: "1px solid #334155", color: "#f87171", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }} title="Cancelar">\u274c</button>
                            </>
                          )}
                          {(isPaid || inv.status === "CANCELLED") && <span style={{ color: "#475569", fontSize: 10 }}>\u2014</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#f1f5f9" }}>{value}</div>
    </div>
  );
}
