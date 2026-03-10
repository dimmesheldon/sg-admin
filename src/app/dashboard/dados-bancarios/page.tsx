"use client";
import { useEffect, useState, useCallback } from "react";

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

interface BankAccount {
  id: string;
  label: string;
  holderName: string;
  holderDocument: string | null;
  pixKeyType: string;
  pixKey: string;
  bankName: string | null;
  bankCode: string | null;
  agency: string | null;
  accountNumber: string | null;
  accountType: string | null;
  city: string;
  isDefault: boolean;
  isActive: boolean;
  notes: string | null;
}

const EMPTY_FORM = {
  id: "",
  label: "",
  holderName: "",
  holderDocument: "",
  pixKeyType: "EMAIL",
  pixKey: "",
  bankName: "",
  bankCode: "",
  agency: "",
  accountNumber: "",
  accountType: "",
  city: "SAO PAULO",
  isDefault: false,
  isActive: true,
  notes: "",
};

const PIX_KEY_TYPES = [
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Telefone" },
  { value: "RANDOM", label: "Chave aleatória" },
];

const ACCOUNT_TYPES = [
  { value: "", label: "—" },
  { value: "CORRENTE", label: "Corrente" },
  { value: "POUPANCA", label: "Poupança" },
];

export default function DadosBancariosPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/api/admin/bank-accounts");

      if (data.ok) setAccounts(data.accounts);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setMsg("");
  }

  function openEdit(acc: BankAccount) {
    setForm({
      id: acc.id,
      label: acc.label,
      holderName: acc.holderName,
      holderDocument: acc.holderDocument ?? "",
      pixKeyType: acc.pixKeyType,
      pixKey: acc.pixKey,
      bankName: acc.bankName ?? "",
      bankCode: acc.bankCode ?? "",
      agency: acc.agency ?? "",
      accountNumber: acc.accountNumber ?? "",
      accountType: acc.accountType ?? "",
      city: acc.city,
      isDefault: acc.isDefault,
      isActive: acc.isActive,
      notes: acc.notes ?? "",
    });
    setShowForm(true);
    setMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload: any = { ...form };
      if (!payload.id) delete payload.id;
      const data = await fetchApi("/api/admin/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (data.ok) {
        setMsg("✅ Conta salva com sucesso!");
        setShowForm(false);
        load();
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch {
      setMsg("❌ Erro de rede");
    }
    setSaving(false);
  }

  async function handleDelete(acc: BankAccount) {
    if (!confirm(`Excluir a conta "${acc.label}"?`)) return;
    try {
      const data = await fetchApi(`/api/admin/bank-accounts/${acc.id}`, { method: "DELETE" });

      if (data.ok) {
        setMsg("✅ Conta excluída");
        load();
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch {
      setMsg("❌ Erro de rede");
    }
  }

  async function setAsDefault(acc: BankAccount) {
    try {
      const data = await fetchApi("/api/admin/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acc.id, label: acc.label, holderName: acc.holderName, pixKeyType: acc.pixKeyType, pixKey: acc.pixKey, city: acc.city, isDefault: true }),
      });
      if (data.ok) {
        setMsg("✅ Conta definida como padrão");
        load();
      }
    } catch {}
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>🏦 Dados Bancários</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            Gerencie as contas bancárias para geração de QR Code Pix nas faturas dos clientes
          </p>
        </div>
        <button onClick={openNew} style={primaryBtnStyle}>+ Nova conta</button>
      </div>

      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.startsWith("✅") ? "#064e3b" : "#7f1d1d", color: msg.startsWith("✅") ? "#4ade80" : "#fca5a5", border: `1px solid ${msg.startsWith("✅") ? "#047857" : "#991b1b"}` }}>
          {msg}
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} style={cardStyle}>
          <h2 style={sectionTitle}>{form.id ? "Editar conta" : "Nova conta bancária"}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>Rótulo *</label>
              <input style={inputStyle} required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Conta principal" />
            </div>
            <div>
              <label style={labelStyle}>Nome do titular *</label>
              <input style={inputStyle} required value={form.holderName} onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))} placeholder="DIMME S. SISTEMAS LTDA" />
            </div>
            <div>
              <label style={labelStyle}>CPF / CNPJ do titular</label>
              <input style={inputStyle} value={form.holderDocument} onChange={(e) => setForm((f) => ({ ...f, holderDocument: e.target.value }))} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label style={labelStyle}>Tipo da chave Pix *</label>
              <select style={inputStyle} required value={form.pixKeyType} onChange={(e) => setForm((f) => ({ ...f, pixKeyType: e.target.value }))}>
                {PIX_KEY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Chave Pix *</label>
              <input style={inputStyle} required value={form.pixKey} onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))} placeholder={form.pixKeyType === "EMAIL" ? "email@empresa.com" : form.pixKeyType === "CPF" ? "000.000.000-00" : form.pixKeyType === "PHONE" ? "+5511999999999" : "Chave Pix"} />
            </div>
          </div>

          {/* Dados bancários (opcionais) */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #334155" }}>
            <h3 style={{ ...sectionTitle, fontSize: 12, marginBottom: 12 }}>Dados bancários (opcional)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Banco</label>
                <input style={inputStyle} value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Nubank" />
              </div>
              <div>
                <label style={labelStyle}>Código do banco</label>
                <input style={inputStyle} value={form.bankCode} onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))} placeholder="260" />
              </div>
              <div>
                <label style={labelStyle}>Tipo de conta</label>
                <select style={inputStyle} value={form.accountType} onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}>
                  {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Agência</label>
                <input style={inputStyle} value={form.agency} onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))} placeholder="0001" />
              </div>
              <div>
                <label style={labelStyle}>Conta</label>
                <input style={inputStyle} value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} placeholder="1234567-8" />
              </div>
              <div>
                <label style={labelStyle}>Cidade (Pix)</label>
                <input style={inputStyle} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="SAO PAULO" />
              </div>
            </div>
          </div>

          {/* Opções */}
          <div style={{ marginTop: 16, display: "flex", gap: 20, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
              ⭐ Conta padrão para faturas
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Ativa
            </label>
          </div>

          <div style={{ gridColumn: "1 / -1", marginTop: 12 }}>
            <label style={labelStyle}>Observações</label>
            <textarea style={{ ...inputStyle, height: 60, resize: "vertical" }} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notas internas sobre esta conta…" />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Salvando…" : (form.id ? "Atualizar" : "Salvar")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={cancelBtnStyle}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista de contas */}
      {loading ? (
        <div style={{ color: "#64748b" }}>Carregando…</div>
      ) : accounts.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
          <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 8 }}>Nenhuma conta bancária cadastrada</div>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 20 }}>
            Cadastre seus dados bancários para que as faturas gerem QR Code Pix automaticamente.
          </div>
          <button onClick={openNew} style={primaryBtnStyle}>+ Cadastrar primeira conta</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {accounts.map((acc) => (
            <div key={acc.id} style={{ ...cardStyle, position: "relative", opacity: acc.isActive ? 1 : 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700 }}>{acc.label}</span>
                    {acc.isDefault && (
                      <span style={{ background: "#fbbf2422", color: "#fbbf24", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                        ⭐ PADRÃO
                      </span>
                    )}
                    {!acc.isActive && (
                      <span style={{ background: "#6b728022", color: "#6b7280", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                        INATIVA
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>{acc.holderName}</div>
                  {acc.holderDocument && <div style={{ color: "#64748b", fontSize: 12 }}>Doc: {acc.holderDocument}</div>}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {!acc.isDefault && (
                    <button onClick={() => setAsDefault(acc)} style={{ ...smallBtnStyle, background: "#713f1222", color: "#fbbf24", border: "1px solid #92400e" }} title="Definir como padrão">
                      ⭐
                    </button>
                  )}
                  <button onClick={() => openEdit(acc)} style={{ ...smallBtnStyle, background: "#1e40af22", color: "#60a5fa", border: "1px solid #1e40af" }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleDelete(acc)} style={{ ...smallBtnStyle, background: "#7f1d1d22", color: "#fca5a5", border: "1px solid #991b1b" }}>
                    🗑️
                  </button>
                </div>
              </div>

              {/* Info Pix */}
              <div style={{ marginTop: 14, padding: 12, background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>Tipo Pix</div>
                    <div style={{ fontSize: 13, color: "#e2e8f0" }}>{PIX_KEY_TYPES.find((t) => t.value === acc.pixKeyType)?.label ?? acc.pixKeyType}</div>
                  </div>
                  <div style={{ gridColumn: "2 / -1" }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>Chave Pix</div>
                    <div style={{ fontSize: 13, color: "#4ade80", fontFamily: "monospace" }}>{acc.pixKey}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>Cidade</div>
                    <div style={{ fontSize: 13, color: "#e2e8f0" }}>{acc.city}</div>
                  </div>
                  {acc.bankName && (
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>Banco</div>
                      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{acc.bankName}{acc.bankCode ? ` (${acc.bankCode})` : ""}</div>
                    </div>
                  )}
                  {acc.agency && (
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>Ag / Conta</div>
                      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{acc.agency}{acc.accountNumber ? ` / ${acc.accountNumber}` : ""}</div>
                    </div>
                  )}
                </div>
              </div>

              {acc.notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", fontStyle: "italic" }}>{acc.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Mercado Pago */}
      <div style={{ marginTop: 24, ...cardStyle, borderColor: "#1e40af44", background: "#1e293b88" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <span style={{ color: "#60a5fa", fontSize: 14, fontWeight: 600 }}>Integração futura — Mercado Pago</span>
        </div>
        <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
          Em breve será possível integrar com o Mercado Pago para cobranças automáticas, 
          confirmação de pagamento em tempo real e geração de Pix dinâmico. 
          Por enquanto, os QR Codes são gerados com Pix estático usando os dados cadastrados aqui.
        </p>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 20 };
const sectionTitle: React.CSSProperties = { color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none" };
const primaryBtnStyle: React.CSSProperties = { padding: "8px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const cancelBtnStyle: React.CSSProperties = { padding: "8px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, fontSize: 13, cursor: "pointer" };
const smallBtnStyle: React.CSSProperties = { padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" };
