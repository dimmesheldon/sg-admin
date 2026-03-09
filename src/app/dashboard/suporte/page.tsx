"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";

interface Room { id: string; customerId: string; subject: string; status: string; createdAt: string; updatedAt: string; customer?: { name: string }; _count?: { messages: number } }
interface Message { id: string; roomId: string; senderType: string; senderName: string; content: string; createdAt: string }

export default function SuportePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const messagesEnd = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  async function loadRooms() {
    try { const data = await api<{ ok: boolean; rooms: Room[] }>("/api/admin/chat/rooms"); if (data.ok) setRooms(data.rooms || []); } catch {}
    setLoading(false);
  }

  async function loadMessages(roomId: string) {
    try { const data = await api<{ ok: boolean; messages: Message[] }>(`/api/admin/chat/rooms/${roomId}/messages`); if (data.ok) setMessages(data.messages || []); } catch {}
  }

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => {
    if (!activeRoom) return;
    loadMessages(activeRoom.id);
    pollRef.current = setInterval(() => loadMessages(activeRoom.id), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeRoom?.id]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function openRoom(room: Room) { setActiveRoom(room); setMessages([]); }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeRoom) return;
    setSending(true);
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/chat/rooms/${activeRoom.id}/messages`, { method: "POST", body: { content: newMsg, senderType: "ADMIN", senderName: "Admin SG" } });
      if (data.ok) { setNewMsg(""); loadMessages(activeRoom.id); }
      else setMsg(`\u274c ${data.message}`);
    } catch { setMsg("\u274c Erro ao enviar"); }
    setSending(false);
  }

  async function toggleRoom(room: Room) {
    const newStatus = room.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/chat/rooms/${room.id}`, { method: "PATCH", body: { status: newStatus } });
      if (data.ok) { setMsg(`\u2705 Chat ${newStatus === "CLOSED" ? "fechado" : "reaberto"}`); loadRooms(); if (activeRoom?.id === room.id) setActiveRoom({ ...room, status: newStatus }); }
    } catch { setMsg("\u274c Erro"); }
  }

  const filtered = filterStatus === "ALL" ? rooms : rooms.filter((r) => r.status === filterStatus);
  const msgBg = msg.startsWith("\u2705") ? "#065f4633" : "#7f1d1d";
  const msgColor = msg.startsWith("\u2705") ? "#34d399" : "#fca5a5";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>\ud83d\udcac Suporte / Chat</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>{rooms.length} conversa{rooms.length !== 1 && "s"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["ALL", "OPEN", "CLOSED"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid", fontWeight: 600, cursor: "pointer", background: filterStatus === s ? "#3b82f6" : "none", color: filterStatus === s ? "#fff" : "#94a3b8", borderColor: filterStatus === s ? "#3b82f6" : "#334155" }}>
              {s === "ALL" ? "Todos" : s === "OPEN" ? "\ud83d\udfe2 Abertos" : "\ud83d\udd34 Fechados"}
            </button>
          ))}
        </div>
      </div>

      {msg && <div style={{ background: msgBg, color: msgColor, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "flex", flex: 1, gap: 14, minHeight: 0 }}>
        {/* Lista de salas */}
        <div style={{ width: 280, flexShrink: 0, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflowY: "auto" }}>
          {loading ? <div style={{ padding: 16, color: "#64748b", fontSize: 13 }}>Carregando\u2026</div> : filtered.length === 0 ? <div style={{ padding: 16, color: "#475569", fontSize: 13, textAlign: "center" }}>Nenhuma conversa</div> : filtered.map((room) => (
            <div key={room.id} onClick={() => openRoom(room)} style={{ padding: "12px 16px", borderBottom: "1px solid #334155", cursor: "pointer", transition: "all 0.15s", background: activeRoom?.id === room.id ? "#1d4ed822" : "transparent", borderLeft: activeRoom?.id === room.id ? "3px solid #3b82f6" : "3px solid transparent" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{room.customer?.name || "Cliente"}</div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: room.status === "OPEN" ? "#065f4633" : "#1e293b", color: room.status === "OPEN" ? "#34d399" : "#64748b" }}>{room.status === "OPEN" ? "ABERTO" : "FECHADO"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{room.subject || "Sem assunto"}</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2, display: "flex", justifyContent: "space-between" }}>
                <span>{new Date(room.updatedAt).toLocaleDateString("pt-BR")}</span>
                {room._count?.messages && <span style={{ background: "#1d4ed822", color: "#60a5fa", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>{room._count.messages}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
          {!activeRoom ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>\ud83d\udcac</div>
                <div>Selecione uma conversa</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f172a" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{activeRoom.customer?.name || "Cliente"}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{activeRoom.subject || "\u2014"}</div>
                </div>
                <button onClick={() => toggleRoom(activeRoom)} style={{ background: "none", border: "1px solid #334155", color: activeRoom.status === "OPEN" ? "#f87171" : "#34d399", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {activeRoom.status === "OPEN" ? "\ud83d\udd12 Fechar chat" : "\ud83d\udd13 Reabrir chat"}
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: 30 }}>Nenhuma mensagem ainda</div>
                ) : messages.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: m.senderType === "ADMIN" ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "70%", borderRadius: 12, padding: "8px 14px", background: m.senderType === "ADMIN" ? "#3b82f6" : "#0f172a", color: m.senderType === "ADMIN" ? "#fff" : "#f1f5f9" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, marginBottom: 2 }}>{m.senderName}</div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{m.content}</div>
                      <div style={{ fontSize: 9, marginTop: 4, color: m.senderType === "ADMIN" ? "#93c5fd" : "#475569" }}>{new Date(m.createdAt).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              {activeRoom.status === "OPEN" ? (
                <form onSubmit={sendMessage} style={{ padding: "12px 16px", borderTop: "1px solid #334155", display: "flex", gap: 8 }}>
                  <input style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, outline: "none" }} placeholder="Digite uma mensagem\u2026" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} />
                  <button type="submit" disabled={sending || !newMsg.trim()} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (sending || !newMsg.trim()) ? 0.5 : 1 }}>{sending ? "\u2026" : "Enviar"}</button>
                </form>
              ) : (
                <div style={{ padding: "12px 16px", borderTop: "1px solid #334155", textAlign: "center", fontSize: 12, color: "#475569" }}>Este chat est\u00e1 fechado. Reabra para enviar mensagens.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
