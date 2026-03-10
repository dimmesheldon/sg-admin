"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: 360, background: "#1e293b", borderRadius: 12, padding: "36px 32px", border: "1px solid #334155" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⛪</div>
          <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700 }}>Sysge Admin</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Painel de controle</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
            placeholder="sgadmin@sysge.com.br"
          />

          <label style={{ ...labelStyle, marginTop: 16 }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={inputStyle}
            placeholder="••••••••"
          />

          {error && (
            <div style={{ background: "#450a0a", color: "#fca5a5", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 20,
              width: "100%",
              padding: "11px 0",
              background: loading ? "#334155" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 6,
  padding: "9px 12px",
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
};
