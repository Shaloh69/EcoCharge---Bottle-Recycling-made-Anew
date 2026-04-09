"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { charging, openKioskSSE, type ChargingSession } from "@/lib/api";

const KIOSK_ID = parseInt(process.env.NEXT_PUBLIC_KIOSK_ID ?? "1");

const PORT_TYPES: Record<number, string> = {
  1: "USB-A",
  2: "USB-C",
  3: "USB-A",
  4: "USB-C",
};

export default function ChargingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [activePorts, setActivePorts] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef<(() => void) | null>(null);

  const deposit =
    typeof window !== "undefined"
      ? JSON.parse(sessionStorage.getItem("lastDeposit") ?? "{}")
      : {};

  useEffect(() => {
    charging
      .active()
      .then((sessions: ChargingSession[]) => {
        setActivePorts(sessions.map((s: ChargingSession) => s.port_number));
      })
      .catch(() => {});

    closeRef.current = openKioskSSE(
      KIOSK_ID,
      (event) => {
        setLive(true);
        if (event.activePorts != null) {
          setActivePorts(event.activePorts);
          setSelected((prev) =>
            prev != null && event.activePorts!.includes(prev) ? null : prev,
          );
        }
      },
      () => setLive(false),
    );

    return () => closeRef.current?.();
  }, []);

  const ports = [1, 2, 3, 4].map((id) => ({
    id,
    type: PORT_TYPES[id],
    inUse: activePorts.includes(id),
  }));

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const result = await charging.start(KIOSK_ID, selected, 1);

      sessionStorage.setItem(
        "chargingSession",
        JSON.stringify(result.charging_session),
      );
      router.push(`/receipt/charge?station=${selected}`);
    } catch (e) {
      setError((e as Error).message ?? "Failed to start charging");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 page-enter">
      <KioskHeader showAccount />

      <div className="flex-1 flex flex-col items-center px-6 pt-6 gap-6">
        {/* Deposit summary card */}
        <div
          className="glass-white rounded-3xl p-6 w-full max-w-sm shadow-xl text-center page-scale"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="text-gray-400 text-sm mb-1">Bottle Detected</p>
          <p className="text-gray-800 text-2xl font-extrabold">
            {deposit.brand ?? "Bottle"} · {deposit.volume_ml ?? "?"}ml
          </p>
          <p className="text-gray-400 text-sm mt-2">Credits Earned</p>
          <p className="text-3xl font-extrabold" style={{ color: "#16A34A" }}>
            {deposit.credits_awarded ?? 1} credit
            {(deposit.credits_awarded ?? 1) !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Port selection header */}
        <div
          className="flex items-center gap-3 page-fade"
          style={{ animationDelay: "0.18s" }}
        >
          <h3 className="text-white text-xl font-bold">
            Select Charging Outlet
          </h3>
          {live && (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
              style={{
                color: "#4ADE80",
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.3)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#4ADE80",
                  animation: "ripple 1.5s ease-out infinite",
                }}
              />
              LIVE
            </span>
          )}
        </div>

        {/* Port grid */}
        <div
          className="grid grid-cols-2 gap-3 w-full max-w-sm page-scale"
          style={{ animationDelay: "0.22s" }}
        >
          {ports.map((port) => (
            <button
              key={port.id}
              className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all active:scale-95"
              disabled={port.inUse}
              style={
                port.inUse
                  ? {
                      background: "rgba(255,255,255,0.04)",
                      opacity: 0.4,
                      cursor: "not-allowed",
                    }
                  : selected === port.id
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(76,175,80,0.3), rgba(22,163,74,0.2))",
                        border: "2px solid rgba(76,175,80,0.6)",
                        boxShadow: "0 0 24px rgba(76,175,80,0.2)",
                      }
                    : {
                        background: "rgba(255,255,255,0.08)",
                        border: "1.5px solid rgba(255,255,255,0.12)",
                      }
              }
              onClick={() => setSelected(port.id)}
            >
              <span className="text-3xl">
                {port.type === "USB-C" ? "🔌" : "🔋"}
              </span>
              <span className="font-bold text-white">Station {port.id}</span>
              <span className="text-xs text-white/50">{port.type}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={
                  port.inUse
                    ? { background: "rgba(220,38,38,0.2)", color: "#FCA5A5" }
                    : { background: "rgba(74,222,128,0.15)", color: "#4ADE80" }
                }
              >
                {port.inUse ? "In Use" : "Available"}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-red-300 text-sm text-center">{error}</p>}

        {/* Confirm */}
        <button
          className="glass-btn-primary w-full max-w-sm py-5 rounded-2xl text-xl font-extrabold transition-all active:scale-95 disabled:opacity-30 page-fade"
          disabled={!selected || loading}
          style={{ animationDelay: "0.3s" }}
          onClick={handleConfirm}
        >
          {loading ? "Starting…" : "Confirm →"}
        </button>
      </div>

      <div className="px-6 pb-8">
        <BackButton href="/session/result" />
      </div>
    </div>
  );
}
