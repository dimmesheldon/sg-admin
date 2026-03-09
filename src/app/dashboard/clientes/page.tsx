"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  slug: string;
  licenseKey: string;
  domain: string | null;
  plan: string;
  status: string;
  isEnabled: boolean;
  lastPingAt: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  TRIAL: "bg-yellow-100 text-yellow-700",
  SUSPENDED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", domain: "", plan: "BASIC", status: "TRIAL", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ customers: Customer[] }>("/api/admin/customers");
      setCustomers(data.customers || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", slug: "", domain: "", plan: "BASIC", status: "TRIAL", notes: "" });
    setError("");
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ name: c.name, slug: c.slug, domain: c.domain || "", plan: c.plan, status: c.status, notes: c.notes || "" });
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await apiPatch(`/api/admin/customers/${editId}`, form);
      } else {
        await apiPost("/api/admin/customers", form);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-500">Gerencie as igrejas cadastradas</p>
        </div>
        <button onClick={openNew} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition">
          + Novo Cliente
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🏢</p>
          <p>Nenhum cliente cadastrado ainda</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Domínio</th>
                <th className="text-left px-4 py-3 font-medium">Plano</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Último Ping</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.slug} · {c.licenseKey.slice(0, 12)}…</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.domain || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sky-100 text-sky-700 px-2.5 py-0.5 text-xs font-medium">{c.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.lastPingAt ? new Date(c.lastPingAt).toLocaleString("pt-BR") : "Nunca"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="text-sky-600 hover:text-sky-800 text-xs font-medium">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSave} className="w-full max-w-lg mx-4 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editId ? "Editar Cliente" : "Novo Cliente"}</h2>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block col-span-2">
                <span className="text-xs font-medium text-gray-600">Nome</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Slug</span>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required disabled={!!editId}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-gray-50" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Domínio</span>
                <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                  placeholder="www.exemplo.com.br" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Plano</span>
                <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 outline-none">
                  <option>BASIC</option>
                  <option>PRO</option>
                  <option>PREMIUM</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 outline-none">
                  <option>TRIAL</option>
                  <option>ACTIVE</option>
                  <option>SUSPENDED</option>
                  <option>CANCELLED</option>
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-xs font-medium text-gray-600">Observações</span>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition disabled:opacity-50">
                {saving ? "Salvando..." : editId ? "Salvar" : "Criar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
