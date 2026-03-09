"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Plan {
  id: string; name: string; label: string; monthlyPrice: number; annualPrice: number; features: string;
  hasDashboard: boolean; hasLandingPage: boolean; menuVisaoGeral: boolean; menuCongregacoes: boolean;
  menuMembros: boolean; menuFinancas: boolean; menuRelatorios: boolean; menuDirigentes: boolean;
  menuSecretaria: boolean; menuMissionarios: boolean; menuEventos: boolean; menuPermissoes: boolean;
  menuNoticias: boolean; menuIgreja: boolean; menuEBD: boolean; isActive: boolean; sortOrder: number;
}

const MENU_FIELDS: { key: keyof Plan; label: string }[] = [
  { key: "menuVisaoGeral", label: "Visão Geral" }, { key: "menuCongregacoes", label: "Congregações" },
  { key: "menuMembros", label: "Membros" }, { key: "menuFinancas", label: "Finanças" },
  { key: "menuRelatorios", label: "Relatórios" }, { key: "menuDirigentes", label: "Dirigentes" },
  { key: "menuSecretaria", label: "Secretaria" }, { key: "menuMissionarios", label: "Missionários" },
  { key: "menuEventos", label: "Eventos" }, { key: "menuPermissoes", label: "Permissões" },
  { key: "menuNoticias", label: "Notícias" }, { key: "menuIgreja", label: "Igreja" },
  { key: "menuEBD", label: "EBD" },
];

const emptyForm = (): Partial<Plan> & { name: string; label: string } => ({
  name: "", label: "", monthlyPrice: 0, annualPrice: 0, features: "[]",
  hasDashboard: true, hasLandingPage: false,
  menuVisaoGeral: true, menuCongregacoes: true, menuMembros: true, menuFinancas: true,
  menuRelatorios: true, menuDirigentes: true, menuSecretaria: false, menuMissionarios: false,
  menuEventos: false, menuPermissoes: false, menuNoticias: false, menuIgreja: false, menuEBD: false,
  isActive: true, sortOrder: 0,
});

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function loadPlans() {
    setLoading(true);
    try { const data = await api<{ ok: boolean; plans: Plan[] }>("/api/admin/plans"); if (data.ok) setPlans(data.plans); } catch {}
    setLoading(false);
  }

  useEffect(() => { loadPlans(); }, []);

  function startEdit(plan: Plan) { setEditing(plan); setForm({ ...plan }); setMsg(""); setShowForm(true); }
  function startNew() { setEditing(null); setForm(emptyForm()); setMsg(""); setShowForm(true); }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const data = await api<{ ok: boolean; message?: string }>("/api/admin/plans", { method: "POST", body: form });
      if (data.ok) { setMsg("✅ Plano salvo!"); loadPlans(); setShowForm(false); setEditing(null); setForm(emptyForm()); }
      else setMsg(`❌ ${data.message}`);
    } catch (err: any) { setMsg(`❌ ${err.message}`); }
    setSaving(false);
  }

  async function deletePlan(id: string) {
    if (!confirm("Excluir este plano?")) return;
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/plans/${id}`, { method: "DELETE" });
      if (data.ok) { setMsg("✅ Plano excluído"); loadPlans(); } else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro de rede"); }
  }

  async function seedPlans() {
    setSeeding(true);
    try {
      const data = await api<{ ok: boolean; message?: string }>("/api/admin/plans/seed", { method: "POST" });
      if (data.ok) { setMsg(`✅ ${data.message}`); loadPlans(); } else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro de rede"); }
    setSeeding(false);
  }

  const toggleMenu = (key: keyof Plan) => setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }));

  if (loading) return <div className="text-gray-400">Carregando planos…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 Planos</h1>
          <p className="text-sm text-gray-500">Gerencie os planos disponíveis para os clientes</p>
        </div>
        <div className="flex gap-2">
          {plans.length === 0 && <button onClick={seedPlans} disabled={seeding} className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 transition disabled:opacity-50">{seeding ? "Criando…" : "�� Criar planos padrão"}</button>}
          <button onClick={startNew} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition">+ Novo plano</button>
        </div>
      </div>

      {msg && <div className={`mb-4 rounded-lg p-3 text-sm border ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{msg}</div>}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {plans.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 relative">
            {!p.isActive && <div className="absolute top-3 right-3 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded">INATIVO</div>}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{p.name === "BASIC" ? "🥉" : p.name === "PRO" ? "🥈" : "🥇"}</span>
              <div>
                <div className="text-gray-800 font-bold">{p.label}</div>
                <div className="text-gray-400 text-xs">{p.name}</div>
              </div>
            </div>
            <div className="flex gap-6 mb-3">
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Mensal</div>
                <div className="text-green-600 text-lg font-bold">R$ {p.monthlyPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Anual</div>
                <div className="text-sky-600 text-lg font-bold">R$ {p.annualPrice.toFixed(2)}</div>
              </div>
            </div>
            <div className="mb-2">
              <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Acesso</div>
              <div className="flex gap-1 flex-wrap">
                <Tag active={p.hasDashboard}>Dashboard</Tag>
                <Tag active={p.hasLandingPage}>Landing Page</Tag>
              </div>
            </div>
            <div className="mb-3">
              <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Menus</div>
              <div className="flex gap-1 flex-wrap">
                {MENU_FIELDS.map(({ key, label }) => <Tag key={key} active={p[key] as boolean}>{label}</Tag>)}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => startEdit(p)} className="text-xs text-sky-600 border border-sky-300 rounded-lg px-3 py-1 hover:bg-sky-50 transition font-semibold">✏️ Editar</button>
              <button onClick={() => deletePlan(p.id)} className="text-xs text-red-500 border border-red-300 rounded-lg px-3 py-1 hover:bg-red-50 transition font-semibold">🗑 Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{editing ? `Editar: ${editing.label}` : "Novo Plano"}</h2>
          <form onSubmit={savePlan}>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Nome (código) *</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="BASIC" disabled={!!editing} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Label *</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500" required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Plano Básico" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Ordem</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Preço Mensal (R$)</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" type="number" step="0.01" min="0" value={form.monthlyPrice ?? 0} onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: Number(e.target.value) }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Preço Anual (R$)</label><input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none" type="number" step="0.01" min="0" value={form.annualPrice ?? 0} onChange={(e) => setForm((f) => ({ ...f, annualPrice: Number(e.target.value) }))} /></div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-1.5 text-gray-500 text-xs"><input type="checkbox" checked={form.hasDashboard ?? true} onChange={() => setForm((f) => ({ ...f, hasDashboard: !f.hasDashboard }))} /> Dashboard</label>
                <label className="flex items-center gap-1.5 text-gray-500 text-xs"><input type="checkbox" checked={form.hasLandingPage ?? false} onChange={() => setForm((f) => ({ ...f, hasLandingPage: !f.hasLandingPage }))} /> Landing</label>
                <label className="flex items-center gap-1.5 text-gray-500 text-xs"><input type="checkbox" checked={form.isActive ?? true} onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} /> Ativo</label>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Menus da Dashboard</label>
              <div className="flex flex-wrap gap-2">
                {MENU_FIELDS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                    <input type="checkbox" checked={!!form[key as keyof typeof form]} onChange={() => toggleMenu(key)} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={saving} className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition disabled:opacity-50">{saving ? "Salvando…" : "Salvar plano"}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm()); }} className="rounded-lg px-4 py-2 text-sm text-gray-500 border border-gray-300 hover:bg-gray-50 transition">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Tag({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-500 border-red-200"}`}>{children}</span>;
}
