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

const STATUS_COLORS: Record<string, string> = { ACTIVE: "bg-green-100 text-green-700", TRIAL: "bg-yellow-100 text-yellow-700", SUSPENDED: "bg-red-100 text-red-700", CANCELLED: "bg-gray-100 text-gray-600" };
const INV_STATUS_COLORS: Record<string, string> = { PENDING: "bg-yellow-100 text-yellow-700", PAID: "bg-green-100 text-green-700", OVERDUE: "bg-red-100 text-red-700", CANCELLED: "bg-gray-100 text-gray-600" };

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
      if (data.ok) { setMsg("✅ Salvo!"); setCustomer((c) => c ? { ...c, ...data.customer } : c); setEditing(false); }
      else setMsg(`❌ ${data.message}`);
    } catch (err: any) { setMsg(`❌ ${err.message}`); }
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
    if (action === "pay" && !confirm("Confirma dar baixa nesta fatura? O cliente será reativado se suspenso.")) return;
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
    if (!confirm("Gerar nova chave de licença? A chave atual será invalidada.")) return;
    setRotateBusy(true); setRotateMsg("");
    try {
      const data = await api<{ ok: boolean; newKey: string; message?: string }>(`/api/admin/customers/${id}/rotate-license`, { method: "POST" });
      if (data.ok) { setRotateMsg(`✅ Nova chave: ${data.newKey}`); setCustomer((c) => c ? { ...c, licenseKey: data.newKey } : c); }
      else setRotateMsg(`❌ ${data.message}`);
    } catch { setRotateMsg("❌ Erro de rede"); }
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

  if (loading) return <div className="text-gray-400">Carregando…</div>;
  if (!customer) return <div className="text-red-500">Cliente não encontrado.</div>;

  return (
    <div>
      <button onClick={() => router.push("/dashboard/clientes")} className="text-sky-600 text-sm mb-4 hover:underline">← Voltar</button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[customer.status] || "bg-gray-100"}`}>{customer.status}</span>
        <span className={`text-sm ${customer.isOnline ? "text-green-500" : "text-gray-400"}`}>{customer.isOnline ? "🟢 Online" : "⚫ Offline"}</span>
        <button onClick={handleToggle} disabled={toggleBusy} title={customer.isEnabled !== false ? "Desligar" : "Ligar"}
          className={`relative w-11 h-6 rounded-full transition ${customer.isEnabled !== false ? "bg-green-500" : "bg-gray-300"}`}>
          <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${customer.isEnabled !== false ? "left-[21px]" : "left-[3px]"}`} />
        </button>
        <span className={`text-xs font-semibold ${customer.isEnabled !== false ? "text-green-600" : "text-red-500"}`}>
          {customer.isEnabled !== false ? "Ligado" : "Desligado"}
        </span>
      </div>

      {/* Banner desligado */}
      {customer.isEnabled === false && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3">
          <span className="text-lg">🔌</span>
          <div className="flex-1">
            <div className="text-red-700 font-semibold text-sm">Acesso desligado</div>
            {customer.disableReason && <div className="text-red-500 text-xs">Motivo: {customer.disableReason}</div>}
            {customer.disabledAt && <div className="text-gray-500 text-xs">Em: {new Date(customer.disabledAt).toLocaleString("pt-BR")}</div>}
          </div>
          <button onClick={handleToggle} disabled={toggleBusy} className="bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-600 transition">
            {toggleBusy ? "…" : "⚡ Religar"}
          </button>
        </div>
      )}

      {/* Info / Edit */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informações</h2>
          <button onClick={() => setEditing((p) => !p)} className="text-xs text-sky-600 border border-sky-300 rounded-lg px-3 py-1 hover:bg-sky-50 transition">{editing ? "Cancelar" : "✏️ Editar"}</button>
        </div>

        {editing ? (
          <form onSubmit={saveCustomer}>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Nome</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500" value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Domínio</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500" value={form.domain} onChange={(e) => setForm((f: any) => ({ ...f, domain: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Hosting</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500" value={form.hostProvider} onChange={(e) => setForm((f: any) => ({ ...f, hostProvider: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Plano</label><select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" value={form.plan} onChange={(e) => setForm((f: any) => ({ ...f, plan: e.target.value }))}>{["FREE","BASIC","PRO","ENTERPRISE"].map((p) => <option key={p}>{p}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Status</label><select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" value={form.status} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}>{["TRIAL","ACTIVE","SUSPENDED","CANCELLED"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Notas</label><textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500 h-20 resize-y" value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            {msg && <div className={`mt-2 text-sm ${msg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{msg}</div>}
            <button type="submit" disabled={saving} className="mt-3 bg-sky-500 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-sky-600 transition disabled:opacity-50">{saving ? "Salvando…" : "Salvar"}</button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Info label="Slug" value={customer.slug} /><Info label="Domínio" value={customer.domain ?? "—"} />
            <Info label="Hosting" value={customer.hostProvider ?? "—"} /><Info label="Plano" value={customer.plan} />
            <div className="col-span-2">
              <Info label="Licença" value={
                <div className="flex items-center gap-2">
                  <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{customer.licenseKey}</code>
                  <button onClick={rotateLicenseKey} disabled={rotateBusy} className="text-[10px] font-semibold text-purple-600 border border-purple-300 rounded px-2 py-0.5 hover:bg-purple-50 transition">
                    {rotateBusy ? "…" : "🔑 Rotacionar"}
                  </button>
                </div>
              } />
            </div>
            {rotateMsg && <div className={`col-span-2 text-xs ${rotateMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{rotateMsg}</div>}
            <Info label="Último ping" value={customer.lastPingAt ? new Date(customer.lastPingAt).toLocaleString("pt-BR") : "Nunca"} />
            {customer.notes && <Info label="Notas" value={customer.notes} />}
          </div>
        )}
      </div>

      {/* Faturas */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Faturas</h2>
          <button onClick={() => setNewInv((p) => !p)} className="text-xs text-sky-600 border border-sky-300 rounded-lg px-3 py-1 hover:bg-sky-50 transition">+ Nova fatura</button>
        </div>

        {newInv && (
          <form onSubmit={createInvoice} className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$) *</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" type="number" step="0.01" min="1" required value={invForm.amount} onChange={(e) => setInvForm((f) => ({ ...f, amount: e.target.value }))} placeholder="99.90" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Vencimento *</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" type="date" required value={invForm.dueDate} onChange={(e) => setInvForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Meses de cobertura</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" value={invForm.months} onChange={(e) => setInvForm((f) => ({ ...f, months: e.target.value }))}>
                  <option value="1">1 mês</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option>
                </select>
              </div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" value={invForm.description} onChange={(e) => setInvForm((f) => ({ ...f, description: e.target.value }))} placeholder="Licença mensal — plano Pro" /></div>
            </div>
            <button type="submit" disabled={saving} className="mt-3 bg-sky-500 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-sky-600 transition disabled:opacity-50">{saving ? "Gerando…" : "Criar e gerar Pix"}</button>
          </form>
        )}

        {customer.invoices.length === 0 ? (
          <div className="text-gray-400 text-sm">Nenhuma fatura</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase">
                  {["Vencimento","Valor","Meses","Validade","Status","Pix","Ações"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customer.invoices.map((inv) => {
                  const isPending = inv.status === "PENDING"; const isOverdue = inv.status === "OVERDUE"; const isPaid = inv.status === "PAID";
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{new Date(inv.dueDate).toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800">R$ {Number(inv.amount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-500 text-center">{inv.coverageMonths ?? 1}</td>
                      <td className="px-3 py-2">{inv.expiresAt ? <span className={`text-xs ${new Date(inv.expiresAt) < new Date() ? "text-red-500" : "text-green-600"}`}>{new Date(inv.expiresAt).toLocaleDateString("pt-BR")}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${INV_STATUS_COLORS[inv.status] || "bg-gray-100"}`}>{inv.status}</span>
                        {isPaid && inv.paidAt && <div className="text-[10px] text-green-600 mt-0.5">Pago em {new Date(inv.paidAt).toLocaleDateString("pt-BR")}</div>}
                      </td>
                      <td className="px-3 py-2">{inv.pixCode ? <button onClick={() => copyPix(inv.pixCode!, inv.id)} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 hover:bg-green-100">{copiedPix === inv.id ? "✅ Copiado!" : "📋 Copiar"}</button> : "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {(isPending || isOverdue) && (<>
                            <button onClick={() => handleInvoiceAction(inv.id, "pay")} disabled={actionBusy === inv.id} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 font-semibold hover:bg-green-100" title="Dar baixa">✅ Baixa</button>
                            <button onClick={() => handleInvoiceAction(inv.id, "cancel")} disabled={actionBusy === inv.id} className="text-xs bg-red-50 text-red-600 border border-red-200 rounded px-2 py-0.5 font-semibold hover:bg-red-100" title="Cancelar">❌</button>
                          </>)}
                          {(isPaid || inv.status === "CANCELLED") && <span className="text-gray-300 text-xs">—</span>}
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
      <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-gray-700">{value}</div>
    </div>
  );
}
