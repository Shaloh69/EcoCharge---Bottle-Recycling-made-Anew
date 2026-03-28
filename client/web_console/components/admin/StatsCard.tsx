"use client";
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: { value: string; up: boolean };
  color?: string;
}
export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "#2E7D32",
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 text-sm font-medium">{title}</span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: color + "20" }}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
      {trend && (
        <p
          className={`text-sm mt-2 font-medium ${trend.up ? "text-green-600" : "text-red-500"}`}
        >
          {trend.up ? "↑" : "↓"} {trend.value}
        </p>
      )}
    </div>
  );
}
