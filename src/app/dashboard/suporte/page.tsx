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
    try {
      const data = await api<{ ok: boolean; rooms: Room[] }>("/api/admin/chat/rooms");
      if (data.ok) setRooms(data.rooms || []);
    } catch {}
    setLoading(false);
  }

  async function loadMessages(roomId: string) {
    try {
      const data = await api<{ ok: boolean; messages: Message[] }>(`/api/admin/chat/rooms/${roomId}/messages`);
      if (data.ok) setMessages(data.messages || []);
    } catch {}
  }

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (!activeRoom) return;
    loadMessages(activeRoom.id);
    // Polling a cada 5s
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
      else setMsg(`❌ ${data.message}`);
    } catch { setMsg("❌ Erro ao enviar"); }
    setSending(false);
  }

  async function toggleRoom(room: Room) {
    const newStatus = room.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const data = await api<{ ok: boolean; message?: string }>(`/api/admin/chat/rooms/${room.id}`, { method: "PATCH", body: { status: newStatus } });
      if (data.ok) { setMsg(`✅ Chat ${newStatus === "CLOSED" ? "fechado" : "reaberto"}`); loadRooms(); if (activeRoom?.id === room.id) setActiveRoom({ ...room, status: newStatus }); }
    } catch { setMsg("❌ Erro"); }
  }

  const filtered = filterStatus === "ALL" ? rooms : rooms.filter((r) => r.status === filterStatus);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💬 Suporte / Chat</h1>
          <p className="text-sm text-gray-500">{rooms.length} conversa{rooms.length !== 1 && "s"}</p>
        </div>
        <div className="flex gap-2">
          {["ALL", "OPEN", "CLOSED"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`text-xs px-3 py-1.5 rounded-lg border transition font-semibold ${filterStatus === s ? "bg-sky-500 text-white border-sky-500" : "text-gray-500 border-gray-300 hover:bg-gray-50"}`}>
              {s === "ALL" ? "Todos" : s === "OPEN" ? "🟢 Abertos" : "🔴 Fechados"}
            </button>
          ))}
        </div>
      </div>

      {msg && <div className={`mb-3 rounded-lg p-2 text-sm border ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{msg}</div>}

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Lista de salas */}
        <div className="w-80 flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-y-auto">
          {loading ? <div className="p-4 text-gray-400 text-sm">Carregando…</div> : filtered.length === 0 ? <div className="p-4 text-gray-400 text-sm text-center">Nenhuma conversa</div> : filtered.map((room) => (
            <div key={room.id} onClick={() => openRoom(room)} className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${activeRoom?.id === room.id ? "bg-sky-50 border-l-4 border-l-sky-500" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-gray-700 truncate flex-1">{room.customer?.name || "Cliente"}</div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${room.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{room.status === "OPEN" ? "ABERTO" : "FECHADO"}</span>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{room.subject || "Sem assunto"}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between">
                <span>{new Date(room.updatedAt).toLocaleDateString("pt-BR")}</span>
                {room._count?.messages && <span className="bg-sky-100 text-sky-600 px-1.5 rounded-full font-bold">{room._count.messages}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <div>Selecione uma conversa</div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <div className="font-semibold text-gray-700">{activeRoom.customer?.name || "Cliente"}</div>
                  <div className="text-xs text-gray-400">{activeRoom.subject || "—"}</div>
                </div>
                <button onClick={() => toggleRoom(activeRoom)} className={`text-xs border rounded-lg px-3 py-1 font-semibold ${activeRoom.status === "OPEN" ? "text-red-500 border-red-300 hover:bg-red-50" : "text-green-600 border-green-300 hover:bg-green-50"}`}>
                  {activeRoom.status === "OPEN" ? "🔒 Fechar chat" : "🔓 Reabrir chat"}
                </button>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8">Nenhuma mensagem ainda</div>
                ) : messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderType === "ADMIN" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2 ${m.senderType === "ADMIN" ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-700"}`}>
                      <div className="text-[10px] font-semibold opacity-70 mb-0.5">{m.senderName}</div>
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                      <div className={`text-[9px] mt-1 ${m.senderType === "ADMIN" ? "text-sky-200" : "text-gray-400"}`}>{new Date(m.createdAt).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              {/* Input */}
              {activeRoom.status === "OPEN" ? (
                <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-100 flex gap-2">
                  <input className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500" placeholder="Digite uma mensagem…" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} />
                  <button type="submit" disabled={sending || !newMsg.trim()} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition disabled:opacity-50">{sending ? "…" : "Enviar"}</button>
                </form>
              ) : (
                <div className="px-4 py-3 border-t border-gray-100 text-center text-xs text-gray-400">Este chat está fechado. Reabra para enviar mensagens.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
