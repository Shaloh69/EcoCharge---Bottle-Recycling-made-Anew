"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotFull } from "@/components/kiosk/MascotDisplay";

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function ResultContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") ?? "charge";
  const accepted = params.get("status") === "accepted";

  return (
    <div className="flex flex-col flex-1">
      <KioskHeader showAccount />

      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-8 gap-7"
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.1 }}
      >
        <motion.div
          variants={item}
          transition={{ duration: 0.4, type: "spring", bounce: 0.35 }}
        >
          <MascotFull mood={accepted ? "happy" : "sad"} />
        </motion.div>

        {/* Result card */}
        <motion.div
          className="glass-white rounded-3xl p-9 w-full shadow-2xl text-center"
          variants={item}
          transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
        >
          <div className="text-7xl mb-4">{accepted ? "✅" : "❌"}</div>
          <h2
            className="text-3xl font-extrabold mb-3"
            style={{ color: accepted ? "#16A34A" : "#DC2626" }}
          >
            {accepted ? "Bottle Accepted!" : "Bottle Rejected"}
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            {accepted
              ? `Credits earned! Mode: ${mode}`
              : "Bottle does not meet requirements. Please try again."}
          </p>
        </motion.div>

        {/* Action button */}
        {accepted ? (
          <motion.button
            className="glass-btn-primary w-full py-6 rounded-2xl text-2xl font-bold transition-all active:scale-95"
            variants={item}
            transition={{ duration: 0.3 }}
            onClick={() =>
              router.push(
                mode === "charge" ? "/session/charging" : "/session/credits",
              )
            }
          >
            Continue →
          </motion.button>
        ) : (
          <motion.button
            className="w-full py-6 rounded-2xl text-2xl font-bold transition-all active:scale-95"
            variants={item}
            transition={{ duration: 0.3 }}
            style={{
              background: "linear-gradient(135deg, #DC2626, #991B1B)",
              color: "white",
              boxShadow: "0 8px 32px rgba(220,38,38,0.35)",
            }}
            onClick={() => router.push("/session/deposit")}
          >
            Try Again
          </motion.button>
        )}
      </motion.div>

      <div className="px-8 pb-8 pt-4">
        <BackButton href="/session/deposit" />
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
