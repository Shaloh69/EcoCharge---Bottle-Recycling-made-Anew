"use client";
import { Check, X } from "lucide-react";

/**
 * Success/fail feedback badge, per docs/planning/02-design-mandate.md SS4.6:
 * a circular halo-ring, icon-differentiated (check vs X) rather than
 * color-differentiated in the deck — but the deck used green for BOTH
 * outcomes, which conflicts with SS2's shared red-for-critical convention
 * used everywhere else in the product (admin console, bin gauge). Per the
 * mandate's own recommended resolution, the failure variant uses
 * signal-red-500 here, not green — a deliberate, reasoned deviation from the
 * source deck, not an oversight.
 *
 * Animation: concentric rings scale outward with fading opacity on entrance
 * (one ease-out pulse, not looping — a one-time confirmation, per SS4.6).
 */
export function HaloBadge({ success }: { success: boolean }) {
  const color = success ? "#16A34A" : "#EF4444";
  const Icon = success ? Check : X;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: 128,
        height: 128,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {[0, 1].map((i) => (
        <span
          key={i}
          className="halo-ring"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            animationDelay: `${i * 200}ms`,
          }}
        />
      ))}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: success ? "#DCFCE7" : "#FEE2E2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon color={color} size={48} strokeWidth={3} />
      </div>
    </div>
  );
}
