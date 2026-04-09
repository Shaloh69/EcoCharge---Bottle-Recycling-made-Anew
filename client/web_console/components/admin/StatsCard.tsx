"use client";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  accent?: string; // hex color for glow + icon bg + value
  trend?: { value: string; up: boolean };
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  accent = "#4CAF50",
  trend,
}: StatsCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))`,
        border: `1px solid ${accent}28`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: `0 8px 32px ${accent}14`,
      }}
    >
      <div className="flex items-start justify-between">
        <p
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {title}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{
            background: `${accent}22`,
            border: `1px solid ${accent}35`,
          }}
        >
          {icon}
        </div>
      </div>

      <div>
        <p
          className="text-3xl font-extrabold tracking-tight leading-none"
          style={{ color: accent }}
        >
          {value}
        </p>
        {subtitle && (
          <p
            className="text-xs mt-1.5"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={
              trend.up
                ? { background: "rgba(76,175,80,0.15)", color: "#4ADE80" }
                : { background: "rgba(239,68,68,0.15)", color: "#F87171" }
            }
          >
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        </div>
      )}

      {/* Bottom accent bar */}
      <div
        className="h-0.5 rounded-full mt-auto"
        style={{
          background: `linear-gradient(90deg, ${accent}60, transparent)`,
        }}
      />
    </div>
  );
}
