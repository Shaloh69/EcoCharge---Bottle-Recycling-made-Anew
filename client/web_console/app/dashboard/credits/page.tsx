"use client";
import { useEffect, useState } from "react";

import { admin, type Transaction } from "@/lib/api";

export default function CreditsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    admin
      .transactions()
      .then((r) => setTxns(r.transactions ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Credit Ledger</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["ID", "User", "Type", "Amount", "Balance After", "Time"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-gray-500 font-medium text-xs"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr
                key={t.id}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-400 text-xs">#{t.id}</td>
                <td className="py-3 px-4 text-gray-700">User #{t.user_id}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === "EARN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                  >
                    {t.type}
                  </span>
                </td>
                <td
                  className={`py-3 px-4 font-medium ${t.type === "EARN" ? "text-green-600" : "text-red-500"}`}
                >
                  {t.type === "EARN" ? "+" : "-"}
                  {t.amount} min
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {t.balance_after} min
                </td>
                <td className="py-3 px-4 text-gray-400">
                  {new Date(t.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {txns.length === 0 && (
          <p className="text-center text-gray-400 py-12">No transactions yet</p>
        )}
      </div>
    </div>
  );
}
