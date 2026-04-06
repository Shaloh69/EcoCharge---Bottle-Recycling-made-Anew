"use client";

import { useAiHealth } from "@/hooks/useAiHealth";

const AI_DOT_COLOR: Record<string, string> = {
  checking: "#888888",
  online: "#4caf50",
  offline: "#f44336",
};

export function KioskHeader({
  showAccount = false,
}: {
  showAccount?: boolean;
}) {
  const aiStatus = useAiHealth();

  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{
        background: "rgba(0,0,0,0.28)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="text-2xl float-slow-anim"
          style={{ filter: "drop-shadow(0 0 8px rgba(76,175,80,0.7))" }}
        >
          🌿
        </span>
        <div>
          <p className="text-white text-xl font-extrabold tracking-tight leading-none">
            EcoCharge
          </p>
          <p className="text-white/40 text-[10px] tracking-widest uppercase leading-none mt-0.5">
            Kiosk Station
          </p>
        </div>
      </div>

      {/* AI server status indicator */}
      <div className="flex items-center gap-1.5">
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: AI_DOT_COLOR[aiStatus],
            boxShadow:
              aiStatus === "online"
                ? "0 0 6px rgba(76,175,80,0.8)"
                : aiStatus === "offline"
                  ? "0 0 6px rgba(244,67,54,0.8)"
                  : "none",
            transition: "background 0.4s, box-shadow 0.4s",
          }}
        />
        <span className="text-white/40 text-[10px] uppercase tracking-widest">
          AI
        </span>
      </div>

      {showAccount && (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer transition-all active:scale-90"
          style={{
            background: "rgba(76,175,80,0.25)",
            border: "1.5px solid rgba(76,175,80,0.5)",
            boxShadow: "0 0 12px rgba(76,175,80,0.2)",
          }}
        >
          A
        </div>
      )}
    </div>
  );
}
