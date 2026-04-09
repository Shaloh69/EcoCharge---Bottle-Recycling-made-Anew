"use client";
import { StatusBadge } from "@/components/admin/StatusBadge";

const sessions = [
  {
    id: "S001",
    user: "Taylor S.",
    kiosk: "Kiosk-001",
    start: "10:30 AM",
    end: "10:32 AM",
    bottles: 1,
    credits: "1 min",
    port: "Station 2",
    status: "completed" as const,
  },
  {
    id: "S002",
    user: "Guest",
    kiosk: "Kiosk-002",
    start: "10:25 AM",
    end: "—",
    bottles: 2,
    credits: "2 min",
    port: "Station 1",
    status: "active" as const,
  },
  {
    id: "S003",
    user: "John D.",
    kiosk: "Kiosk-001",
    start: "10:10 AM",
    end: "10:15 AM",
    bottles: 0,
    credits: "0 min",
    port: "—",
    status: "idle" as const,
  },
];

export default function SessionsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Sessions
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          Kiosk interaction sessions overview
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
                  "User",
                  "Kiosk",
                  "Start",
                  "End",
                  "Bottles",
                  "Credits",
                  "Port",
                  "Status",
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
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className="transition-colors duration-150"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(132,204,22,0.06)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    className="py-3.5 px-5 text-xs font-mono"
                    style={{ color: "rgba(255,255,255,0.30)" }}
                  >
                    {s.id}
                  </td>
                  <td
                    className="py-3.5 px-5 font-semibold"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {s.user}
                  </td>
                  <td
                    className="py-3.5 px-5"
                    style={{ color: "rgba(255,255,255,0.60)" }}
                  >
                    {s.kiosk}
                  </td>
                  <td
                    className="py-3.5 px-5"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {s.start}
                  </td>
                  <td
                    className="py-3.5 px-5"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {s.end}
                  </td>
                  <td
                    className="py-3.5 px-5 font-bold"
                    style={{ color: "rgba(255,255,255,0.80)" }}
                  >
                    {s.bottles}
                  </td>
                  <td
                    className="py-3.5 px-5 font-bold"
                    style={{ color: "#84CC16" }}
                  >
                    {s.credits}
                  </td>
                  <td
                    className="py-3.5 px-5"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {s.port}
                  </td>
                  <td className="py-3.5 px-5">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
