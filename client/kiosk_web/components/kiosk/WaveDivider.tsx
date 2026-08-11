"use client";

/**
 * The deck's signature wave/blob divider (docs/planning/02-design-mandate.md
 * SS4.6) — a curved shape cutting a solid-color header region from the white
 * body below. A real, reusable component (SVG path, crisp at the kiosk's
 * fixed 1080x1920 resolution), not redrawn per screen. `animated` gives the
 * idle-screen-only subtle drift the mandate calls for; frozen (static) by
 * default on interactive screens, per SS1's "never behind body copy at full
 * strength" rule — motion here is decoration, not content.
 */
export function WaveDivider({
  color = "#16A34A",
  animated = false,
  className = "",
}: {
  color?: string;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: 64 }}
      viewBox="0 0 400 64"
    >
      <path
        d="M0,20 C80,60 140,0 220,24 C290,45 340,10 400,28 L400,64 L0,64 Z"
        fill={color}
      >
        {animated && (
          <animate
            attributeName="d"
            dur="9s"
            repeatCount="indefinite"
            values="
              M0,20 C80,60 140,0 220,24 C290,45 340,10 400,28 L400,64 L0,64 Z;
              M0,26 C70,5 150,52 220,18 C300,-8 350,34 400,20 L400,64 L0,64 Z;
              M0,20 C80,60 140,0 220,24 C290,45 340,10 400,28 L400,64 L0,64 Z
            "
          />
        )}
      </path>
    </svg>
  );
}
