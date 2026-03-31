"use client";
import { useEffect, useState } from "react";

import { admin, type Alert } from "@/lib/api";

const colors: Record<string, string> = {
  error: "border-red-300 bg-red-50",
  warning: "border-amber-300 bg-amber-50",
};
const textColors: Record<string, string> = {
  error: "text-red-700",
  warning: "text-amber-700",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    admin
      .alerts()
      .then(setAlerts)
      .catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Alerts & Faults</h1>
      {alerts.length === 0 && (
        <p className="text-gray-400 text-center py-12">No active alerts</p>
      )}
      <div className="space-y-3">
        {alerts.map((a, i) => (
          <div
            key={i}
            className={`border rounded-xl p-4 flex items-start gap-4 ${colors[a.severity] ?? "border-gray-200 bg-white"}`}
          >
            <span className="text-2xl">
              {a.type === "offline" ? "📴" : "🗑️"}
            </span>
            <div className="flex-1">
              <h3
                className={`font-semibold text-sm ${textColors[a.severity] ?? "text-gray-700"}`}
              >
                {a.message}
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                📍 {a.kiosk_name} · {new Date(a.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
