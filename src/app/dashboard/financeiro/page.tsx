"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Customer { id: string; name: string; domain: string; status: string; plan?: { monthlyPrice: number; annualPrice: number; label: string } }
interface Invoice { id: string; customerId: string; amount: number; dueDate: string; paidAt: string | null; status: string; pixCode: string | null; billingType: string; description: string; createdAt: string; customer?: Customer }

const panelStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, outline: "none" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

export default function FinanceiroPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showNew, setShowNew] = useState(false);
  const [selCustomer, setSelCustomer] = useState("");
  const [billingType, setBillingType] = useState("MONTHLY");
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [cData, iData] = await Promise.all([
        api<{ ok: boolean; customers: Customer[] }>("/api/admin/customers"),
        api<{ ok: boolean; invoices: Invoice[] }>("/api/admin/invoices"),
      ]);
      if (cData.ok) setCustomers(cData.customers || []);
      if (iData.ok) setInvoices(iData.invoices || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function calcAmount(cId: string, bt: string) {
    const c = customers.find((x) => x.id === cId);
    if (!c?.plan) return;
    setAmount(bt === "ANNUAL" ? c.plan.annualPrice : c.plan.monthlyPrice);
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/customers/${selCustomer}/invoices`, { method: "POST", body: { amount, dueDate, billingType, description: desc } });
      if (data.ok) { setMsg("\u2705 Fatura criada!"); load(); setShowNew(false); } else setMsg(`\u274c ${data.message}`);
    } catch (err: any) { setMsg(`\u274c ${err.message}`); }
    setSaving(false);
  }

  async function payInvoice(inv: Invoice) {
    if (!confirm("Confirmar pagamento?")) return;
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/customers/${inv.customerId}/invoices`, { method: "PUT", body: { invoiceId: inv.id, action: "pay" } });
      if (data.ok) { setMsg("\u2705 Fatura paga!"); load(); } else setMsg(`\u274c ${data.message}`);
    } catch { setMsg("\u274c Erro"); }
  }

  async function cancelInvoice(inv: Invoice) {
    if (!confirm("Cancelar esta fatura?")) return;
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/customers/${inv.customerId}/invoices`, { method: "PUT", body: { invoiceId: inv.id, action: "cancel" } });
      if (data.ok) { setMsg("\u2705 Fatura cancelada"); load(); } else setMsg(`\u274c ${data.message}`);
    } catch { setMsg("\u274c Erro"); }
  }

  async function checkOverdue() {
    setChecking(true);
    try {
      const data = await api<{ ok: boolean; message?: string; updated?: number }>("/api/admin/cron/check-overdue", { method: "POST" });
      setMsg(data.ok ? `\u2705 ${data.message || "Verificado"} (${data.updated ?? 0} atualizadas)` : `\u274c ${data.message}`);
      load();
    } catch { setMsg("\u274c Erro"); }
    setChecking(false);
  }

  function copyPix(code: string) { navigator.clipboard.writeText(code); setMsg("\u2705 C\u00f3digo Pix copiado!"); }

  const filtered = filter === "ALL" ? invoices : invoices.filter((i) => i.status === filter);
  const totals = invoices.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + i.amount; return acc; }, {} as Record<string, number>);
  const msgBg = msg.startsWith("\u2705") ? "#065f4633" : "#7f1d1d";
  const msgColor = msg.startsWith("\u2705") ? "#34d399" : "#fca5a5";

  if (loading) return <div style={{ color: "#64748b" }}>Carregando financeiro\u2026</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>\ud83d\udcb0 Financeiro</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Faturas e cobran\u00e7as dos clientes</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={checkOverdue} disabled={checking} style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: checking ? 0.5 : 1 }}>{checking ? "Verificando\u2026" : "\u23f0 Verificar vencidos"}</button>
          <button onClick={() => setShowNew(true)} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Nova fatura</button>
        </div>
      </div>

      {msg && <div style={{ background: msgBg, color: msgColor, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{msg}</div>}

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Pendente", value: totals["PENDING"] || 0, color: "#fbbf24", bg: "#78350f33" },
          { label: "Vencido", value: totals["OVERDUE"] || 0, color: "#f87171", bg: "#7f1d1d33" },
          { label: "Pago", value: totals["PAID"] || 0, color: "#34d399", bg: "#065f4633" },
          { label: "Total", value: invoices.reduce((s, i) => s + i.amount, 0), color: "#60a5fa", bg: "#1d4ed822" },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, border: "1px solid #334155", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 600, color: "#64748b" }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>R$ {c.value.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["ALL", "PENDING", "OVERDUE", "PAID", "CANCELLED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid", fontWeight: 600, cursor: "pointer", background: filter === s ? "#3b82f6" : "none", color: filter === s ? "#fff" : "#94a3b8", borderColor: filter === s ? "#3b82f6" : "#334155" }}>
            {s === "ALL" ? "Todos" : s === "PENDING" ? "Pendentes" : s === "OVERDUE" ? "Vencidos" : s === "PAID" ? "Pagos" : "Cancelados"} ({s === "ALL" ? invoices.length : invoices.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      {/* Form nova fatura */}
      {showNew && (
        <div style={{ ...panelStyle, marginBottom: 20 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Nova Fatura</h2>
          <form onSubmit={createInvoice} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Cliente *</label>
              <select style={inputStyle} required value={selCustomer} onChange={(e) => { setSelCustomer(e.target.value); calcAmount(e.target.value, billingType); }}>
                <option value="">Selecione\u2026</option>
                {customers.filter((c) => c.status === "ACTIVE").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={billingType} onChange={(e) => { setBillingType(e.target.value); calcAmount(selCustomer, e.target.value); }}>
                <option value="MONTHLY">Mensal</option>
                <option value="ANNUAL">Anual</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Valor (R$) *</label>
              <input style={inputStyle} type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Vencimento *</label>
              <input style={inputStyle} type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Descri\u00e7\u00e3o</label>
              <input style={inputStyle} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mensalidade plano PRO - Jan/2026" />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Criando\u2026" : "Criar fatura"}</button>
              <button type="button" onClick={() => setShowNew(false)} style={{ background: "none", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela */}
      <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {["Cliente", "Tipo", "Valor", "Vencimento", "Status", "A\u00e7\u00f5es"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#475569" }}>Nenhuma fatura encontrada</td></tr>
            ) : filtered.map((inv) => {
              const cust = customers.find((c) => c.id === inv.customerId);
              const statusMap: Record<string, { bg: string; color: string; label: string }> = {
                PENDING: { bg: "#78350f33", color: "#fbbf24", label: "Pendente" },
                OVERDUE: { bg: "#7f1d1d33", color: "#f87171", label: "Vencido" },
                PAID: { bg: "#065f4633", color: "#34d399", label: "Pago" },
                CANCELLED: { bg: "#1e293b", color: "#64748b", label: "Cancelado" },
              };
              const sc = statusMap[inv.status] || { bg: "#1e293b", color: "#64748b", label: inv.status };
              return (
                <tr key={inv.id} style={{ borderBottom: "1px solid #334155" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{cust?.name || "\u2014"}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{inv.description || "\u2014"}</div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>{inv.billingType === "ANNUAL" ? "\ud83d\udcc5 Anual" : "\ud83d\udcc6 Mensal"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#34d399" }}>R$ {inv.amount.toFixed(2)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{sc.label}</span>
                    {inv.paidAt && <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Pago: {new Date(inv.paidAt).toLocaleDateString("pt-BR")}</div>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {inv.status === "PENDING" || inv.status === "OVERDUE" ? (
                        <>
                          <button onClick={() => payInvoice(inv)} style={{ background: "none", border: "1px solid #334155", color: "#34d399", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>\u2705 Pagar</button>
                          <button onClick={() => cancelInvoice(inv)} style={{ background: "none", border: "1px solid #334155", color: "#f87171", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>\u2716 Cancelar</button>
                          {inv.pixCode && <button onClick={() => copyPix(inv.pixCode!)} style={{ background: "none", border: "1px solid #334155", color: "#a78bfa", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>\ud83d\udccb Pix</button>}
                        </>
                      ) : <span style={{ color: "#475569", fontSize: 10 }}>\u2014</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
