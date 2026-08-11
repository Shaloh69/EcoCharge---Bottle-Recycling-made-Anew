"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { HaloBadge } from "@/components/kiosk/HaloBadge";

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
        animate="animate"
        className="flex-1 flex flex-col items-center justify-center px-8 gap-7"
        initial="initial"
        transition={{ staggerChildren: 0.1 }}
      >
        {/* Real deck component (SS4.6): pulsing halo-ring badge,
            icon-differentiated, red (not green) for the reject state per
            the mandate's reasoned deviation from the source deck. */}
        <motion.div
          transition={{ duration: 0.4, type: "spring", bounce: 0.35 }}
          variants={item}
        >
          <HaloBadge success={accepted} />
        </motion.div>

        {/* Result card */}
        <motion.div
          className="rounded-3xl p-9 w-full text-center"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5EFE8",
            boxShadow: "0 8px 32px rgba(20,35,27,0.08)",
          }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
          variants={item}
        >
          <h2
            className="text-3xl font-extrabold mb-3"
            style={{ color: accepted ? "#16A34A" : "#DC2626" }}
          >
            {accepted ? "Bottle Accepted!" : "Bottle Rejected"}
          </h2>
          <p className="text-[#4A6B58] text-lg leading-relaxed">
            {accepted
              ? `Credits earned! Mode: ${mode}`
              : "Bottle does not meet requirements. Please try again."}
          </p>
        </motion.div>

        {/* Action button */}
        {accepted ? (
          <motion.button
            className="glass-btn-primary w-full py-6 rounded-2xl text-2xl font-bold transition-all active:scale-95"
            transition={{ duration: 0.3 }}
            variants={item}
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
            style={{ background: "#DC2626", color: "white" }}
            transition={{ duration: 0.3 }}
            variants={item}
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
