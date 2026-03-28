"use client";
import { useEffect, useState } from "react";
import { StatsCard } from "@/components/admin/StatsCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BinGauge } from "@/components/admin/BinGauge";
import { admin, type Overview, type Kiosk } from "@/lib/api";

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);

  useEffect(() => {
    admin.overview().then(setOverview).catch(() => {});
    admin.kiosks().then(setKiosks).catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">EcoCharge system overview</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard icon="🏧" title="Kiosks Online" value={String(overview?.kiosks_online ?? "—")} subtitle="active now" />
        <StatsCard icon="🍶" title="Total Deposits" value={String(overview?.total_deposits ?? "—")} subtitle="all time" />
        <StatsCard icon="💳" title="Credits Issued" value={String(overview?.total_credits_earned ?? "—")} subtitle="minutes earned" />
        <StatsCard color="#D97706" icon="⚡" title="Active Charging" value={String(overview?.active_charging ?? "—")} subtitle="charging now" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-4">Users</h2>
          <p className="text-gray-500 text-sm">Total registered users: {overview?.total_users ?? "—"}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-4">Kiosk Status</h2>
          <div className="space-y-4">
            {kiosks.map(k => (
              <div key={k.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 text-sm font-medium">{k.name}</span>
                  <StatusBadge status={k.status} />
                </div>
                <BinGauge level={0} />
                <p className="text-gray-400 text-xs">{k.location}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
