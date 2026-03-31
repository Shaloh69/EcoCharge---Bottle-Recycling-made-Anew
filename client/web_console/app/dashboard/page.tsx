"use client";
import { useEffect, useRef, useState } from "react";

import { StatsCard } from "@/components/admin/StatsCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BinGauge } from "@/components/admin/BinGauge";
import {
  admin,
  openAdminSSE,
  type Overview,
  type Kiosk,
  type SseEvent,
  type TelemetryPort,
} from "@/lib/api";

interface KioskTelemetry {
  portData: TelemetryPort[];
  binLevel: number;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [telemetry, setTelemetry] = useState<Record<number, KioskTelemetry>>(
    {},
  );
  const [live, setLive] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    admin
      .overview()
      .then(setOverview)
      .catch(() => {});
    admin
      .kiosks()
      .then(setKiosks)
      .catch(() => {});

    closeRef.current = openAdminSSE(
      (event: SseEvent) => {
        setLive(true);
        if (event.type === "telemetry" && event.kioskId != null) {
          setTelemetry((prev) => ({
            ...prev,
            [event.kioskId!]: {
              portData: event.portData ?? [],
              binLevel: event.binLevel ?? 0,
            },
          }));
        }
        if (event.type === "overview") {
          setOverview((prev) =>
            prev
              ? {
                  ...prev,
                  kiosks_online: event.kiosks_online ?? prev.kiosks_online,
                  active_charging:
                    event.active_charging ?? prev.active_charging,
                  total_credits_earned:
                    event.total_credits_earned ?? prev.total_credits_earned,
                  total_deposits: event.total_deposits ?? prev.total_deposits,
                  total_users: event.total_users ?? prev.total_users,
                }
              : prev,
          );
        }
      },
      () => setLive(false),
    );

    return () => closeRef.current?.();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            EcoCharge system overview
          </p>
        </div>
        {live && (
          <span className="flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon="🏧"
          subtitle="active now"
          title="Kiosks Online"
          value={String(overview?.kiosks_online ?? "—")}
        />
        <StatsCard
          icon="🍶"
          subtitle="all time"
          title="Total Deposits"
          value={String(overview?.total_deposits ?? "—")}
        />
        <StatsCard
          icon="💳"
          subtitle="minutes earned"
          title="Credits Issued"
          value={String(overview?.total_credits_earned ?? "—")}
        />
        <StatsCard
          color="#D97706"
          icon="⚡"
          subtitle="charging now"
          title="Active Charging"
          value={String(overview?.active_charging ?? "—")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-gray-800 font-semibold">
            Live Kiosk Telemetry
            {live && (
              <span className="ml-2 text-xs text-green-600 font-normal">
                ● streaming
              </span>
            )}
          </h2>
          {kiosks.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-gray-400 text-sm">
              No kiosks found.
            </div>
          )}
          {kiosks.map((k) => {
            const tel = telemetry[k.id];

            return (
              <div
                key={k.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-800">{k.name}</p>
                    <p className="text-gray-400 text-xs">{k.location}</p>
                  </div>
                  <StatusBadge status={k.status} />
                </div>
                {tel ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {tel.portData.map((p) => (
                        <div key={p.port} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-500">
                              Port {p.port}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${p.relay_on ? "bg-green-500" : "bg-gray-300"}`}
                            />
                          </div>
                          <p className="text-sm font-bold text-gray-800">
                            {(p.voltage_v * p.current_a).toFixed(1)}W
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.current_a.toFixed(2)}A · {p.voltage_v.toFixed(1)}
                            V
                          </p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Bin Level</span>
                        <span>{tel.binLevel}%</span>
                      </div>
                      <BinGauge level={tel.binLevel} />
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Waiting for telemetry...
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-gray-800 font-semibold mb-3">Summary</h2>
            <p className="text-gray-500 text-sm">
              Total users:{" "}
              <span className="font-semibold text-gray-800">
                {overview?.total_users ?? "—"}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-gray-800 font-semibold mb-3">Kiosk Status</h2>
            <div className="space-y-3">
              {kiosks.map((k) => (
                <div key={k.id} className="flex items-center justify-between">
                  <span className="text-gray-700 text-sm">{k.name}</span>
                  <StatusBadge status={k.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
