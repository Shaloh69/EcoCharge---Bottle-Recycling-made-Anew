"use client";
import { useEffect, useState } from "react";

import { admin, type ChargingSession } from "@/lib/api";

export default function ChargingPage() {
  const [sessions, setSessions] = useState<ChargingSession[]>([]);

  useEffect(() => {
    admin
      .charging()
      .then((r) => setSessions(r.sessions ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Charging Sessions
      </h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
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
                  className="text-left py-3 px-4 text-gray-500 font-medium text-xs"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-400 text-xs">#{s.id}</td>
                <td className="py-3 px-4 text-gray-700">Kiosk #{s.kiosk_id}</td>
                <td className="py-3 px-4 text-gray-700">
                  Station {s.port_number}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {s.credits_used} min
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {Math.round(s.duration_seconds / 60)} min
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-400">
                  {new Date(s.started_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <p className="text-center text-gray-400 py-12">No sessions yet</p>
        )}
      </div>
    </div>
  );
}
