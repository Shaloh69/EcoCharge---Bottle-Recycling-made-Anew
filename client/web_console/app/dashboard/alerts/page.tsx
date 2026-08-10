"use client";
import { useEffect, useState } from "react";

import { addToast } from "@/lib/toast";
import { admin, type Alert } from "@/lib/api";

// Real vocabulary the backend emits (src/routes/admin.ts GET /alerts):
// "critical" (bin >= 95%) and "high" (kiosk offline) both map to the
// spec's "red = critical/offline" convention; "medium" (bin 80-94%) maps
// to "amber = degraded/warning". "error"/"warning" never occur — fixed
// 2026-08-11, this previously matched nothing so every real alert fell
// through to the neutral fallback below.
const severityConfig: Record<
  string,
  { bg: string; border: string; color: string; dot: string }
> = {
  critical: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.22)",
    color: "#F87171",
    dot: "#EF4444",
  },
  high: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.22)",
    color: "#F87171",
    dot: "#EF4444",
  },
  medium: {
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.22)",
    color: "#FBBF24",
    dot: "#F59E0B",
  },
  low: {
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.65)",
    dot: "rgba(255,255,255,0.40)",
  },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    admin
      .alerts()
      .then(setAlerts)
      .catch(() =>
        addToast({ title: "Failed to load alerts", color: "danger" }),
      );
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Alerts &amp; Faults
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          Active system alerts and kiosk faults
        </p>
      </div>

      {alerts.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center text-sm"
          style={{
            background: "rgba(74,222,128,0.05)",
            border: "1px solid rgba(74,222,128,0.15)",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          <div className="text-3xl mb-3">✅</div>
          <p
            className="font-semibold"
            style={{ color: "rgba(74,222,128,0.80)" }}
          >
            All systems nominal
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            No active alerts
          </p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((a, i) => {
          const cfg = severityConfig[a.severity] ?? {
            bg: "rgba(255,255,255,0.04)",
            border: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.65)",
            dot: "rgba(255,255,255,0.40)",
          };

          return (
            <div
              key={i}
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              }}
            >
              <div
                className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                {a.type === "offline" ? "📴" : "🗑️"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg.dot }}
                  />
                  <h3
                    className="font-semibold text-sm leading-tight"
                    style={{ color: cfg.color }}
                  >
                    {a.message}
                  </h3>
                </div>
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  📍 {a.kiosk_name} · {new Date(a.timestamp).toLocaleString()}
                </p>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
                style={{
                  background: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                {a.severity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
