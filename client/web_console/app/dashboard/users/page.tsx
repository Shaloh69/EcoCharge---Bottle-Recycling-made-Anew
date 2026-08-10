"use client";
import { useEffect, useState } from "react";

import { addToast } from "@/lib/toast";
import { admin, type User } from "@/lib/api";

const ACCENT = "#A855F7";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    admin
      .users()
      .then(setUsers)
      .catch(() =>
        addToast({ title: "Failed to load users", color: "danger" }),
      );
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Users
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          Registered user accounts
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
                  "Name",
                  "Email",
                  "Phone",
                  "Balance",
                  "Admin",
                  "Joined",
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
              {users.length === 0 ? (
                <tr>
                  <td
                    className="text-center py-14 text-sm"
                    colSpan={7}
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(168,85,247,0.06)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      className="py-3.5 px-5 text-xs font-mono"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      #{u.id}
                    </td>
                    <td
                      className="py-3.5 px-5 font-semibold"
                      style={{ color: "rgba(255,255,255,0.88)" }}
                    >
                      {u.name}
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.60)" }}
                    >
                      {u.email}
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.50)" }}
                    >
                      {u.phone ?? "—"}
                    </td>
                    <td
                      className="py-3.5 px-5 font-bold"
                      style={{ color: ACCENT }}
                    >
                      {u.credit_balance} min
                    </td>
                    <td className="py-3.5 px-5">
                      {u.is_admin ? (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(168,85,247,0.14)",
                            color: "#A855F7",
                            border: "1px solid rgba(168,85,247,0.28)",
                          }}
                        >
                          Admin
                        </span>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.25)" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.40)" }}
                    >
                      {new Date(u.created_at).toLocaleDateString()}
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
