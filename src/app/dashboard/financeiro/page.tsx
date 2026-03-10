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

interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  description: string | null;
  pixCode: string | null;
  paidAt: string | null;
  coverageMonths?: number;
  expiresAt?: string | null;
  gracePeriodEnd?: string | null;
  customer?: { id: string; name: string; slug: string };
}

interface CustomerMin {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface PlanInfo {
  id: string;
  name: string;
  label: string;
  monthlyPrice: number;
  annualPrice: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PAID: "#22c55e",
  OVERDUE: "#ef4444",
  CANCELLED: "#6b7280",
};

function FinanceiroContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<CustomerMin[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(searchParams.get("new") === "1");
  const [form, setForm] = useState({ customerId: "", plan: "", amount: "", dueDate: "", description: "", months: "1", discount: "0" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("");
  const [copiedPix, setCopiedPix] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [cronBusy, setCronBusy] = useState(false);
  const [cronMsg, setCronMsg] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Carrega clientes e planos em paralelo
      const [custData, plansData] = await Promise.all([
        fetchApi("/api/admin/customers"),
        fetchApi("/api/admin/plans"),
      ]);

      if (plansData.ok) setPlans(plansData.plans);

      if (!custData.ok) return;
      setCustomers(custData.customers.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, plan: c.plan })));

      // Carrega faturas de todos os clientes
      const allInvoices: Invoice[] = [];
      for (const c of custData.customers) {
        const id = await fetchApi(`/api/admin/customers/${c.id}/invoices`);

        if (id.ok) {
          allInvoices.push(
            ...id.invoices.map((inv: any) => ({ ...inv, customer: { id: c.id, name: c.name, slug: c.slug } }))
          );
        }
      }
      allInvoices.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      setInvoices(allInvoices);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Auto-calcula valor e descrição quando muda cliente, plano ou meses
  function recalcForm(overrides: Partial<typeof form>) {
    setForm((prev) => {
      const next = { ...prev, ...overrides };
      const plan = plans.find((p) => p.name === next.plan);
      if (plan) {
        const months = Number(next.months) || 1;
        const basePrice = months >= 12 ? plan.annualPrice : plan.monthlyPrice * months;
        const discount = Number(next.discount) || 0;
        const finalPrice = Math.max(0, basePrice - discount);
        next.amount = finalPrice.toFixed(2);

        // Descrição automática
        const periodLabel = months === 1 ? "mensal" : months === 12 ? "anual" : `${months} meses`;
        const customer = customers.find((c) => c.id === next.customerId);
        const clientName = customer?.name ?? "";
        next.description = `Licença ${plan.label} (${periodLabel})${clientName ? ` — ${clientName}` : ""}`;
      }
      return next;
    });
  }

