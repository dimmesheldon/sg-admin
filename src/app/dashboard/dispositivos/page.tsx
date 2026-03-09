"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";

interface Device { id: string; deviceName: string; deviceType: string; lastActiveAt: string | null; isAuthorized: boolean; }

export default function DispositivosPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ devices: Device[] }>("/api/admin/devices");
      setDevices(data.devices || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Dispositivos</h1>
      <p className="text-sm text-gray-500 mb-6">Dispositivos autorizados</p>

      {loading ? (
        <div className="h-20 rounded-lg bg-gray-100 animate-pulse" />
      ) : devices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📱</p>
          <p>Nenhum dispositivo registrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id} className="rounded-xl bg-white border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{d.deviceName}</p>
                <p className="text-xs text-gray-400">{d.deviceType} · Último acesso: {d.lastActiveAt ? new Date(d.lastActiveAt).toLocaleString("pt-BR") : "Nunca"}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${d.isAuthorized ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {d.isAuthorized ? "Autorizado" : "Bloqueado"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
