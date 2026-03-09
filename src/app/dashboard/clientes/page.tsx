"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";

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
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  TRIAL: "bg-yellow-100 text-yellow-700 border-yellow-200",
  SUSPENDED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free", BASIC: "Básico", PRO: "Pro", ENTERPRISE: "Enterprise",
};

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
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const data = await api<{ ok: boolean; message?: string }>("/api/admin/customers", { method: "POST", body: form });
      if (data.ok) {
        setMsg("✅ Cliente criado com sucesso!");
        setShowNew(false);
        setForm({ name: "", slug: "", domain: "", plan: "BASIC", status: "TRIAL" });
        load();
      } else setMsg(`❌ ${data.message}`);
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
      if (data.ok) {
        setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, isEnabled: enable, disableReason: enable ? null : reason } : c));
      } else alert(data.message ?? "Erro ao alternar");
    } catch { alert("Erro de rede"); }
    setToggleBusy(null);
    setDisableModal(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏢 Clientes</h1>
          <p className="text-sm text-gray-500">Gerencie as igrejas cadastradas no sistema</p>
        </div>
        <button onClick={() => setShowNew((p) => !p)} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition">
          + Novo Cliente
        </button>
      </div>

      {msg && <div className={`mb-4 rounded-lg p-3 text-sm border ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{msg}</div>}

      {/* Formulário novo cliente */}
      {showNew && (
        <form onSubmit={createCustomer} className="rounded-xl bg-white border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Novo cliente</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Igreja XYZ" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug (único) *</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} placeholder="igreja-xyz" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Domínio</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="app.igrejaxyz.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Plano</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 outline-none" value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}>
                <option value="FREE">Free</option>
                <option value="BASIC">Básico</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition disabled:opacity-50">{saving ? "Salvando…" : "Criar"}</button>
            <button type="button" onClick={() => setShowNew(false)} className="rounded-lg px-4 py-2 text-sm text-gray-500 border border-gray-300 hover:bg-gray-50 transition">Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, slug ou domínio…" />
        <select className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Ativo</option>
          <option value="SUSPENDED">Suspenso</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {["Cliente", "Plano", "Status", "Acesso", "Online", "Erros", "Chats", "Ações"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Nenhum cliente encontrado</td></tr>
              ) : (
                customers.map((c) => {
                  const enabled = c.isEnabled !== false;
                  const isBusy = toggleBusy === c.id;
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50 transition ${!enabled ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{c.name}</span>
                          {!enabled && <span className="text-[10px] bg-red-100 text-red-600 rounded px-1.5 py-0.5 font-bold">DESLIGADO</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {c.slug}{c.domain ? ` · ${c.domain}` : ""}
                          {!enabled && c.disableReason && <span className="ml-1 text-red-400">({c.disableReason})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{PLAN_LABELS[c.plan] ?? c.plan}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleCustomer(c, !enabled)} disabled={isBusy} title={enabled ? "Desligar acesso" : "Ligar acesso"}
                          className={`relative w-11 h-6 rounded-full transition ${enabled ? "bg-green-500" : "bg-gray-300"} ${isBusy ? "cursor-not-allowed" : "cursor-pointer"}`}>
                          <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${enabled ? "left-[21px]" : "left-[3px]"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">{c.isOnline ? <span className="text-green-500">🟢 Sim</span> : <span className="text-gray-300">⚫ Não</span>}</td>
                      <td className="px-4 py-3">{c.unresolvedLogs > 0 ? <span className="text-red-500">🐛 {c.unresolvedLogs}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">{c.unreadAdmin > 0 ? <span className="text-amber-500">💬 {c.unreadAdmin}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => router.push(`/dashboard/clientes/${c.id}`)} className="rounded-lg border border-sky-300 text-sky-600 px-3 py-1 text-xs font-semibold hover:bg-sky-50 transition">
                          👁 Ver
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

      {/* Modal desligar */}
      {disableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-1">🔌 Desligar acesso</h3>
            <p className="text-sm text-gray-500 mb-4">
              Desligar o acesso de <strong className="text-red-600">{disableModal.name}</strong>? O cliente não conseguirá acessar o sistema.
            </p>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motivo (opcional)</label>
            <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none mb-4" value={disableReason} onChange={(e) => setDisableReason(e.target.value)} placeholder="Ex: Inadimplência, manutenção programada…" autoFocus />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDisableModal(null)} className="rounded-lg px-4 py-2 text-sm text-gray-500 border border-gray-300 hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={() => executeToggle(disableModal.id, false, disableReason)} disabled={toggleBusy === disableModal.id} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-50">
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
    <Suspense fallback={<div className="text-gray-400">Carregando…</div>}>
      <ClientesContent />
    </Suspense>
  );
}
