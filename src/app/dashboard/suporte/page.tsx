"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";

interface Room { id: string; name: string; customerId: string | null; createdAt: string; }

export default function SuportePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ rooms: Room[] }>("/api/admin/chat/rooms");
      setRooms(data.rooms || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Suporte / Chat</h1>
      <p className="text-sm text-gray-500 mb-6">Salas de atendimento</p>

      {loading ? (
        <div className="h-20 rounded-lg bg-gray-100 animate-pulse" />
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">💬</p>
          <p>Nenhuma conversa de suporte ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((r) => (
            <div key={r.id} className="rounded-xl bg-white border border-gray-200 p-4">
              <p className="font-medium text-gray-800">{r.name}</p>
              <p className="text-xs text-gray-400">Criada em {new Date(r.createdAt).toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
