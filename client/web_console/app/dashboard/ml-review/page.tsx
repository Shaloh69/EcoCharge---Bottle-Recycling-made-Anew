"use client";
import { useEffect, useState } from "react";

import { admin, type Deposit } from "@/lib/api";

export default function MLReviewPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  useEffect(() => {
    admin
      .mlReview()
      .then((r) => setDeposits(r.deposits ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">ML Review</h1>
      <p className="text-gray-500 text-sm mb-6">
        Deposits with confidence below 70% — may need manual verification.
      </p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
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
                  className="text-left py-3 px-4 text-gray-500 font-medium text-xs"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => (
              <tr
                key={d.id}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-400 text-xs">#{d.id}</td>
                <td className="py-3 px-4 text-gray-700">
                  {new Date(d.timestamp).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-gray-800">{d.brand}</td>
                <td className="py-3 px-4 text-gray-700">{d.volume_ml}ml</td>
                <td className="py-3 px-4 text-gray-700">{d.condition}</td>
                <td className="py-3 px-4">
                  <span className="font-medium text-amber-600">
                    {Math.round(d.confidence * 100)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-green-600">
                  +{d.credits_awarded} min
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {deposits.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            No low-confidence deposits
          </p>
        )}
      </div>
    </div>
  );
}
