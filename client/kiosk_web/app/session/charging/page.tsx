"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { BackButton } from "@/components/kiosk/BackButton";
import { charging, session, type ChargingSession } from "@/lib/api";

const KIOSK_ID = parseInt(process.env.NEXT_PUBLIC_KIOSK_ID ?? "1");

export default function ChargingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [activeSessions, setActiveSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const deposit = typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("lastDeposit") ?? "{}")
    : {};

  useEffect(() => {
    charging.active().then(setActiveSessions).catch(() => {});
  }, []);

  const ports = [1, 2, 3, 4].map(id => ({
    id,
    type: id % 2 === 0 ? "USB-C" : "USB-A",
    status: activeSessions.some(s => s.port_number === id) ? "in-use" : "available",
  }));

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const result = await charging.start(KIOSK_ID, selected, 1);
      sessionStorage.setItem("chargingSession", JSON.stringify(result.charging_session));
      router.push(`/receipt/charge?station=${selected}`);
    } catch (e) {
      setError((e as Error).message ?? "Failed to start charging");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B5E20" }}>
      <KioskHeader showAccount />
      <div className="flex-1 flex flex-col items-center px-6 pt-6 gap-6">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-lg text-center">
          <p className="text-gray-500 text-sm mb-1">Bottle Detected</p>
          <p className="text-gray-800 text-2xl font-bold">
            {deposit.brand ?? "Bottle"} · {deposit.volume_ml ?? "?"}ml
          </p>
          <p className="text-gray-500 text-sm mt-2">Time Credit Earned</p>
          <p className="text-green-700 text-3xl font-bold">10 min</p>
        </div>

        <h3 className="text-white text-xl font-semibold">Select Charging Outlet</h3>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {ports.map(port => (
            <button
              key={port.id}
              disabled={port.status === "in-use"}
              onClick={() => setSelected(port.id)}
              className={`rounded-2xl p-5 flex flex-col items-center gap-2 shadow transition-all active:scale-95 ${
                port.status === "in-use"
                  ? "bg-gray-200 opacity-50 cursor-not-allowed"
                  : selected === port.id
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-800 hover:bg-green-50"
              }`}
            >
              <span className="text-3xl">{port.type === "USB-C" ? "🔌" : "🔋"}</span>
              <span className="font-bold">Station {port.id}</span>
              <span className="text-xs">{port.type}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  port.status === "in-use"
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {port.status === "in-use" ? "In Use" : "Available"}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-red-200 text-sm">{error}</p>}

        <button
          disabled={!selected || loading}
          onClick={handleConfirm}
          className="w-full max-w-sm py-5 rounded-2xl bg-white text-green-800 text-xl font-bold shadow-xl hover:bg-green-50 transition-all active:scale-95 disabled:opacity-40"
        >
          {loading ? "Starting..." : "Confirm →"}
        </button>
      </div>
      <div className="px-6 pb-6">
        <BackButton href="/session/result" />
      </div>
    </div>
  );
}
