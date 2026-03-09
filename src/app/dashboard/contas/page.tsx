"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface BankAccount {
  id: string; label: string; holderName: string; pixKeyType: string; pixKey: string;
  bankName: string; bankCode: string; agency: string; accountNumber: string;
  isDefault: boolean; isActive: boolean; createdAt: string;
}

const PIX_TYPES = [
  { value: "CPF", label: "CPF" }, { value: "CNPJ", label: "CNPJ" },
  { value: "EMAIL", label: "E-mail" }, { value: "PHONE", label: "Telefone" },
  { value: "RANDOM", label: "Chave Aleatória" },
];

const emptyForm = (): Partial<BankAccount> => ({
  label: "", holderName: "", pixKeyType: "CPF", pixKey: "", bankName: "", bankCode: "", agency: "", accountNumber: "", isDefault: false, isActive: true,
});

export default function ContasBancariasPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ ok: boolean; accounts: BankAccount[] }>("/api/admin/bank-accounts");
      if (data.ok) setAccounts(data.accounts || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(a: BankAccount) { setEditing(a); setForm({ ...a }); setShowForm(true); setMsg(""); }
  function startNew() { setEditing(null); setForm(emptyForm()); setShowForm(true); setMsg(""); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const url = editing ? `/api/admin/bank-accounts/${editing.id}` : "/api/admin/bank-accounts";
      const method = editing ? "PUT" : "POST";
      const data = await api<{ ok: boolean; message?: string }>(url, { method, body: form });
      if (data.ok) { setMsg("✅ Conta salva!"); load(); setShowForm(false); setEditing(null); setForm(emptyForm()); }
      else setMsg(`❌ ${data.message}`);
    } catch (err: any) { setMsg(`❌ ${err.message}`); }
    setSaving(false);
  }

  async function toggleActive(a: BankAccount) {
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/bank-accounts/${a.id}`, { method: "PATCH", body: { isActive: !a.isActive } });
      if (data.ok) { setMsg(`✅ Conta ${a.isActive ? "desativada" : "ativada"}`); load(); } else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro"); }
  }

  async function setDefault(a: BankAccount) {
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/bank-accounts/${a.id}`, { method: "PATCH", body: { isDefault: true } });
      if (data.ok) { setMsg("✅ Conta padrão atualizada!"); load(); } else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro"); }
  }

  async function deleteAccount(id: string) {
    if (!confirm("Excluir esta conta bancária?")) return;
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/bank-accounts/${id}`, { method: "DELETE" });
      if (data.ok) { setMsg("✅ Conta excluída"); load(); } else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro"); }
  }

  function copyPix(key: string) { navigator.clipboard.writeText(key); setMsg("✅ Chave Pix copiada!"); }

  if (loading) return <div className="text-gray-400">Carregando contas…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏦 Contas Bancárias</h1>
          <p className="text-sm text-gray-500">Gerencie as contas bancárias e chaves Pix para recebimento</p>
        </div>
        <button onClick={startNew} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition">+ Nova conta</button>
      </div>

      {msg && <div className={`mb-4 rounded-lg p-3 text-sm border ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{msg}</div>}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">Nenhuma conta bancária cadastrada</div>
        ) : accounts.map((a) => (
          <div key={a.id} className={`bg-white border rounded-xl p-5 relative ${a.isDefault ? "border-sky-300 ring-2 ring-sky-100" : "border-gray-200"}`}>
            {a.isDefault && <div className="absolute top-3 right-3 bg-sky-100 text-sky-600 text-[10px] font-bold px-2 py-0.5 rounded">PADRÃO</div>}
            {!a.isActive && <div className="absolute top-3 right-12 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded">INATIVA</div>}

            <div className="mb-3">
              <div className="text-gray-800 font-bold text-lg">{a.label || "Sem nome"}</div>
              <div className="text-gray-400 text-xs">{a.holderName}</div>
            </div>

            <div className="space-y-2 mb-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-semibold text-gray-400 w-14">Pix</span>
                <span className="text-gray-700 font-mono text-xs flex-1">{a.pixKey}</span>
                <button onClick={() => copyPix(a.pixKey)} className="text-[10px] text-purple-600 border border-purple-200 rounded px-1.5 py-0.5 hover:bg-purple-50">📋</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-semibold text-gray-400 w-14">Tipo</span>
                <span className="text-gray-500 text-xs">{PIX_TYPES.find((t) => t.value === a.pixKeyType)?.label || a.pixKeyType}</span>
              </div>
              {a.bankName && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 w-14">Banco</span>
                  <span className="text-gray-500 text-xs">{a.bankName} ({a.bankCode})</span>
                </div>
              )}
              {a.agency && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 w-14">Ag/CC</span>
                  <span className="text-gray-500 text-xs">{a.agency} / {a.accountNumber}</span>
                </div>
              )}
            </div>

            <div className="flex gap-1 flex-wrap mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => startEdit(a)} className="text-[10px] text-sky-600 border border-sky-300 rounded px-2 py-0.5 hover:bg-sky-50 font-semibold">✏️ Editar</button>
              {!a.isDefault && a.isActive && <button onClick={() => setDefault(a)} className="text-[10px] text-amber-600 border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-50 font-semibold">⭐ Tornar padrão</button>}
              <button onClick={() => toggleActive(a)} className={`text-[10px] border rounded px-2 py-0.5 font-semibold ${a.isActive ? "text-red-500 border-red-300 hover:bg-red-50" : "text-green-600 border-green-300 hover:bg-green-50"}`}>{a.isActive ? "🔴 Desativar" : "🟢 Ativar"}</button>
              <button onClick={() => deleteAccount(a.id)} className="text-[10px] text-red-500 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 font-semibold">🗑 Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{editing ? `Editar: ${editing.label}` : "Nova Conta Bancária"}</h2>
          <form onSubmit={save}>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Nome/Label *</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Conta Principal" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Titular *</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required value={form.holderName} onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))} placeholder="Nome completo" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Tipo Chave Pix</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.pixKeyType} onChange={(e) => setForm((f) => ({ ...f, pixKeyType: e.target.value }))}>
                  {PIX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Chave Pix *</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required value={form.pixKey} onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Banco</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Itaú, Nubank, etc." /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Código</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.bankCode} onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))} placeholder="341" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Agência</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.agency} onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Conta</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} /></div>
            </div>
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-1.5 text-gray-500 text-xs"><input type="checkbox" checked={form.isDefault ?? false} onChange={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))} /> Conta padrão</label>
              <label className="flex items-center gap-1.5 text-gray-500 text-xs"><input type="checkbox" checked={form.isActive ?? true} onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} /> Ativa</label>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={saving} className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition disabled:opacity-50">{saving ? "Salvando…" : "Salvar conta"}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm()); }} className="rounded-lg px-4 py-2 text-sm text-gray-500 border border-gray-300 hover:bg-gray-50 transition">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
