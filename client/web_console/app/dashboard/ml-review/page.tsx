"use client";
import { useEffect, useState } from "react";

import { addToast } from "@/lib/toast";
import { admin, type Deposit } from "@/lib/api";

export default function MLReviewPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  useEffect(() => {
    admin
      .mlReview()
      .then((r) => setDeposits(r.deposits ?? []))
      .catch(() =>
        addToast({ title: "Failed to load ML review queue", color: "danger" }),
      );
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          ML Review
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          Deposits with confidence below 70% — may need manual verification
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
                  "Time",
                  "Brand",
                  "Volume",
                  "Condition",
                  "Confidence",
                  "Credits",
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
              {deposits.length === 0 ? (
                <tr>
                  <td
                    className="text-center py-14 text-sm"
                    colSpan={7}
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    No low-confidence deposits
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr
                    key={d.id}
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
                      #{d.id}
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {new Date(d.timestamp).toLocaleString()}
                    </td>
                    <td
                      className="py-3.5 px-5 font-semibold"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {d.brand}
                    </td>
                    <td
                      className="py-3.5 px-5"
                      style={{ color: "rgba(255,255,255,0.60)" }}
                    >
                      {d.volume_ml}ml
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={
                          d.condition === "perfect"
                            ? {
                                background: "rgba(74,222,128,0.12)",
                                color: "#4ADE80",
                                border: "1px solid rgba(74,222,128,0.25)",
                              }
                            : {
                                background: "rgba(251,191,36,0.12)",
                                color: "#FBBF24",
                                border: "1px solid rgba(251,191,36,0.25)",
                              }
                        }
                      >
                        {d.condition}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className="font-bold text-xs"
                        style={{ color: "#FBBF24" }}
                      >
                        {Math.round(d.confidence * 100)}%
                      </span>
                    </td>
                    <td
                      className="py-3.5 px-5 font-bold"
                      style={{ color: "#4ADE80" }}
                    >
                      +{d.credits_awarded} min
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
