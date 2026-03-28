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
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sessions</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
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
                <td className="py-3 px-4 text-gray-400 text-xs">{s.id}</td>
                <td className="py-3 px-4 text-gray-700">{s.user}</td>
                <td className="py-3 px-4 text-gray-700">{s.kiosk}</td>
                <td className="py-3 px-4 text-gray-700">{s.start}</td>
                <td className="py-3 px-4 text-gray-700">{s.end}</td>
                <td className="py-3 px-4 text-gray-700 font-medium">
                  {s.bottles}
                </td>
                <td className="py-3 px-4 text-green-600 font-medium">
                  {s.credits}
                </td>
                <td className="py-3 px-4 text-gray-700">{s.port}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
