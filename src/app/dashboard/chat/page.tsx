"use client";
import { useEffect, useState, useRef, useCallback } from "react";

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

interface ChatRoom {
  id: string;
  customerId: string;
  customer: { id: string; name: string; slug: string };
  subject: string | null;
  status: string;
  unreadAdmin: number;
  updatedAt: string;
}

interface ChatMsg {
  id: string;
  from: string;
  content: string;
  senderName: string | null;
  createdAt: string;
}

interface CustomerMin { id: string; name: string; slug: string }

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sseStatus, setSseStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [showNewChat, setShowNewChat] = useState(false);
  const [customers, setCustomers] = useState<CustomerMin[]>([]);
  const [newChatForm, setNewChatForm] = useState({ customerId: "", subject: "" });
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRoomRef = useRef<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => { activeRoomRef.current = activeRoom?.id ?? null; }, [activeRoom]);

  const loadRooms = useCallback(async () => {
    try {
      const data = await fetchApi("/api/admin/chat/rooms");

      if (data.ok) setRooms(data.rooms);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const data = await fetchApi(`/api/admin/chat/rooms/${roomId}/messages`);

      if (data.ok) setMessages(data.messages);
    } catch (e) { console.error(e); }
  }, []);

  // SSE — recebe eventos em tempo real
  useEffect(() => {
    const sse = new EventSource(`${API_BASE}/api/admin/chat/stream`);
    sseRef.current = sse;
    sse.addEventListener("connected", () => setSseStatus("connected"));

    sse.addEventListener("new-message", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.roomId === activeRoomRef.current && data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
        loadRooms();
      } catch { /* ignore */ }
    });

    sse.addEventListener("new-room", () => loadRooms());
    sse.addEventListener("room-closed", () => loadRooms());
    sse.addEventListener("room-reopened", () => loadRooms());
    sse.onerror = () => setSseStatus("disconnected");

    return () => { sse.close(); sseRef.current = null; };
  }, [loadRooms]);

  useEffect(() => { if (activeRoom) loadMessages(activeRoom.id); }, [activeRoom, loadMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ---- Ações ---- */
  async function loadCustomers() {
    try {
      const data = await fetchApi("/api/admin/customers");

      if (data.ok) setCustomers(data.customers.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })));
    } catch { /* ignore */ }
  }

  async function createNewChat(e: React.FormEvent) {
    e.preventDefault();
    if (!newChatForm.customerId) return;
    setSending(true);
    try {
      const data = await fetchApi("/api/admin/chat/rooms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChatForm),
      });
      if (data.ok) {
        setActiveRoom(data.room);
        setShowNewChat(false);
        setNewChatForm({ customerId: "", subject: "" });
        loadRooms();
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  async function changeRoomStatus(roomId: string, status: "OPEN" | "CLOSED") {
    try {
      await fetchApi(`/api/admin/chat/rooms/${roomId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadRooms();
      if (activeRoom?.id === roomId) setActiveRoom((r) => r ? { ...r, status } : r);
    } catch { /* ignore */ }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activeRoom) return;
    setSending(true);
    try {
      const data = await fetchApi(`/api/admin/chat/rooms/${activeRoom.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (data.ok) { setMessages((prev) => [...prev, data.message]); setText(""); }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  const openRooms = rooms.filter((r) => r.status === "OPEN");
  const closedRooms = rooms.filter((r) => r.status === "CLOSED");

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", gap: 0 }}>
      {/* ===== SIDEBAR ===== */}
      <div style={{ width: 290, borderRight: "1px solid #334155", display: "flex", flexDirection: "column", flexShrink: 0, background: "#1e293b" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 700 }}>💬 Chats</h2>
            <span
              title={sseStatus === "connected" ? "SSE ativo" : sseStatus === "connecting" ? "Conectando…" : "Reconectando…"}
              style={{ width: 8, height: 8, borderRadius: "50%", background: sseStatus === "connected" ? "#22c55e" : sseStatus === "connecting" ? "#f59e0b" : "#ef4444" }}
            />
          </div>
          <button
            onClick={() => { setShowNewChat(true); loadCustomers(); }}
            style={{ padding: "4px 10px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >+ Novo</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 16, color: "#64748b", fontSize: 13 }}>Carregando…</div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: 20, color: "#64748b", fontSize: 13, textAlign: "center" }}>
              Nenhum chat ainda.<br /><span style={{ fontSize: 12 }}>Clique em &quot;+ Novo&quot; para iniciar.</span>
            </div>
          ) : (
            <>
              {openRooms.length > 0 && (
                <div style={sectionLabel}>Abertos ({openRooms.length})</div>
              )}
              {openRooms.map((room) => (
                <RoomItem key={room.id} room={room} isActive={activeRoom?.id === room.id} onClick={() => { setActiveRoom(room); setShowNewChat(false); }} />
              ))}
              {closedRooms.length > 0 && (
                <div style={{ ...sectionLabel, paddingTop: 12, color: "#475569" }}>Fechados ({closedRooms.length})</div>
              )}
              {closedRooms.map((room) => (
                <RoomItem key={room.id} room={room} isActive={activeRoom?.id === room.id} onClick={() => { setActiveRoom(room); setShowNewChat(false); }} dimmed />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ===== ÁREA PRINCIPAL ===== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {showNewChat ? (
          /* --- Formulário novo chat --- */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <form onSubmit={createNewChat} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 28, width: 360 }}>
              <h3 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Novo chat</h3>
              <label style={labelStyle}>Cliente *</label>
              <select style={inputStyle} required value={newChatForm.customerId} onChange={(e) => setNewChatForm((f) => ({ ...f, customerId: e.target.value }))}>
                <option value="">Selecione…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>)}
              </select>
              <label style={{ ...labelStyle, marginTop: 12 }}>Assunto</label>
              <input style={inputStyle} value={newChatForm.subject} onChange={(e) => setNewChatForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Suporte, dúvida, etc." />
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" disabled={sending} style={{ ...btnPrimary, flex: 1 }}>{sending ? "Criando…" : "Iniciar chat"}</button>
                <button type="button" onClick={() => setShowNewChat(false)} style={btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        ) : !activeRoom ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14 }}>
            Selecione um chat ou crie um novo
          </div>
        ) : (
          <>
            {/* --- Header do room --- */}
            <div style={{ padding: "10px 20px", borderBottom: "1px solid #334155", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>{activeRoom.customer.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 6px",
                    background: activeRoom.status === "OPEN" ? "#16a34a22" : "#47556922",
                    color: activeRoom.status === "OPEN" ? "#4ade80" : "#64748b",
                  }}>{activeRoom.status === "OPEN" ? "ABERTO" : "FECHADO"}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>{activeRoom.subject ?? "Suporte"}</div>
              </div>
              <div>
                {activeRoom.status === "OPEN" ? (
                  <button onClick={() => changeRoomStatus(activeRoom.id, "CLOSED")} style={{ padding: "4px 12px", background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    Fechar chat
                  </button>
                ) : (
                  <button onClick={() => changeRoomStatus(activeRoom.id, "OPEN")} style={{ padding: "4px 12px", background: "#064e3b", color: "#4ade80", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    Reabrir
                  </button>
                )}
              </div>
            </div>

            {/* --- Mensagens --- */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.length === 0 && (
                <div style={{ color: "#475569", textAlign: "center", marginTop: 40, fontSize: 13 }}>Nenhuma mensagem ainda</div>
              )}
              {messages.map((msg) => {
                const isAdmin = msg.from === "admin";
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "70%", background: isAdmin ? "#1d4ed8" : "#334155", color: "#f1f5f9",
                      borderRadius: isAdmin ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      padding: "10px 14px", fontSize: 13, lineHeight: 1.5,
                    }}>
                      {msg.senderName && (
                        <div style={{ fontSize: 10, color: isAdmin ? "#93c5fd" : "#94a3b8", fontWeight: 600, marginBottom: 2 }}>{msg.senderName}</div>
                      )}
                      {msg.content}
                      <div style={{ fontSize: 9, color: isAdmin ? "#93c5fd88" : "#47556988", marginTop: 4, textAlign: "right" }}>
                        {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* --- Input / Chat fechado --- */}
            {activeRoom.status === "OPEN" ? (
              <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid #334155", background: "#1e293b" }}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva sua mensagem…"
                  style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 13, outline: "none" }} />
                <button type="submit" disabled={sending || !text.trim()}
                  style={{ padding: "10px 20px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer" }}>
                  {sending ? "…" : "Enviar"}
                </button>
              </form>
            ) : (
              <div style={{ padding: "14px 20px", borderTop: "1px solid #334155", background: "#1e293b", color: "#64748b", fontSize: 13, textAlign: "center" }}>
                Chat fechado.{" "}
                <button onClick={() => changeRoomStatus(activeRoom.id, "OPEN")} style={{ color: "#60a5fa", background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
                  Reabrir
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ===== Sub-componentes & estilos ===== */
function RoomItem({ room, isActive, onClick, dimmed }: { room: ChatRoom; isActive: boolean; onClick: () => void; dimmed?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "block", width: "100%", padding: "10px 16px", textAlign: "left",
      background: isActive ? "#334155" : "transparent", border: "none", borderBottom: "1px solid #1e293b22",
      cursor: "pointer", color: "#e2e8f0", opacity: dimmed ? 0.5 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
          {room.customer.name}
        </span>
        {room.unreadAdmin > 0 && (
          <span style={{ background: "#dc2626", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            {room.unreadAdmin}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {room.subject ?? room.customer.slug}
      </div>
      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{new Date(room.updatedAt).toLocaleString("pt-BR")}</div>
    </button>
  );
}

const sectionLabel: React.CSSProperties = { padding: "8px 16px 4px", color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" };
const labelStyle: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none" };
const btnPrimary: React.CSSProperties = { padding: "8px 20px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnSecondary: React.CSSProperties = { padding: "8px 16px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, fontSize: 13, cursor: "pointer" };
