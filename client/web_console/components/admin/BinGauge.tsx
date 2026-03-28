"use client";
export function BinGauge({ level }: { level: number }) {
  const color =
    level > 90
      ? "#DC2626"
      : level > 70
        ? "#D97706"
        : level > 50
          ? "#CA8A04"
          : "#16A34A";

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${level}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-bold w-12 text-right" style={{ color }}>
        {level}%
      </span>
    </div>
  );
}
