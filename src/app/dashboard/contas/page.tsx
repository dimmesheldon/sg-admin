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

const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, outline: "none" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
const panelStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 };

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
    try { const data = await api<{ ok: boolean; accounts: BankAccount[] }>("/api/admin/bank-accounts"); if (data.ok) setAccounts(data.accounts || []); } catch {}
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

  const msgBg = msg.startsWith("✅") ? "#065f4633" : "#7f1d1d";
  const msgColor = msg.startsWith("✅") ? "#34d399" : "#fca5a5";

  if (loading) return <div style={{ color: "#64748b" }}>Carregando contas…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>🏦 Contas Bancárias</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Gerencie as contas bancárias e chaves Pix para recebimento</p>
        </div>
        <button onClick={startNew} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Nova conta</button>
      </div>

      {msg && <div style={{ background: msgBg, color: msgColor, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 20 }}>
        {accounts.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "#475569" }}>Nenhuma conta bancária cadastrada</div>
        ) : accounts.map((a) => (
          <div key={a.id} style={{ ...panelStyle, position: "relative", borderColor: a.isDefault ? "#3b82f6" : "#334155" }}>
            {a.isDefault && <div style={{ position: "absolute", top: 12, right: 12, background: "#1d4ed822", color: "#60a5fa", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>PADRÃO</div>}
            {!a.isActive && <div style={{ position: "absolute", top: 12, right: a.isDefault ? 70 : 12, background: "#7f1d1d", color: "#fca5a5", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>INATIVA</div>}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>{a.label || "Sem nome"}</div>
              <div style={{ color: "#475569", fontSize: 12 }}>{a.holderName}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 600, color: "#64748b", width: 40 }}>Pix</span>
                <span style={{ color: "#f1f5f9", fontFamily: "monospace", fontSize: 12, flex: 1 }}>{a.pixKey}</span>
                <button onClick={() => copyPix(a.pixKey)} style={{ background: "none", border: "1px solid #334155", color: "#a78bfa", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>📋</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 600, color: "#64748b", width: 40 }}>Tipo</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{PIX_TYPES.find((t) => t.value === a.pixKeyType)?.label || a.pixKeyType}</span>
              </div>
              {a.bankName && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 600, color: "#64748b", width: 40 }}>Banco</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{a.bankName} ({a.bankCode})</span>
              </div>}
              {a.agency && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 600, color: "#64748b", width: 40 }}>Ag/CC</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{a.agency} / {a.accountNumber}</span>
              </div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid #334155" }}>
              <button onClick={() => startEdit(a)} style={{ background: "none", border: "1px solid #334155", color: "#60a5fa", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>✏️ Editar</button>
              {!a.isDefault && a.isActive && <button onClick={() => setDefault(a)} style={{ background: "none", border: "1px solid #334155", color: "#fbbf24", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>⭐ Tornar padrão</button>}
              <button onClick={() => toggleActive(a)} style={{ background: "none", border: "1px solid #334155", color: a.isActive ? "#f87171" : "#34d399", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{a.isActive ? "🔴 Desativar" : "🟢 Ativar"}</button>
              <button onClick={() => deleteAccount(a.id)} style={{ background: "none", border: "1px solid #334155", color: "#f87171", borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>🗑 Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={panelStyle}>
          <h2 style={{ ...labelStyle, marginBottom: 14 }}>{editing ? `Editar: ${editing.label}` : "Nova Conta Bancária"}</h2>
          <form onSubmit={save}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Nome/Label *</label><input style={inputStyle} required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Conta Principal" /></div>
              <div><label style={labelStyle}>Titular *</label><input style={inputStyle} required value={form.holderName} onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))} placeholder="Nome completo" /></div>
              <div><label style={labelStyle}>Tipo Chave Pix</label>
                <select style={inputStyle} value={form.pixKeyType} onChange={(e) => setForm((f) => ({ ...f, pixKeyType: e.target.value }))}>
                  {PIX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Chave Pix *</label><input style={inputStyle} required value={form.pixKey} onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))} /></div>
              <div><label style={labelStyle}>Banco</label><input style={inputStyle} value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Itaú, Nubank, etc." /></div>
              <div><label style={labelStyle}>Código</label><input style={inputStyle} value={form.bankCode} onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))} placeholder="341" /></div>
              <div><label style={labelStyle}>Agência</label><input style={inputStyle} value={form.agency} onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))} /></div>
              <div><label style={labelStyle}>Conta</label><input style={inputStyle} value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}><input type="checkbox" checked={form.isDefault ?? false} onChange={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))} /> Conta padrão</label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 12 }}><input type="checkbox" checked={form.isActive ?? true} onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} /> Ativa</label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="submit" disabled={saving} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>{saving ? "Salvando…" : "Salvar conta"}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm()); }} style={{ background: "none", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
