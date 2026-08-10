"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function CreditsPage() {
  const router = useRouter();

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
            00:05:00
          </p>
          <p className="text-gray-400 text-sm mt-2">minutes available</p>

          <div className="flex gap-4 mt-6">
            <button
              className="flex-1 py-4 rounded-xl text-white font-semibold text-base transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #16A34A, #14532D)",
              }}
            >
              🍶 Deposit
            </button>
            <button
              className="flex-1 py-4 rounded-xl font-semibold text-base glass-green transition-all active:scale-95"
              style={{ color: "#4ADE80" }}
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
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
            Latest Deposit
          </p>
          <div className="flex items-center gap-4">
            <span className="text-4xl">🍶</span>
            <div>
              <p className="text-white font-bold text-lg">1 Plastic Bottle</p>
              <p className="text-white/40 text-base">+1 min credit earned</p>
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
