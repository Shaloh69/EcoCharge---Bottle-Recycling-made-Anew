"use client";

import { useAiHealth } from "@/hooks/useAiHealth";

const AI_DOT_COLOR: Record<string, string> = {
  checking: "#555555",
  online:   "#4caf50",
  offline:  "#f44336",
};

export function KioskHeader({
  showAccount = false,
}: {
  showAccount?: boolean;
}) {
  const aiStatus = useAiHealth();

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        background: "rgba(7, 18, 10, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>🌿</span>
        <div>
          <p style={{ color: "#fff", fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
            EcoCharge
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0, marginTop: 2 }}>
            Kiosk Station
          </p>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* AI status dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: AI_DOT_COLOR[aiStatus],
              boxShadow: aiStatus === "online"
                ? "0 0 5px rgba(76,175,80,0.8)"
                : aiStatus === "offline"
                ? "0 0 5px rgba(244,67,54,0.8)"
                : "none",
              transition: "background 0.4s, box-shadow 0.4s",
            }}
          />
          <span style={{ color: "rgba(255,255,255,0.30)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            AI
          </span>
        </div>

        {showAccount && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: "rgba(76,175,80,0.20)",
              border: "1.5px solid rgba(76,175,80,0.40)",
              flexShrink: 0,
            }}
          >
            A
          </div>
        )}
      </div>
    </div>
  );
}
