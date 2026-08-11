"use client";

/**
 * Kiosk-styled bin-level gauge — a vertical "battery" outline with a fill
 * level and a %+status line, per docs/planning/02-design-mandate.md SS4.6
 * (replaces the earlier 5-segment-bar BinIndicator, which didn't match the
 * real deck's battery shape). 5-state color scale from the deck's own
 * palette table, closer to the shared SS2 status convention than a separate
 * scale. Fill transitions smoothly (<400ms) on real telemetry changes, per
 * SS4.6's animation guidance — it's real-data-driven, not decorative, so no
 * fake gradual-fill implication.
 */
function levelColor(level: number): string {
  if (level >= 95) return "#DC2626"; // signal-red-500 - critical
  if (level >= 80) return "#D97706"; // amber-ish, matches server's 80% alert threshold
  if (level >= 50) return "#F59E0B";

  return "#16A34A"; // eco-green-500 - healthy
}

function levelLabel(level: number): string {
  if (level >= 95) return "Bin full — please try again later";
  if (level >= 80) return "Bin getting full";
  if (level >= 50) return "Bin half full";

  return "Bin has room";
}

export function BinBatteryGauge({ level }: { level: number }) {
  const color = levelColor(level);
  const clamped = Math.max(0, Math.min(100, level));

  return (
    <div className="flex items-center gap-4">
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          width: 44,
          height: 88,
          border: `3px solid ${color}`,
          borderRadius: 8,
          display: "flex",
          flexDirection: "column-reverse",
          overflow: "hidden",
          background: "#F6FBF7",
        }}
      >
        <div
          style={{
            width: "100%",
            height: `${clamped}%`,
            background: color,
            transition: "height 350ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        {/* battery "cap" */}
        <div
          style={{
            position: "absolute",
            top: -9,
            left: "50%",
            transform: "translateX(-50%)",
            width: 18,
            height: 6,
            borderRadius: "3px 3px 0 0",
            background: color,
          }}
        />
      </div>
      <div>
        <p className="text-2xl font-extrabold" style={{ color }}>
          {clamped}%
        </p>
        <p className="text-sm text-[#4A6B58]">{levelLabel(clamped)}</p>
      </div>
    </div>
  );
}