  function onSelectCustomer(customerId: string) {
    const customer = customers.find((c) => c.id === customerId);
    const customerPlan = customer?.plan ?? "BASIC";
    recalcForm({ customerId, plan: customerPlan });
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) return setMsg("❌ Selecione um cliente");
    setSaving(true);
    setMsg("");
    const data = await fetchApi(`/api/admin/customers/${form.customerId}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(form.amount), dueDate: form.dueDate, description: form.description, months: Number(form.months) || 1, plan: form.plan, discount: Number(form.discount) || 0 }),
    });
    if (data.ok) {
      setMsg("✅ Fatura criada com Pix!");
      setShowNew(false);
      setForm({ customerId: "", plan: "", amount: "", dueDate: "", description: "", months: "1", discount: "0" });
      loadAll();
    } else {
      setMsg(`❌ ${data.message}`);
    }
    setSaving(false);
  }

  async function handleInvoiceAction(customerId: string, invoiceId: string, action: "pay" | "cancel" | "overdue") {
    setActionBusy(invoiceId);
    try {
      const data = await fetchApi(`/api/admin/customers/${customerId}/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (data.ok) {
        setMsg(`✅ ${data.message}`);
        loadAll();
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch {
      setMsg("❌ Erro de comunicação");
    } finally {
      setActionBusy(null);
    }
  }

  async function runCheckOverdue() {
    setCronBusy(true);
    setCronMsg("");
    try {
      const data = await fetchApi("/api/admin/cron/check-overdue", { method: "POST" });

      if (data.ok) {
        setCronMsg(`✅ ${data.message}`);
        loadAll();
      } else {
        setCronMsg(`❌ ${data.message}`);
      }
    } catch {
      setCronMsg("❌ Erro de comunicação");
    } finally {
      setCronBusy(false);
    }
  }

  async function copyPix(code: string, invId: string) {
    await navigator.clipboard.writeText(code);
    setCopiedPix(invId);
    setTimeout(() => setCopiedPix(null), 2000);
  }

  const filtered = filter
    ? invoices.filter((i) => i.status === filter)
    : invoices;

  const totalPending = invoices.filter((i) => i.status === "PENDING").reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>Financeiro</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={runCheckOverdue}
            disabled={cronBusy}
            style={{ padding: "8px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: cronBusy ? "not-allowed" : "pointer", opacity: cronBusy ? 0.6 : 1 }}
            title="Verifica faturas vencidas, marca como OVERDUE e suspende clientes com mais de 7 dias de atraso"
          >
            {cronBusy ? "Verificando…" : "⏰ Verificar vencidos"}
          </button>
          <button
            onClick={() => setShowNew((p) => !p)}
            style={{ padding: "8px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + Nova fatura
          </button>
        </div>
      </div>
      {cronMsg && <div style={{ marginBottom: 12, fontSize: 13, color: cronMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{cronMsg}</div>}

      {/* Resumo */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={summaryCard}>
          <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}>Pendente</div>
          <div style={{ color: "#f59e0b", fontSize: 24, fontWeight: 700 }}>R$ {totalPending.toFixed(2)}</div>
        </div>
        <div style={summaryCard}>
          <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}>Recebido</div>
          <div style={{ color: "#4ade80", fontSize: 24, fontWeight: 700 }}>R$ {totalPaid.toFixed(2)}</div>
        </div>
        <div style={summaryCard}>
          <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}>Total faturas</div>
          <div style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700 }}>{invoices.length}</div>
        </div>
      </div>

      {/* Form nova fatura */}
      {showNew && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h2 style={sectionTitle}>Nova fatura</h2>
          <form onSubmit={createInvoice}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>Cliente *</label>
                <select style={inputStyle} required value={form.customerId} onChange={(e) => onSelectCustomer(e.target.value)}>
                  <option value="">Selecione…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.slug}) — {c.plan}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Plano *</label>
                <select style={inputStyle} required value={form.plan} onChange={(e) => recalcForm({ plan: e.target.value })}>
                  <option value="">Selecione o plano…</option>
                  {plans.map((p) => (
                    <option key={p.name} value={p.name}>{p.label} — R$ {p.monthlyPrice.toFixed(2)}/mês</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Vencimento *</label>
                <input style={inputStyle} type="date" required value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Meses de cobertura *</label>
                <select style={inputStyle} required value={form.months} onChange={(e) => recalcForm({ months: e.target.value })}>
                  <option value="1">1 mês (mensal)</option>
                  <option value="2">2 meses</option>
                  <option value="3">3 meses (trimestral)</option>
                  <option value="6">6 meses (semestral)</option>
                  <option value="12">12 meses (anual)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Valor calculado (R$) *</label>
                <input style={{ ...inputStyle, background: "#0c1222", fontWeight: 700, color: "#4ade80" }} type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Desconto (R$)</label>
                <input style={inputStyle} type="number" step="0.01" min="0" value={form.discount} onChange={(e) => recalcForm({ discount: e.target.value })} placeholder="0.00" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Descrição (automática)</label>
                <input style={{ ...inputStyle, background: "#0c1222" }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Gerada automaticamente ao selecionar plano" />
              </div>
              {form.plan && (
                <div style={{ gridColumn: "1 / -1", background: "#0f172a", borderRadius: 8, padding: 12, display: "flex", gap: 20, fontSize: 12, color: "#94a3b8" }}>
                  {(() => {
                    const p = plans.find((pl) => pl.name === form.plan);
                    if (!p) return null;
                    const months = Number(form.months) || 1;
                    const base = months >= 12 ? p.annualPrice : p.monthlyPrice * months;
                    const disc = Number(form.discount) || 0;
                    return (
                      <>
                        <span>💰 Preço base: <b style={{ color: "#f1f5f9" }}>R$ {base.toFixed(2)}</b></span>
                        {disc > 0 && <span>🏷️ Desconto: <b style={{ color: "#f87171" }}>- R$ {disc.toFixed(2)}</b></span>}
                        <span>✅ Total: <b style={{ color: "#4ade80", fontSize: 14 }}>R$ {Math.max(0, base - disc).toFixed(2)}</b></span>
                        {months >= 12 && <span style={{ color: "#60a5fa" }}>💎 Preço anual aplicado</span>}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{msg}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "Gerando…" : "Criar e gerar Pix"}</button>
              <button type="button" onClick={() => setShowNew(false)} style={cancelBtn}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["", "PENDING", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "5px 14px",
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #334155",
              cursor: "pointer",
              background: filter === s ? "#334155" : "transparent",
              color: filter === s ? "#f1f5f9" : "#94a3b8",
            }}
          >
            {s === "" ? "Todas" : s}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ color: "#64748b" }}>Carregando…</div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 10, border: "1px solid #334155", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0f172a" }}>
                {["Cliente", "Vencimento", "Valor", "Meses", "Validade", "Status", "Pix", "Ações"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 20, color: "#64748b", textAlign: "center" }}>Nenhuma fatura</td></tr>
              ) : (
                filtered.map((inv) => {
                  const isPending = inv.status === "PENDING";
                  const isOverdue = inv.status === "OVERDUE";
                  const isPaid = inv.status === "PAID";
                  const isCancelled = inv.status === "CANCELLED";
                  return (
                  <tr key={inv.id} style={{ borderTop: "1px solid #334155" }}>
                    <td style={tdStyle}>
                      <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{inv.customer?.name ?? "—"}</div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>{inv.customer?.slug}</div>
                    </td>
                    <td style={tdStyle}>{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</td>
                    <td style={{ ...tdStyle, color: "#f1f5f9", fontWeight: 600 }}>R$ {Number(inv.amount).toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {inv.coverageMonths ?? 1} {(inv.coverageMonths ?? 1) === 1 ? "mês" : "meses"}
                    </td>
                    <td style={tdStyle}>
                      {inv.expiresAt ? (
                        <span style={{ fontSize: 11, color: new Date(inv.expiresAt) < new Date() ? "#f87171" : "#4ade80" }}>
                          {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                        </span>
                      ) : <span style={{ color: "#64748b", fontSize: 11 }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: (STATUS_COLORS[inv.status] ?? "#64748b") + "22", color: STATUS_COLORS[inv.status] ?? "#94a3b8", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {inv.status}
                      </span>
                      {isPaid && inv.paidAt && (
                        <div style={{ fontSize: 10, color: "#4ade80", marginTop: 2 }}>
                          Pago em {new Date(inv.paidAt).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {inv.pixCode ? (
                        <button
                          onClick={() => copyPix(inv.pixCode!, inv.id)}
                          style={{ padding: "3px 10px", background: "#064e3b", color: "#4ade80", border: "1px solid #065f46", borderRadius: 5, fontSize: 11, cursor: "pointer" }}
                        >
                          {copiedPix === inv.id ? "✅ Copiado!" : "📋 Copiar"}
                        </button>
                      ) : "—"}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(isPending || isOverdue) && (
                          <>
                            <button
                              onClick={() => handleInvoiceAction(inv.customer?.id ?? "", inv.id, "pay")}
                              disabled={actionBusy === inv.id}
                              style={{ padding: "3px 8px", background: "#065f46", color: "#4ade80", border: "1px solid #047857", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                              title="Dar baixa — marca como PAID e reativa cliente se suspenso"
                            >
                              ✅ Dar baixa
                            </button>
                            <button
                              onClick={() => handleInvoiceAction(inv.customer?.id ?? "", inv.id, "cancel")}
                              disabled={actionBusy === inv.id}
                              style={{ padding: "3px 8px", background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                              title="Cancelar fatura"
                            >
                              ❌ Cancelar
                            </button>
                          </>
                        )}
                        {isPaid && <span style={{ fontSize: 11, color: "#64748b" }}>—</span>}
                        {isCancelled && <span style={{ fontSize: 11, color: "#64748b" }}>—</span>}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<div style={{ color: "#64748b" }}>Carregando…</div>}>
      <FinanceiroContent />
    </Suspense>
  );
}

const summaryCard: React.CSSProperties = {
  background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "16px 20px", flex: 1,
};
const sectionTitle: React.CSSProperties = { color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none" };
const primaryBtn: React.CSSProperties = { padding: "8px 20px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const cancelBtn: React.CSSProperties = { padding: "8px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, fontSize: 13, cursor: "pointer" };
const thStyle: React.CSSProperties = { padding: "10px 14px", color: "#94a3b8", fontWeight: 600, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", color: "#94a3b8" };
