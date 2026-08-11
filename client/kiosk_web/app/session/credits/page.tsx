"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { user } from "@/lib/api";

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const lastDeposit =
  typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("lastDeposit") ?? "null")
    : null;

export default function CreditsPage() {
  const router = useRouter();
  // Real gap found and fixed 2026-08-11: this page showed a hardcoded
  // "00:05:00" balance regardless of the actual signed-in user's real
  // credits. Wired to the real /api/users/me/credits endpoint instead.
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    user
      .credits()
      .then((r) => setBalance(r.credit_balance))
      .catch(() => setBalance(0));
  }, []);

  const mins = balance ?? 0;
  const hh = String(Math.floor(mins / 60)).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");

  return (
    <div className="flex flex-col flex-1">
      <KioskHeader showAccount />

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col items-center px-8 pt-9 gap-6"
        initial="initial"
        transition={{ staggerChildren: 0.09 }}
      >
        {/* Balance card */}
        <motion.div
          className="glass-white rounded-3xl p-8 w-full shadow-xl text-center"
          transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
          variants={item}
        >
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">
            Credit Balance
          </p>
          <p className="text-green-700 text-6xl font-extrabold tracking-tight">
            {balance === null ? "…" : `00:${hh}:${mm}`}
          </p>
          <p className="text-gray-400 text-sm mt-2">minutes available</p>

          <div className="flex gap-4 mt-6">
            <button
              className="flex-1 py-4 rounded-xl text-white font-semibold text-base transition-all active:scale-95"
              style={{ background: "#16A34A" }}
              onClick={() => router.push("/session/deposit?mode=credit")}
            >
              🍶 Deposit
            </button>
            <button
              className="flex-1 py-4 rounded-xl font-semibold text-base glass-green transition-all active:scale-95"
              style={{ color: "#15803D" }}
            >
              📊 History
            </button>
          </div>
        </motion.div>

        {/* Latest deposit */}
        <motion.div
          className="glass rounded-3xl p-6 w-full"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <p className="text-[#7C9587] text-xs uppercase tracking-widest mb-3">
            Latest Deposit
          </p>
          <div className="flex items-center gap-4">
            <span className="text-4xl">🍶</span>
            <div>
              <p className="text-[#14231B] font-bold text-lg">
                {lastDeposit
                  ? `${lastDeposit.brand ?? "1"} Plastic Bottle`
                  : "No deposits yet"}
              </p>
              <p className="text-[#7C9587] text-base">
                {lastDeposit
                  ? `+${lastDeposit.credits_awarded ?? 0} min credit earned`
                  : "Deposit a bottle to earn credits"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Add credit */}
        <motion.button
          className="glass-btn-secondary w-full py-5 rounded-2xl text-xl font-bold transition-all active:scale-95"
          transition={{ duration: 0.3 }}
          variants={item}
          onClick={() => router.push("/session/deposit?mode=credit")}
        >
          + Add More Credits
        </motion.button>

        {/* Use credit */}
        <motion.button
          className="glass-btn-primary w-full py-6 rounded-2xl text-2xl font-extrabold transition-all active:scale-95"
          transition={{ duration: 0.3 }}
          variants={item}
          onClick={() => router.push("/receipt/credit")}
        >
          Use Credits →
        </motion.button>
      </motion.div>

      <div className="px-8 pb-8 pt-4">
        <BackButton href="/session" />
      </div>
    </div>
  );
}
