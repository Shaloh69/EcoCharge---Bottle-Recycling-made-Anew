"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);

    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`flex flex-col min-h-screen px-6 py-14 ${visible ? "page-enter" : "opacity-0"}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <span
          className="text-4xl float-slow-anim"
          style={{ filter: "drop-shadow(0 0 10px rgba(76,175,80,0.7))" }}
        >
          🌿
        </span>
        <div>
          <p className="text-white text-2xl font-extrabold tracking-tight leading-none">
            EcoCharge
          </p>
          <p className="text-white/40 text-[10px] tracking-widest uppercase mt-0.5">
            Kiosk Station
          </p>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 text-center">
        {/* Mascot orb */}
        <div className="relative bounce-in" style={{ animationDelay: "0.1s" }}>
          <div
            className="w-52 h-52 rounded-full flex items-center justify-center text-8xl pulse-glow"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #2E7D32, #051A08)",
              border: "6px solid rgba(76,175,80,0.35)",
              boxShadow:
                "0 0 80px rgba(76,175,80,0.35), inset 0 0 48px rgba(0,0,0,0.4)",
            }}
          >
            🍶
          </div>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "2px solid rgba(76,175,80,0.4)",
              animation: "ripple 2.8s ease-out infinite",
            }}
          />
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-36 h-5 rounded-full"
            style={{ background: "rgba(0,0,0,0.3)", filter: "blur(10px)" }}
          />
        </div>

        {/* Headline */}
        <div className="page-fade" style={{ animationDelay: "0.25s" }}>
          <h1 className="text-white text-5xl font-extrabold tracking-tight leading-tight">
            Recycle.
            <br />
            <span style={{ color: "#4ADE80" }}>Charge.</span>
          </h1>
          <p className="text-white/55 text-base mt-3 leading-relaxed max-w-xs mx-auto">
            Drop your plastic bottles. Earn credits.
            <br />
            Charge your phone — completely free.
          </p>
        </div>

        {/* Stats chips */}
        <div
          className="flex gap-3 w-full page-fade"
          style={{ animationDelay: "0.38s" }}
        >
          {[
            { icon: "🍶", label: "Accepted", value: "PET · HDPE" },
            { icon: "⚡", label: "Ports", value: "4 Chargers" },
            { icon: "🌱", label: "Impact", value: "Go Green" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 glass rounded-2xl px-3 py-3 text-center"
            >
              <span className="text-xl">{stat.icon}</span>
              <p className="text-white font-bold text-xs mt-1">{stat.value}</p>
              <p className="text-white/35 text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="page-fade" style={{ animationDelay: "0.48s" }}>
        <button
          className="glass-btn-primary w-full py-6 rounded-3xl font-extrabold text-2xl tracking-tight transition-all active:scale-95"
          onClick={() => router.push("/auth")}
        >
          Touch to Start →
        </button>
        <p className="text-center text-white/25 text-xs mt-3 tracking-widest uppercase">
          Scan · Deposit · Charge
        </p>
      </div>
    </div>
  );
}
