"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Customer { id: string; name: string; domain: string; status: string; plan?: { monthlyPrice: number; annualPrice: number; label: string } }
interface Invoice { id: string; customerId: string; amount: number; dueDate: string; paidAt: string | null; status: string; pixCode: string | null; billingType: string; description: string; createdAt: string; customer?: Customer }

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
      if (data.ok) { setMsg("✅ Fatura criada!"); load(); setShowNew(false); } else setMsg(`❌ ${data.message}`);
    } catch (err: any) { setMsg(`❌ ${err.message}`); }
    setSaving(false);
  }

  async function payInvoice(inv: Invoice) {
    if (!confirm("Confirmar pagamento?")) return;
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/customers/${inv.customerId}/invoices`, { method: "PUT", body: { invoiceId: inv.id, action: "pay" } });
      if (data.ok) { setMsg("✅ Fatura paga!"); load(); } else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro"); }
  }

  async function cancelInvoice(inv: Invoice) {
    if (!confirm("Cancelar esta fatura?")) return;
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/customers/${inv.customerId}/invoices`, { method: "PUT", body: { invoiceId: inv.id, action: "cancel" } });
      if (data.ok) { setMsg("✅ Fatura cancelada"); load(); } else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro"); }
  }

  async function checkOverdue() {
    setChecking(true);
    try {
      const data = await api<{ ok: boolean; message?: string; updated?: number }>("/api/admin/cron/check-overdue", { method: "POST" });
      setMsg(data.ok ? `✅ ${data.message || "Verificado"} (${data.updated ?? 0} atualizadas)` : `❌ ${data.message}`);
      load();
    } catch { setMsg("❌ Erro"); }
    setChecking(false);
  }

  function copyPix(code: string) { navigator.clipboard.writeText(code); setMsg("✅ Código Pix copiado!"); }

  const filtered = filter === "ALL" ? invoices : invoices.filter((i) => i.status === filter);
  const totals = invoices.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + i.amount; return acc; }, {} as Record<string, number>);

  if (loading) return <div className="text-gray-400">Carregando financeiro…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💰 Financeiro</h1>
          <p className="text-sm text-gray-500">Faturas e cobranças dos clientes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkOverdue} disabled={checking} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition disabled:opacity-50">{checking ? "Verificando…" : "⏰ Verificar vencidos"}</button>
          <button onClick={() => setShowNew(true)} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition">+ Nova fatura</button>
        </div>
      </div>

      {msg && <div className={`mb-4 rounded-lg p-3 text-sm border ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{msg}</div>}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pendente", value: totals["PENDING"] || 0, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { label: "Vencido", value: totals["OVERDUE"] || 0, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Pago", value: totals["PAID"] || 0, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "Total", value: invoices.reduce((s, i) => s + i.amount, 0), color: "text-sky-600", bg: "bg-sky-50 border-sky-200" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-4 border ${c.bg}`}>
            <div className="text-[10px] uppercase font-semibold text-gray-400">{c.label}</div>
            <div className={`text-xl font-bold ${c.color}`}>R$ {c.value.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex gap-2 mb-4">
        {["ALL", "PENDING", "OVERDUE", "PAID", "CANCELLED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-lg border transition font-semibold ${filter === s ? "bg-sky-500 text-white border-sky-500" : "text-gray-500 border-gray-300 hover:bg-gray-50"}`}>
            {s === "ALL" ? "Todos" : s === "PENDING" ? "Pendentes" : s === "OVERDUE" ? "Vencidos" : s === "PAID" ? "Pagos" : "Cancelados"} ({s === "ALL" ? invoices.length : invoices.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      {/* Form nova fatura */}
      {showNew && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Nova Fatura</h2>
          <form onSubmit={createInvoice} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cliente *</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required value={selCustomer} onChange={(e) => { setSelCustomer(e.target.value); calcAmount(e.target.value, billingType); }}>
                <option value="">Selecione…</option>
                {customers.filter((c) => c.status === "ACTIVE").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={billingType} onChange={(e) => { setBillingType(e.target.value); calcAmount(selCustomer, e.target.value); }}>
                <option value="MONTHLY">Mensal</option>
                <option value="ANNUAL">Anual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$) *</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vencimento *</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mensalidade plano PRO - Jan/2026" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition disabled:opacity-50">{saving ? "Criando…" : "Criar fatura"}</button>
              <button type="button" onClick={() => setShowNew(false)} className="rounded-lg px-4 py-2 text-sm text-gray-500 border border-gray-300 hover:bg-gray-50 transition">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr><th className="text-left px-4 py-3">Cliente</th><th className="text-left px-4 py-3">Tipo</th><th className="text-left px-4 py-3">Valor</th><th className="text-left px-4 py-3">Vencimento</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma fatura encontrada</td></tr>
            ) : filtered.map((inv) => {
              const cust = customers.find((c) => c.id === inv.customerId);
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-700">{cust?.name || "—"}</div>
                    <div className="text-[10px] text-gray-400">{inv.description || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{inv.billingType === "ANNUAL" ? "📅 Anual" : "📆 Mensal"}</td>
                  <td className="px-4 py-3 font-bold text-green-600">R$ {inv.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                    {inv.paidAt && <div className="text-[10px] text-gray-400 mt-0.5">Pago: {new Date(inv.paidAt).toLocaleDateString("pt-BR")}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {inv.status === "PENDING" || inv.status === "OVERDUE" ? (
                        <>
                          <button onClick={() => payInvoice(inv)} className="text-[10px] text-green-600 border border-green-300 rounded px-2 py-0.5 hover:bg-green-50 font-semibold">✅ Pagar</button>
                          <button onClick={() => cancelInvoice(inv)} className="text-[10px] text-red-500 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 font-semibold">✖ Cancelar</button>
                          {inv.pixCode && <button onClick={() => copyPix(inv.pixCode!)} className="text-[10px] text-purple-600 border border-purple-300 rounded px-2 py-0.5 hover:bg-purple-50 font-semibold">📋 Pix</button>}
                        </>
                      ) : <span className="text-[10px] text-gray-400">—</span>}
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { PENDING: "bg-amber-100 text-amber-700", OVERDUE: "bg-red-100 text-red-700", PAID: "bg-green-100 text-green-700", CANCELLED: "bg-gray-100 text-gray-500" };
  const labels: Record<string, string> = { PENDING: "Pendente", OVERDUE: "Vencido", PAID: "Pago", CANCELLED: "Cancelado" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${map[status] || "bg-gray-100 text-gray-500"}`}>{labels[status] || status}</span>;
}
