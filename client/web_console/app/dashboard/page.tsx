"use client";
import { useEffect, useRef, useState } from "react";

import { addToast } from "@/lib/toast";
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
      .catch(() =>
        addToast({ title: "Failed to load overview", color: "danger" }),
      );
    admin
      .kiosks()
      .then(setKiosks)
      .catch(() =>
        addToast({ title: "Failed to load kiosks", color: "danger" }),
      );
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
      () => {
        setLive(false);
        addToast({
          title: "Live feed disconnected",
          description: "Attempting to reconnect…",
          color: "warning",
        });
      },
    );

    return () => closeRef.current?.();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            Dashboard
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            EcoCharge system overview
          </p>
        </div>
        {live ? (
          <span
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(74,222,128,0.12)",
              color: "#4ADE80",
              border: "1px solid rgba(74,222,128,0.25)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
            LIVE
          </span>
        ) : (
          <span
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(148,163,184,0.10)",
              color: "rgba(255,255,255,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Connecting…
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          accent="#14B8A6"
          icon="🏧"
          subtitle="active now"
          title="Kiosks Online"
          value={overview?.kiosks_online ?? "—"}
        />
        <StatsCard
          accent="#0EA5E9"
          icon="🍶"
          subtitle="all time"
          title="Total Deposits"
          value={overview?.total_deposits ?? "—"}
        />
        <StatsCard
          accent="#84CC16"
          icon="💳"
          subtitle="minutes earned"
          title="Credits Issued"
          value={overview?.total_credits_earned ?? "—"}
        />
        <StatsCard
          accent="#F59E0B"
          icon="⚡"
          subtitle="charging now"
          title="Active Charging"
          value={overview?.active_charging ?? "—"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Kiosk Telemetry */}
        <div className="lg:col-span-2 space-y-4">
          <h2
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "rgba(255,255,255,0.70)" }}
          >
            Live Kiosk Telemetry
            {live && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(74,222,128,0.12)",
                  color: "#4ADE80",
                }}
              >
                ● streaming
              </span>
            )}
          </h2>
          {kiosks.length === 0 && (
            <div
              className="rounded-2xl p-8 text-center text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              No kiosks found.
            </div>
          )}
          {kiosks.map((k) => {
            const tel = telemetry[k.id];

            return (
              <div
                key={k.id}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p
                      className="font-bold text-base"
                      style={{ color: "rgba(255,255,255,0.88)" }}
                    >
                      {k.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      📍 {k.location}
                    </p>
                  </div>
                  <StatusBadge status={k.status} />
                </div>
                {tel ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {tel.portData.map((p) => (
                        <div
                          key={p.port}
                          className="rounded-xl p-3"
                          style={{
                            background: p.relay_on
                              ? "rgba(74,222,128,0.08)"
                              : "rgba(255,255,255,0.04)",
                            border: `1px solid ${p.relay_on ? "rgba(74,222,128,0.20)" : "rgba(255,255,255,0.07)"}`,
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="text-[10px] font-semibold uppercase"
                              style={{ color: "rgba(255,255,255,0.40)" }}
                            >
                              Port {p.port}
                            </span>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: p.relay_on
                                  ? "#4ADE80"
                                  : "rgba(255,255,255,0.20)",
                              }}
                            />
                          </div>
                          <p
                            className="text-base font-bold"
                            style={{
                              color: p.relay_on
                                ? "#4ADE80"
                                : "rgba(255,255,255,0.65)",
                            }}
                          >
                            {(p.voltage_v * p.current_a).toFixed(1)}W
                          </p>
                          <p
                            className="text-[10px] mt-0.5"
                            style={{ color: "rgba(255,255,255,0.30)" }}
                          >
                            {p.current_a.toFixed(2)}A · {p.voltage_v.toFixed(1)}
                            V
                          </p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div
                        className="flex justify-between text-[10px] mb-1.5"
                        style={{ color: "rgba(255,255,255,0.38)" }}
                      >
                        <span>Bin Level</span>
                        <span>{tel.binLevel}%</span>
                      </div>
                      <BinGauge level={tel.binLevel} />
                    </div>
                  </>
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.28)" }}
                  >
                    Waiting for telemetry…
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              Summary
            </h2>
            <div className="space-y-3">
              {[
                {
                  label: "Total Users",
                  value: overview?.total_users ?? "—",
                  color: "#A855F7",
                },
                {
                  label: "Total Deposits",
                  value: overview?.total_deposits ?? "—",
                  color: "#0EA5E9",
                },
                {
                  label: "Credits Earned",
                  value: overview?.total_credits_earned ?? "—",
                  color: "#84CC16",
                },
                {
                  label: "Active Charging",
                  value: overview?.active_charging ?? "—",
                  color: "#F59E0B",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {label}
                  </span>
                  <span className="text-sm font-bold" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              Kiosk Status
            </h2>
            <div className="space-y-3">
              {kiosks.map((k) => (
                <div key={k.id} className="flex items-center justify-between">
                  <span
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {k.name}
                  </span>
                  <StatusBadge status={k.status} />
                </div>
              ))}
              {kiosks.length === 0 && (
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  No kiosks
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
