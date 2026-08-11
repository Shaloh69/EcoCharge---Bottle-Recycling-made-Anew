"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const item = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function SplashPage() {
  const router = useRouter();

  return (
    <motion.div
      animate="animate"
      className="flex flex-col flex-1 px-8 py-12"
      initial="initial"
      transition={{ staggerChildren: 0.1 }}
    >
      {/* Logo */}
      <motion.div
        className="flex items-center gap-3"
        transition={{ duration: 0.3 }}
        variants={item}
      >
        <span className="text-4xl">🌿</span>
        <div>
          <p className="text-[#14231B] text-2xl font-extrabold tracking-tight leading-none">
            EcoCharge
          </p>
          <p className="text-[#7C9587] text-[11px] tracking-widest uppercase mt-1">
            Kiosk Station
          </p>
        </div>
      </motion.div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-9 text-center">
        {/* Mascot orb — a contained decorative avatar, not a full-page/panel
            gradient, so this stays (the deck's own login screens use the
            same treatment for the mascot circle). */}
        <motion.div
          className="relative"
          transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
          variants={item}
        >
          <div
            className="w-52 h-52 rounded-full flex items-center justify-center text-8xl pulse-glow"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #2E7D32, #14532D)",
              border: "4px solid #BBF7D0",
              boxShadow: "0 8px 32px rgba(22,163,74,0.25)",
            }}
          >
            🍶
          </div>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1.5px solid rgba(22,163,74,0.30)",
              animation: "ripple 3s ease-out infinite",
            }}
          />
        </motion.div>

        {/* Headline */}
        <motion.div transition={{ duration: 0.3 }} variants={item}>
          <h1 className="text-[#14231B] text-5xl font-extrabold tracking-tight leading-tight">
            Recycle.
            <br />
            <span style={{ color: "#16A34A" }}>Charge.</span>
          </h1>
          <p className="text-[#4A6B58] text-base mt-4 leading-relaxed max-w-xs mx-auto">
            Drop your plastic bottles. Earn credits.
            <br />
            Charge your phone — completely free.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex gap-3 w-full"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          {[
            { icon: "🍶", label: "Accepted", value: "PET · HDPE" },
            { icon: "⚡", label: "Ports", value: "4 Chargers" },
            { icon: "🌱", label: "Impact", value: "Go Green" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-2xl px-3 py-4 text-center"
              style={{ background: "#FFFFFF", border: "1px solid #E5EFE8" }}
            >
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-[#14231B] font-bold text-sm mt-1.5">
                {stat.value}
              </p>
              <p className="text-[#7C9587] text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        className="pb-2 flex flex-col gap-3"
        transition={{ duration: 0.3 }}
        variants={item}
      >
        <button
          className="glass-btn-primary w-full py-6 rounded-3xl font-extrabold text-2xl tracking-tight transition-all active:scale-95"
          onClick={() => router.push("/auth")}
        >
          Touch to Start →
        </button>
        <p className="text-center text-[#7C9587] text-xs tracking-widest uppercase">
          Scan · Deposit · Charge
        </p>
        <button
          className="w-full py-3 rounded-2xl text-[#7C9587] text-xs tracking-widest uppercase transition-all active:text-[#14231B]"
          style={{ border: "1px solid #E5EFE8" }}
          onClick={() => router.push("/diag")}
        >
          System Check
        </button>
      </motion.div>
    </motion.div>
  );
}
