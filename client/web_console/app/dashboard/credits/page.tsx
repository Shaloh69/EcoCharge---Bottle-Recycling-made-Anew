"use client";
import { useEffect, useState } from "react";

import { addToast } from "@/lib/toast";
import { admin, type Transaction } from "@/lib/api";

const ACCENT = "#EAB308";

export default function CreditsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    admin
      .transactions()
      .then((r) => setTxns(r.transactions ?? []))
      .catch(() =>
        addToast({ title: "Failed to load transactions", color: "danger" }),
      );
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Credit Ledger
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          All credit earn and spend transactions
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
                {["ID", "User", "Type", "Amount", "Balance After", "Time"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-3.5 px-5 text-[10px] font-semibold tracking-widest uppercase"
                      style={{ color: "rgba(255,255,255,0.32)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr>
                  <td
                    className="text-center py-14 text-sm"
                    colSpan={6}
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    No transactions yet
                  </td>
                </tr>
              ) : (
                txns.map((t) => (
                  <tr
                    key={t.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(234,179,8,0.06)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      className="py-3.5 px-5 text-xs font-mono"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      #{t.id}
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      User #{t.user_id}
                    </td>
                    <td className="py-3.5 px-5">
                      {t.type === "EARN" ? (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(74,222,128,0.12)",
                            color: "#4ADE80",
                            border: "1px solid rgba(74,222,128,0.25)",
                          }}
                        >
                          EARN
                        </span>
                      ) : (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(248,113,113,0.12)",
                            color: "#F87171",
                            border: "1px solid rgba(248,113,113,0.25)",
                          }}
                        >
                          SPEND
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-5 font-bold"
                      style={{
                        color: t.type === "EARN" ? "#4ADE80" : "#F87171",
                      }}
                    >
                      {t.type === "EARN" ? "+" : "-"}
                      {t.amount} min
                    </td>
                    <td
                      className="py-3.5 px-5 font-semibold"
                      style={{ color: ACCENT }}
                    >
                      {t.balance_after} min
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.40)" }}
                    >
                      {new Date(t.timestamp).toLocaleString()}
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
