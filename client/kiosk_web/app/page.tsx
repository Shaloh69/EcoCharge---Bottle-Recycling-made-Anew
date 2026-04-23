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
      className="flex flex-col flex-1 px-8 py-12"
      initial="initial"
      animate="animate"
      transition={{ staggerChildren: 0.1 }}
    >
      {/* Logo */}
      <motion.div
        className="flex items-center gap-3"
        variants={item}
        transition={{ duration: 0.3 }}
      >
        <span className="text-4xl">🌿</span>
        <div>
          <p className="text-white text-2xl font-extrabold tracking-tight leading-none">
            EcoCharge
          </p>
          <p className="text-white/40 text-[11px] tracking-widest uppercase mt-1">
            Kiosk Station
          </p>
        </div>
      </motion.div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-9 text-center">
        {/* Mascot orb */}
        <motion.div
          className="relative"
          variants={item}
          transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
        >
          <div
            className="w-52 h-52 rounded-full flex items-center justify-center text-8xl pulse-glow"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #2E7D32, #051A08)",
              border: "4px solid rgba(76,175,80,0.30)",
              boxShadow:
                "0 0 70px rgba(76,175,80,0.28), inset 0 0 50px rgba(0,0,0,0.4)",
            }}
          >
            🍶
          </div>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1.5px solid rgba(76,175,80,0.35)",
              animation: "ripple 3s ease-out infinite",
            }}
          />
        </motion.div>

        {/* Headline */}
        <motion.div variants={item} transition={{ duration: 0.3 }}>
          <h1 className="text-white text-5xl font-extrabold tracking-tight leading-tight">
            Recycle.
            <br />
            <span style={{ color: "#4ADE80" }}>Charge.</span>
          </h1>
          <p className="text-white/50 text-base mt-4 leading-relaxed max-w-xs mx-auto">
            Drop your plastic bottles. Earn credits.
            <br />
            Charge your phone — completely free.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex gap-3 w-full"
          variants={item}
          transition={{ duration: 0.3 }}
        >
          {[
            { icon: "🍶", label: "Accepted", value: "PET · HDPE" },
            { icon: "⚡", label: "Ports", value: "4 Chargers" },
            { icon: "🌱", label: "Impact", value: "Go Green" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 glass rounded-2xl px-3 py-4 text-center"
            >
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-white font-bold text-sm mt-1.5">
                {stat.value}
              </p>
              <p className="text-white/35 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        className="pb-2 flex flex-col gap-3"
        variants={item}
        transition={{ duration: 0.3 }}
      >
        <button
          className="glass-btn-primary w-full py-6 rounded-3xl font-extrabold text-2xl tracking-tight transition-all active:scale-95"
          onClick={() => router.push("/auth")}
        >
          Touch to Start →
        </button>
        <p className="text-center text-white/25 text-xs tracking-widest uppercase">
          Scan · Deposit · Charge
        </p>
        <button
          className="w-full py-3 rounded-2xl text-white/25 text-xs tracking-widest uppercase transition-all active:text-white/50"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          onClick={() => router.push("/diag")}
        >
          System Check
        </button>
      </motion.div>
    </motion.div>
  );
}
