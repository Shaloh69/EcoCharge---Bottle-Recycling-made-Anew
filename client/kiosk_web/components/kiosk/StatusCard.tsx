"use client";
interface StatusCardProps {
  children: React.ReactNode;
  className?: string;
  color?: "white" | "green" | "amber" | "red";
}
const colorMap = {
  white: "bg-white text-gray-800",
  green: "bg-green-700 text-white",
  amber: "bg-amber-500 text-white",
  red: "bg-red-600 text-white",
};
export function StatusCard({ children, className = "", color = "white" }: StatusCardProps) {
  return (
    <div className={`rounded-2xl p-6 shadow-lg ${colorMap[color]} ${className}`}>
      {children}
    </div>
  );
}
