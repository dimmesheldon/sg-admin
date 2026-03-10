"use client";
import { useEffect, useState } from "react";

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

interface Plan {
  id: string;
  name: string;
  label: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string;
  hasDashboard: boolean;
  hasLandingPage: boolean;
  menuVisaoGeral: boolean;
  menuCongregacoes: boolean;
  menuMembros: boolean;
  menuFinancas: boolean;
  menuRelatorios: boolean;
  menuDirigentes: boolean;
  menuSecretaria: boolean;
  menuMissionarios: boolean;
  menuEventos: boolean;
  menuPermissoes: boolean;
  menuNoticias: boolean;
  menuIgreja: boolean;
  menuEBD: boolean;
  isActive: boolean;
  sortOrder: number;
}

const MENU_FIELDS: { key: keyof Plan; label: string }[] = [
  { key: "menuVisaoGeral", label: "Visão Geral" },
  { key: "menuCongregacoes", label: "Congregações" },
  { key: "menuMembros", label: "Membros" },
  { key: "menuFinancas", label: "Finanças" },
  { key: "menuRelatorios", label: "Relatórios" },
  { key: "menuDirigentes", label: "Dirigentes" },
  { key: "menuSecretaria", label: "Secretaria" },
  { key: "menuMissionarios", label: "Missionários" },
  { key: "menuEventos", label: "Eventos" },
  { key: "menuPermissoes", label: "Permissões" },
  { key: "menuNoticias", label: "Notícias" },
  { key: "menuIgreja", label: "Igreja" },
  { key: "menuEBD", label: "EBD" },
];

