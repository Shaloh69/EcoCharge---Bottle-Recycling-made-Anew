"use client";
import { useEffect, useState } from "react";
import { addToast } from "@heroui/toast";

import { admin, type ChargingSession } from "@/lib/api";

const ACCENT = "#F59E0B";

export default function ChargingPage() {
  const [sessions, setSessions] = useState<ChargingSession[]>([]);

  useEffect(() => {
    admin
      .charging()
      .then((r) => setSessions(r.sessions ?? []))
      .catch(() =>
        addToast({
          title: "Failed to load charging sessions",
          color: "danger",
        }),
      );
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Charging Sessions
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          All charging sessions across kiosks
        </p>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {[
                  "ID",
                  "Kiosk",
                  "Port",
                  "Credits",
                  "Duration",
                  "Status",
                  "Started",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3.5 px-5 text-[10px] font-semibold tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.32)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td
                    className="text-center py-14 text-sm"
                    colSpan={7}
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    No sessions yet
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(245,158,11,0.06)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      className="py-3.5 px-5 text-xs font-mono"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      #{s.id}
                    </td>
                    <td
                      className="py-3.5 px-5 font-medium"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      Kiosk #{s.kiosk_id}
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.60)" }}
                    >
                      Port {s.port_number}
                    </td>
                    <td
                      className="py-3.5 px-5 font-bold"
                      style={{ color: ACCENT }}
                    >
                      {s.credits_used} min
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.60)" }}
                    >
                      {Math.round(s.duration_seconds / 60)} min
                    </td>
                    <td className="py-3.5 px-5">
                      {s.status === "active" ? (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(56,189,248,0.12)",
                            color: "#38BDF8",
                            border: "1px solid rgba(56,189,248,0.25)",
                          }}
                        >
                          active
                        </span>
                      ) : (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(148,163,184,0.10)",
                            color: "rgba(255,255,255,0.40)",
                            border: "1px solid rgba(255,255,255,0.10)",
                          }}
                        >
                          {s.status}
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {new Date(s.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
