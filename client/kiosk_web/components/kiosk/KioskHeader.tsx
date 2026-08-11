"use client";

import { useAiHealth } from "@/hooks/useAiHealth";

const AI_DOT_COLOR: Record<string, string> = {
  checking: "#9CA3AF",
  online: "#16A34A",
  offline: "#DC2626",
};

/**
 * Real, systemic fix, 2026-08-11: this was hardcoded dark
 * (rgba(7,18,10,0.92) + backdrop-blur) on every single page in the app,
 * directly contradicting docs/planning/02-design-mandate.md SS4's light
 * identity. Defaults to light now (white, per SS4's real panel color);
 * `onDark` is the one legitimate exception — a header sitting directly on
 * a solid-color hero block (e.g. the auth page's green header region above
 * the wave divider), where light text genuinely is correct.
 */
export function KioskHeader({
  showAccount = false,
  onDark = false,
}: {
  showAccount?: boolean;
  onDark?: boolean;
}) {
  const aiStatus = useAiHealth();
  const textColor = onDark ? "#FFFFFF" : "#14231B";
  const mutedColor = onDark ? "rgba(255,255,255,0.65)" : "#7C9587";

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
        background: onDark ? "transparent" : "#FFFFFF",
        borderBottom: onDark ? "none" : "1px solid #E5EFE8",
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>🌿</span>
        <div>
          <p
            style={{
              color: textColor,
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            EcoCharge
          </p>
          <p
            style={{
              color: mutedColor,
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              margin: 0,
              marginTop: 2,
            }}
          >
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
              transition: "background 0.4s",
            }}
          />
          <span
            style={{
              color: mutedColor,
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
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
              color: onDark ? "#FFFFFF" : "#15803D",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: onDark ? "rgba(255,255,255,0.20)" : "#DCFCE7",
              border: onDark
                ? "1.5px solid rgba(255,255,255,0.40)"
                : "1.5px solid #BBF7D0",
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
