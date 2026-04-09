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
      className={`flex flex-col flex-1 px-6 py-10 ${visible ? "page-enter" : "opacity-0"}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">🌿</span>
        <div>
          <p className="text-white text-xl font-extrabold tracking-tight leading-none">
            EcoCharge
          </p>
          <p className="text-white/40 text-[10px] tracking-widest uppercase mt-0.5">
            Kiosk Station
          </p>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
        {/* Mascot orb */}
        <div className="relative bounce-in" style={{ animationDelay: "0.1s" }}>
          <div
            className="w-44 h-44 rounded-full flex items-center justify-center text-7xl pulse-glow"
            style={{
              background: "radial-gradient(circle at 35% 35%, #2E7D32, #051A08)",
              border: "4px solid rgba(76,175,80,0.30)",
              boxShadow: "0 0 60px rgba(76,175,80,0.25), inset 0 0 40px rgba(0,0,0,0.4)",
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
        </div>

        {/* Headline */}
        <div className="page-fade" style={{ animationDelay: "0.2s" }}>
          <h1 className="text-white text-4xl font-extrabold tracking-tight leading-tight">
            Recycle.
            <br />
            <span style={{ color: "#4ADE80" }}>Charge.</span>
          </h1>
          <p className="text-white/50 text-sm mt-3 leading-relaxed max-w-[260px] mx-auto">
            Drop your plastic bottles. Earn credits.
            <br />
            Charge your phone — completely free.
          </p>
        </div>

        {/* Stats */}
        <div
          className="flex gap-2.5 w-full page-fade"
          style={{ animationDelay: "0.32s" }}
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
              <span className="text-lg">{stat.icon}</span>
              <p className="text-white font-bold text-xs mt-1">{stat.value}</p>
              <p className="text-white/35 text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="page-fade pb-2" style={{ animationDelay: "0.44s" }}>
        <button
          className="glass-btn-primary w-full py-5 rounded-3xl font-extrabold text-xl tracking-tight transition-all active:scale-95"
          onClick={() => router.push("/auth")}
        >
          Touch to Start →
        </button>
        <p className="text-center text-white/25 text-[10px] mt-2.5 tracking-widest uppercase">
          Scan · Deposit · Charge
        </p>
      </div>
    </div>
  );
}
