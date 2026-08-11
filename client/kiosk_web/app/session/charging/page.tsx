"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { KioskHeader } from "@/components/kiosk/KioskHeader";
import {
  StationGrid,
  StationConfirmBar,
} from "@/components/kiosk/StationPicker";
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

  const stations = [1, 2, 3, 4].map((id) => ({
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
        className="flex-1 flex flex-col items-center px-8 pt-7 gap-6 pb-4"
        initial="initial"
        transition={{ staggerChildren: 0.09 }}
      >
        {/* Deposit summary card */}
        <motion.div
          className="rounded-3xl p-7 w-full text-center"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5EFE8",
            boxShadow: "0 4px 20px rgba(20,35,27,0.06)",
          }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
          variants={item}
        >
          <p className="text-[#7C9587] text-sm mb-1">Bottle Detected</p>
          <p className="text-[#14231B] text-2xl font-extrabold">
            {deposit.brand ?? "Bottle"} · {deposit.volume_ml ?? "?"}ml
          </p>
          <p className="text-[#7C9587] text-sm mt-3">Credits Earned</p>
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
          <h3 className="text-[#14231B] text-2xl font-bold">
            Select Charging Outlet
          </h3>
          {live && (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
              style={{
                color: "#15803D",
                background: "#DCFCE7",
                border: "1px solid #BBF7D0",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#16A34A",
                  animation: "ripple 1.5s ease-out infinite",
                }}
              />
              LIVE
            </span>
          )}
        </motion.div>

        {/* Station grid — real deck component (SS4.6): numbered tiles,
            wall-socket icon, green/dark-red "+" select button */}
        <motion.div
          className="w-full"
          transition={{ duration: 0.35, type: "spring", bounce: 0.2 }}
          variants={item}
        >
          <StationGrid
            selected={selected}
            stations={stations}
            onSelect={setSelected}
          />
        </motion.div>

        {error && (
          <motion.p
            animate={{ opacity: 1 }}
            className="text-red-600 text-base text-center"
            initial={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Persistent bottom confirm bar, per SS4.6 */}
      <StationConfirmBar
        disabled={!selected || loading}
        loading={loading}
        selected={selected}
        onBack={() => router.push("/session/result")}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
