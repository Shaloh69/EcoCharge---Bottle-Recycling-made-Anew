"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
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
        if (event.ports != null) {
          const occupied = event.ports
            .filter((p) => !p.available)
            .map((p) => p.port);

          setActivePorts(occupied);
          setSelected((prev) =>
            prev != null && occupied.includes(prev) ? null : prev,
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
    <div className="flex flex-col flex-1">
      <KioskHeader showAccount />

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col items-center px-8 pt-7 gap-6"
        initial="initial"
        transition={{ staggerChildren: 0.09 }}
      >
        {/* Deposit summary card */}
        <motion.div
          className="glass-white rounded-3xl p-7 w-full shadow-xl text-center"
          transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
          variants={item}
        >
          <p className="text-gray-400 text-sm mb-1">Bottle Detected</p>
          <p className="text-gray-800 text-2xl font-extrabold">
            {deposit.brand ?? "Bottle"} · {deposit.volume_ml ?? "?"}ml
          </p>
          <p className="text-gray-400 text-sm mt-3">Credits Earned</p>
          <p
            className="text-4xl font-extrabold mt-1"
            style={{ color: "#16A34A" }}
          >
            {deposit.credits_awarded ?? 1} credit
            {(deposit.credits_awarded ?? 1) !== 1 ? "s" : ""}
          </p>
        </motion.div>

        {/* Port selection header */}
        <motion.div
          className="flex items-center gap-3 self-start"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <h3 className="text-white text-2xl font-bold">
            Select Charging Outlet
          </h3>
          {live && (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
              style={{
                color: "#4ADE80",
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.3)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#4ADE80",
                  animation: "ripple 1.5s ease-out infinite",
                }}
              />
              LIVE
            </span>
          )}
        </motion.div>

        {/* Port grid */}
        <motion.div
          className="grid grid-cols-2 gap-4 w-full"
          transition={{ duration: 0.35, type: "spring", bounce: 0.2 }}
          variants={item}
        >
          {ports.map((port) => (
            <button
              key={port.id}
              className="rounded-2xl p-6 flex flex-col items-center gap-3 transition-all active:scale-95"
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
                        boxShadow: "0 0 28px rgba(76,175,80,0.2)",
                      }
                    : {
                        background: "rgba(255,255,255,0.08)",
                        border: "1.5px solid rgba(255,255,255,0.12)",
                      }
              }
              onClick={() => setSelected(port.id)}
            >
              <span className="text-4xl">
                {port.type === "USB-C" ? "🔌" : "🔋"}
              </span>
              <span className="font-bold text-white text-lg">
                Station {port.id}
              </span>
              <span className="text-sm text-white/50">{port.type}</span>
              <span
                className="text-sm px-3 py-1 rounded-full font-medium"
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
        </motion.div>

        {error && (
          <motion.p
            animate={{ opacity: 1 }}
            className="text-red-300 text-base text-center"
            initial={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}

        {/* Confirm */}
        <motion.button
          className="glass-btn-primary w-full py-6 rounded-2xl text-2xl font-extrabold transition-all active:scale-95 disabled:opacity-30"
          disabled={!selected || loading}
          transition={{ duration: 0.3 }}
          variants={item}
          onClick={handleConfirm}
        >
          {loading ? "Starting…" : "Confirm →"}
        </motion.button>
      </motion.div>

      <div className="px-8 pb-8 pt-4">
        <BackButton href="/session/result" />
      </div>
    </div>
  );
}
