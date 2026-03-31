"use client";
import { useEffect, useState } from "react";

import { admin, type User } from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    admin
      .users()
      .then(setUsers)
      .catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Users</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {[
                "ID",
                "Name",
                "Email",
                "Phone",
                "Balance",
                "Admin",
                "Joined",
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
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-400 text-xs">#{u.id}</td>
                <td className="py-3 px-4 text-gray-800 font-medium">
                  {u.name}
                </td>
                <td className="py-3 px-4 text-gray-700">{u.email}</td>
                <td className="py-3 px-4 text-gray-700">{u.phone ?? "—"}</td>
                <td className="py-3 px-4 text-green-600 font-medium">
                  {u.credit_balance} min
                </td>
                <td className="py-3 px-4">{u.is_admin ? "✅" : "—"}</td>
                <td className="py-3 px-4 text-gray-400">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center text-gray-400 py-12">No users found</p>
        )}
      </div>
    </div>
  );
}