const emptyForm = (): Partial<Plan> & { name: string; label: string } => ({
  name: "",
  label: "",
  monthlyPrice: 0,
  annualPrice: 0,
  features: "[]",
  hasDashboard: true,
  hasLandingPage: false,
  menuVisaoGeral: true,
  menuCongregacoes: true,
  menuMembros: true,
  menuFinancas: true,
  menuRelatorios: true,
  menuDirigentes: true,
  menuSecretaria: false,
  menuMissionarios: false,
  menuEventos: false,
  menuPermissoes: false,
  menuNoticias: false,
  menuIgreja: false,
  menuEBD: false,
  isActive: true,
  sortOrder: 0,
});

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [seeding, setSeeding] = useState(false);

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await fetchApi("/api/admin/plans");

      if (data.ok) setPlans(data.plans);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadPlans(); }, []);

  function startEdit(plan: Plan) {
    setEditing(plan);
    setForm({ ...plan });
    setMsg("");
  }

  function startNew() {
    setEditing(null);
    setForm(emptyForm());
    setMsg("");
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const data = await fetchApi("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (data.ok) {
        setMsg("✅ Plano salvo!");
        loadPlans();
        setEditing(null);
        setForm(emptyForm());
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch { setMsg("❌ Erro de rede"); }
    setSaving(false);
  }

  async function deletePlan(id: string) {
    if (!confirm("Excluir este plano?")) return;
    try {
      const data = await fetchApi(`/api/admin/plans/${id}`, { method: "DELETE" });

      if (data.ok) {
        setMsg("✅ Plano excluído");
        loadPlans();
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch { setMsg("❌ Erro de rede"); }
  }

  async function seedPlans() {
    setSeeding(true);
    try {
      const data = await fetchApi("/api/admin/plans/seed", { method: "POST" });

      if (data.ok) {
        setMsg(`✅ ${data.message}`);
        loadPlans();
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch { setMsg("❌ Erro de rede"); }
    setSeeding(false);
  }

  const toggleMenu = (key: keyof Plan) => {
    setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }));
  };

  if (loading) return <div style={{ color: "#64748b" }}>Carregando planos…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>📋 Planos</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {plans.length === 0 && (
            <button onClick={seedPlans} disabled={seeding} style={btnPurple}>
              {seeding ? "Criando…" : "🌱 Criar planos padrão"}
            </button>
          )}
          <button onClick={startNew} style={btnBlue}>+ Novo plano</button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, fontSize: 13, color: msg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{msg}</div>}

      {/* Cards dos planos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 24 }}>
        {plans.map((p) => (
          <div key={p.id} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 20, position: "relative" }}>
            {!p.isActive && <div style={{ position: "absolute", top: 8, right: 8, background: "#7f1d1d", color: "#fca5a5", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>INATIVO</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{p.name === "BASIC" ? "🥉" : p.name === "PRO" ? "🥈" : "🥇"}</span>
              <div>
                <div style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700 }}>{p.label}</div>
                <div style={{ color: "#64748b", fontSize: 11 }}>{p.name}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <div>
                <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>Mensal</div>
                <div style={{ color: "#4ade80", fontSize: 18, fontWeight: 700 }}>R$ {p.monthlyPrice.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>Anual</div>
                <div style={{ color: "#60a5fa", fontSize: 18, fontWeight: 700 }}>R$ {p.annualPrice.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Acesso</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Tag active={p.hasDashboard}>Dashboard</Tag>
                <Tag active={p.hasLandingPage}>Landing Page</Tag>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Menus</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {MENU_FIELDS.map(({ key, label }) => (
                  <Tag key={key} active={p[key] as boolean}>{label}</Tag>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button onClick={() => startEdit(p)} style={{ padding: "4px 12px", background: "#1e40af22", color: "#60a5fa", border: "1px solid #1e40af", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                ✏️ Editar
              </button>
              <button onClick={() => deletePlan(p.id)} style={{ padding: "4px 12px", background: "#7f1d1d22", color: "#f87171", border: "1px solid #7f1d1d", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                🗑 Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulário de edição/criação */}
      {(editing !== null || form.name !== "" || plans.length === 0) && form.label !== undefined && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 20 }}>
          <h2 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            {editing ? `Editar: ${editing.label}` : "Novo Plano"}
          </h2>
          <form onSubmit={savePlan}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Nome (código) *</label>
                <input style={inp} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="BASIC" disabled={!!editing} />
              </div>
              <div>
                <label style={lbl}>Label (exibição) *</label>
                <input style={inp} required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Plano Básico" />
              </div>
              <div>
                <label style={lbl}>Ordem</label>
                <input style={inp} type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={lbl}>Preço Mensal (R$)</label>
                <input style={inp} type="number" step="0.01" min="0" value={form.monthlyPrice ?? 0} onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={lbl}>Preço Anual (R$)</label>
                <input style={inp} type="number" step="0.01" min="0" value={form.annualPrice ?? 0} onChange={(e) => setForm((f) => ({ ...f, annualPrice: Number(e.target.value) }))} />
              </div>
              <div style={{ display: "flex", alignItems: "end", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}>
                  <input type="checkbox" checked={form.hasDashboard ?? true} onChange={() => setForm((f) => ({ ...f, hasDashboard: !f.hasDashboard }))} /> Dashboard
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}>
                  <input type="checkbox" checked={form.hasLandingPage ?? false} onChange={() => setForm((f) => ({ ...f, hasLandingPage: !f.hasLandingPage }))} /> Landing Page
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}>
                  <input type="checkbox" checked={form.isActive ?? true} onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} /> Ativo
                </label>
              </div>
            </div>

            {/* Menus */}
            <div style={{ marginTop: 16 }}>
              <label style={lbl}>Menus da Dashboard</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {MENU_FIELDS.map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 5, color: "#94a3b8", fontSize: 12, background: "#0f172a", padding: "4px 10px", borderRadius: 6, border: "1px solid #334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form[key as keyof typeof form]} onChange={() => toggleMenu(key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="submit" disabled={saving} style={btnBlue}>{saving ? "Salvando…" : "Salvar plano"}</button>
              <button type="button" onClick={() => { setEditing(null); setForm(emptyForm()); }} style={btnGhost}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Tag({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
      background: active ? "#065f4622" : "#7f1d1d22",
      color: active ? "#4ade80" : "#f87171",
      border: `1px solid ${active ? "#065f46" : "#7f1d1d"}`,
    }}>
      {children}
    </span>
  );
}

const btnBlue: React.CSSProperties = { padding: "8px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnPurple: React.CSSProperties = { padding: "8px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, fontSize: 13, cursor: "pointer" };
const lbl: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
const inp: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none" };
