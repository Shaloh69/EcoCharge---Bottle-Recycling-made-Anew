"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";

const OPTIONS = [
  {
    href: "/session/deposit?mode=charge",
    icon: "⚡",
    label: "Charge",
    sub: "Use credits to charge your phone",
    bg: "#FFFBEB",
    border: "#FDE68A",
    accent: "#D97706",
  },
  {
    href: "/session/deposit?mode=credit",
    icon: "💳",
    label: "Credits",
    sub: "Check or top-up your balance",
    bg: "#DCFCE7",
    border: "#BBF7D0",
    accent: "#15803D",
  },
];

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function SessionPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1">
      <KioskHeader showAccount />

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col items-center justify-center px-8 gap-8 py-10"
        initial="initial"
        transition={{ staggerChildren: 0.1 }}
      >
        {/* heading */}
        <motion.div
          className="text-center"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <p className="text-[#7C9587] text-xs uppercase tracking-widest mb-2">
            What would you like to do?
          </p>
          <h2 className="text-[#14231B] text-5xl font-extrabold tracking-tight">
            Select Mode
          </h2>
        </motion.div>

        {/* option buttons */}
        <motion.div
          className="w-full space-y-4"
          transition={{ duration: 0.35, type: "spring", bounce: 0.2 }}
          variants={item}
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.href}
              className="w-full rounded-3xl p-7 flex items-center gap-6 text-left transition-all active:scale-95"
              style={{
                background: opt.bg,
                border: `2px solid ${opt.border}`,
                boxShadow: "0 4px 20px rgba(20,35,27,0.06)",
              }}
              onClick={() => router.push(opt.href)}
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0"
                style={{
                  background: "#FFFFFF",
                  border: `1.5px solid ${opt.border}`,
                }}
              >
                {opt.icon}
              </div>
              <div className="flex-1">
                <p className="text-[#14231B] text-3xl font-bold leading-tight">
                  {opt.label}
                </p>
                <p className="text-[#4A6B58] text-base mt-1">{opt.sub}</p>
              </div>
              <span className="text-3xl" style={{ color: opt.accent }}>
                ›
              </span>
            </button>
          ))}
        </motion.div>

        {/* recycle prompt */}
        <motion.div
          className="w-full rounded-3xl p-6 text-center"
          style={{ background: "#FFFFFF", border: "1px solid #E5EFE8" }}
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <p className="text-5xl mb-3">🍶</p>
          <p className="text-[#14231B] font-bold text-xl">Have a bottle?</p>
          <p className="text-[#7C9587] text-base mt-1">
            Drop it in the slot above to earn credits.
          </p>
        </motion.div>
      </motion.div>

      <div className="px-8 pb-8">
        <BackButton href="/auth/linked" />
      </div>
    </div>
  );
}
