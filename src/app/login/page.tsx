"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
  const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, outline: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ width: 360, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36 }}>⛪</div>
          <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, marginTop: 8 }}>SG Admin</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Painel de controle</p>
        </div>

        {error && (
          <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="admin@email.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Senha</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "10px 0", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
