"use client";
import { useEffect, useState } from "react";
import { admin, type Kiosk } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BinGauge } from "@/components/admin/BinGauge";

export default function KiosksPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  useEffect(() => { admin.kiosks().then(setKiosks).catch(() => {}); }, []);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Kiosks</h1>
      <div className="grid gap-4">
        {kiosks.map(k => (
          <div key={k.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-gray-800 font-semibold text-lg">{k.name}</h3>
                <p className="text-gray-500 text-sm">📍 {k.location}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Last seen: {k.last_seen_at ? new Date(k.last_seen_at).toLocaleString() : "Never"}
                </p>
              </div>
              <StatusBadge status={k.status} />
            </div>
            <div><BinGauge level={0} /></div>
          </div>
        ))}
        {kiosks.length === 0 && <p className="text-center text-gray-400 py-12">No kiosks found</p>}
      </div>
    </div>
  );
}
