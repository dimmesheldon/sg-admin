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

const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, outline: "none" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
const panelStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 };

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

  const msgBg = msg.startsWith("✅") ? "#065f4633" : "#7f1d1d";
  const msgColor = msg.startsWith("✅") ? "#34d399" : "#fca5a5";

  if (loading) return <div style={{ color: "#64748b" }}>Carregando planos…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>📋 Planos</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Gerencie os planos disponíveis para os clientes</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {plans.length === 0 && <button onClick={seedPlans} disabled={seeding} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: seeding ? 0.5 : 1 }}>{seeding ? "Criando…" : "🌱 Criar planos padrão"}</button>}
          <button onClick={startNew} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Novo plano</button>
        </div>
      </div>

      {msg && <div style={{ background: msgBg, color: msgColor, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{msg}</div>}

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 20 }}>
        {plans.map((p) => (
          <div key={p.id} style={{ ...panelStyle, position: "relative" }}>
            {!p.isActive && <div style={{ position: "absolute", top: 12, right: 12, background: "#7f1d1d", color: "#fca5a5", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>INATIVO</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{p.name === "BASIC" ? "🥉" : p.name === "PRO" ? "🥈" : "🥇"}</span>
              <div>
                <div style={{ color: "#f1f5f9", fontWeight: 700 }}>{p.label}</div>
                <div style={{ color: "#475569", fontSize: 11 }}>{p.name}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Mensal</div>
                <div style={{ color: "#34d399", fontSize: 18, fontWeight: 700 }}>R$ {p.monthlyPrice.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Anual</div>
                <div style={{ color: "#60a5fa", fontSize: 18, fontWeight: 700 }}>R$ {p.annualPrice.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Acesso</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <Tag active={p.hasDashboard}>Dashboard</Tag>
                <Tag active={p.hasLandingPage}>Landing Page</Tag>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Menus</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {MENU_FIELDS.map(({ key, label }) => <Tag key={key} active={p[key] as boolean}>{label}</Tag>)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => startEdit(p)} style={{ background: "none", border: "1px solid #334155", color: "#60a5fa", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️ Editar</button>
              <button onClick={() => deletePlan(p.id)} style={{ background: "none", border: "1px solid #334155", color: "#f87171", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🗑 Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulário */}
      {showForm && (
        <div style={panelStyle}>
          <h2 style={{ ...labelStyle, marginBottom: 14 }}>{editing ? `Editar: ${editing.label}` : "Novo Plano"}</h2>
          <form onSubmit={savePlan}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Nome (código) *</label><input style={inputStyle} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="BASIC" disabled={!!editing} /></div>
              <div><label style={labelStyle}>Label *</label><input style={inputStyle} required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Plano Básico" /></div>
              <div><label style={labelStyle}>Ordem</label><input style={inputStyle} type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} /></div>
              <div><label style={labelStyle}>Preço Mensal (R$)</label><input style={inputStyle} type="number" step="0.01" min="0" value={form.monthlyPrice ?? 0} onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: Number(e.target.value) }))} /></div>
              <div><label style={labelStyle}>Preço Anual (R$)</label><input style={inputStyle} type="number" step="0.01" min="0" value={form.annualPrice ?? 0} onChange={(e) => setForm((f) => ({ ...f, annualPrice: Number(e.target.value) }))} /></div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}><input type="checkbox" checked={form.hasDashboard ?? true} onChange={() => setForm((f) => ({ ...f, hasDashboard: !f.hasDashboard }))} /> Dashboard</label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}><input type="checkbox" checked={form.hasLandingPage ?? false} onChange={() => setForm((f) => ({ ...f, hasLandingPage: !f.hasLandingPage }))} /> Landing</label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}><input type="checkbox" checked={form.isActive ?? true} onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} /> Ativo</label>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Menus da Dashboard</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {MENU_FIELDS.map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", background: "#0f172a", padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form[key as keyof typeof form]} onChange={() => toggleMenu(key)} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="submit" disabled={saving} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Salvando…" : "Salvar plano"}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm()); }} style={{ background: "none", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Tag({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: "1px solid", background: active ? "#065f4633" : "#7f1d1d33", color: active ? "#34d399" : "#f87171", borderColor: active ? "#065f4644" : "#7f1d1d44" }}>
      {children}
    </span>
  );
}
