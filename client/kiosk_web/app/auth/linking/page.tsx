"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotFull } from "@/components/kiosk/MascotDisplay";

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function LinkingPage() {
  const router = useRouter();
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d + 1) % 4), 600);
    const timeout = setTimeout(() => router.push("/auth/linked"), 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex flex-col flex-1">
      <KioskHeader />

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col items-center justify-center px-8 gap-8"
        initial="initial"
        transition={{ staggerChildren: 0.12 }}
      >
        <motion.div
          transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
          variants={item}
        >
          <MascotFull mood="scanning" />
        </motion.div>

        <motion.div
          className="glass-white rounded-3xl p-9 flex flex-col items-center gap-6 w-full shadow-2xl"
          transition={{ duration: 0.35 }}
          variants={item}
        >
          <h2 className="text-gray-800 text-2xl font-bold text-center">
            Waiting for your phone{".".repeat(dots)}
          </h2>
          <div className="flex gap-4 mt-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: dots > i ? "#16A34A" : "#D1D5DB",
                  transform: dots > i ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
          <p className="text-gray-400 text-base text-center">
            Keep your phone screen on and near the kiosk.
          </p>
        </motion.div>

        <motion.button
          className="glass-btn-secondary w-full py-5 rounded-2xl text-xl font-semibold transition-all active:scale-95"
          transition={{ duration: 0.3 }}
          variants={item}
          onClick={() => router.push("/auth")}
        >
          Cancel
        </motion.button>
      </motion.div>

      <div className="px-8 pb-8">
        <BackButton href="/auth" />
      </div>
    </div>
  );
}
