"use client";

export function BinGauge({ level }: { level: number }) {
  const color =
    level > 90
      ? "#F87171"
      : level > 70
        ? "#FBBF24"
        : level > 50
          ? "#FCD34D"
          : "#4ADE80";

  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className="flex-1 rounded-full h-2.5 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${level}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
      <span
        className="text-xs font-bold w-10 text-right tabular-nums"
        style={{ color }}
      >
        {level}%
      </span>
    </div>
  );
}
