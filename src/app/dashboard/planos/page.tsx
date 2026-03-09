"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  label: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string;
  isActive: boolean;
  sortOrder: number;
}

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", label: "", monthlyPrice: 0, annualPrice: 0, features: "", isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ plans: Plan[] }>("/api/admin/plans");
      setPlans(data.plans || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/admin/plans", form);
      setShowModal(false);
      load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planos</h1>
          <p className="text-sm text-gray-500">Configure os planos de assinatura</p>
        </div>
        <button onClick={() => { setForm({ name: "", label: "", monthlyPrice: 0, annualPrice: 0, features: "", isActive: true, sortOrder: 0 }); setShowModal(true); }}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition">
          + Novo Plano
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>Nenhum plano cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className={`rounded-xl border p-5 ${p.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">{p.label}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                  {p.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="text-2xl font-bold text-sky-600">R$ {p.monthlyPrice.toFixed(2)}<span className="text-sm font-normal text-gray-400">/mês</span></p>
              <p className="text-sm text-gray-500 mt-1">Anual: R$ {p.annualPrice.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-3 line-clamp-2">{p.features}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSave} className="w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Novo Plano</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome (ex: PRO)" required
                className="block w-full rounded-lg border px-3 py-2 text-sm" />
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (ex: Plano Profissional)" required
                className="block w-full rounded-lg border px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: +e.target.value })} placeholder="Preço mensal"
                  className="block w-full rounded-lg border px-3 py-2 text-sm" />
                <input type="number" step="0.01" value={form.annualPrice} onChange={(e) => setForm({ ...form, annualPrice: +e.target.value })} placeholder="Preço anual"
                  className="block w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Features (separadas por vírgula)" rows={3}
                className="block w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50">
                {saving ? "Salvando..." : "Criar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
