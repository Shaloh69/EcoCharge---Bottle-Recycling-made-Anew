"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { userStore } from "@/lib/api";

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function LinkedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const linkedUser = userStore.get();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push("/session");

          return 0;
        }

        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const firstName = linkedUser?.name?.split(" ")[0] ?? "Guest";

  return (
    <div className="flex flex-col flex-1">
      <KioskHeader showAccount />

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col items-center justify-center px-8 gap-7 py-10"
        initial="initial"
        transition={{ staggerChildren: 0.1 }}
      >
        {/* Welcome card */}
        <motion.div
          className="glass-white rounded-3xl p-9 w-full shadow-2xl flex flex-col items-center gap-5"
          transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
          variants={item}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
            style={{
              background: "#16A34A",
              boxShadow: "0 8px 24px rgba(22,163,74,0.30)",
            }}
          >
            👤
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm">Signed in as</p>
            <p className="text-gray-800 text-3xl font-extrabold">
              {linkedUser?.name ?? "Guest"}
            </p>
          </div>

          {linkedUser?.phone && (
            <div className="w-full border-t border-gray-100 pt-3 text-center">
              <p className="text-gray-400 text-xs">Phone</p>
              <p className="text-gray-700 font-medium text-lg">
                {linkedUser.phone}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">🌿</span>
            <span className="text-green-700 font-bold text-lg">EcoCharge</span>
          </div>
        </motion.div>

        {/* Welcome message */}
        <motion.div
          className="text-center"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <h2 className="text-[#14231B] text-5xl font-extrabold tracking-tight">
            Welcome back,
            <br />
            <span style={{ color: "#16A34A" }}>{firstName}!</span>
          </h2>
          <p className="text-[#7C9587] text-base mt-3">
            Auto-continues in {countdown}s…
          </p>
        </motion.div>

        {/* CTA */}
        <motion.button
          className="glass-btn-primary w-full py-6 rounded-2xl text-2xl font-bold transition-all active:scale-95"
          transition={{ duration: 0.3 }}
          variants={item}
          onClick={() => router.push("/session")}
        >
          Let&apos;s Go →
        </motion.button>
      </motion.div>

      <div className="px-8 pb-8">
        <BackButton href="/auth" />
      </div>
    </div>
  );
}
