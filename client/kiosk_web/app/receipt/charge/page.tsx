"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotAvatar } from "@/components/kiosk/MascotDisplay";

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function ChargeReceiptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const station = params.get("station") ?? "1";
  const cs =
    typeof window !== "undefined"
      ? JSON.parse(sessionStorage.getItem("chargingSession") ?? "{}")
      : {};
  const minutes = cs.duration_seconds
    ? Math.round(cs.duration_seconds / 60)
    : 10;

  const handleDone = () => {
    sessionStorage.removeItem("lastDeposit");
    sessionStorage.removeItem("chargingSession");
    router.push("/");
  };

  return (
    <div className="flex flex-col flex-1 text-black">
      <KioskHeader showAccount />

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col items-center justify-center px-8 gap-7"
        initial="initial"
        transition={{ staggerChildren: 0.1 }}
      >
        {/* Receipt card */}
        <motion.div
          className="glass-white rounded-3xl p-9 w-full shadow-2xl flex flex-col items-center gap-5"
          transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
          variants={item}
        >
          {/* Success icon */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
            style={{
              background: "linear-gradient(135deg, #4ADE80, #16A34A)",
              boxShadow: "0 0 36px rgba(76,175,80,0.4)",
            }}
          >
            ✅
          </div>

          <h2 className="text-green-700 text-3xl font-extrabold">
            Charging Started!
          </h2>

          <div className="w-full border-t border-gray-100 pt-5 space-y-4 text-center">
            <p className="text-gray-400 text-sm">Charging at</p>
            <p className="text-gray-800 text-3xl font-extrabold">
              Station {station}
            </p>

            <div
              className="rounded-2xl px-5 py-4"
              style={{
                background: "rgba(76,175,80,0.08)",
                border: "1px solid rgba(76,175,80,0.2)",
              }}
            >
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
                Time Allocated
              </p>
              <p className="text-green-700 text-4xl font-extrabold">
                {minutes} min
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">🌿</span>
            <span className="text-green-700 font-bold text-lg">EcoCharge</span>
          </div>
        </motion.div>

        <motion.div
          transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
          variants={item}
        >
          <MascotAvatar mood="happy" />
        </motion.div>

        <motion.p
          className="text-white/50 text-base text-center max-w-xs leading-relaxed"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          Your device is now charging. Remove it when done or when time expires.
        </motion.p>

        <motion.button
          className="glass-btn-primary w-full py-6 rounded-2xl text-2xl font-extrabold transition-all active:scale-95"
          transition={{ duration: 0.3 }}
          variants={item}
          onClick={handleDone}
        >
          Thank You 🎉
        </motion.button>
      </motion.div>
    </div>
  );
}

export default function ChargeReceiptPage() {
  return (
    <Suspense>
      <ChargeReceiptContent />
    </Suspense>
  );
}
