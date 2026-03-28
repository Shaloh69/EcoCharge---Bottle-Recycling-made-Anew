"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { admin, type Analytics } from "@/lib/api";

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin.analytics().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const days = data?.days ?? [];

  const totalKwh = days.reduce((s, d) => s + d.kwh_consumed, 0);
  const totalCredits = days.reduce((s, d) => s + d.credits_issued, 0);
  const totalGainLoss = days.reduce((s, d) => s + d.gain_loss_php, 0);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Analytics</h1>
        <div className="animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Last 30 days · system-wide</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Total kWh Consumed</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{totalKwh.toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">kWh over 30 days</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Credits Issued</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{totalCredits}</p>
          <p className="text-gray-400 text-xs mt-1">total credits awarded</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Net Gain / Loss</p>
          <p className={`text-3xl font-bold mt-1 ${totalGainLoss >= 0 ? "text-green-700" : "text-red-600"}`}>
            {totalGainLoss >= 0 ? "+" : ""}₱{totalGainLoss.toFixed(2)}
          </p>
          <p className="text-gray-400 text-xs mt-1">PHP over 30 days</p>
        </div>
      </div>

      {/* Energy Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-gray-800 font-semibold mb-4">Daily Energy Consumption (kWh)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={days} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(3)} kWh`, "Energy"]} />
            <Bar dataKey="kwh_consumed" name="kWh" fill="#166534" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Credits Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-gray-800 font-semibold mb-4">Daily Credits Issued</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={days} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} />
            <Tooltip formatter={(v: number) => [v, "Credits"]} />
            <Bar dataKey="credits_issued" name="Credits" fill="#16A34A" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gain/Loss Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-gray-800 font-semibold mb-4">Daily Gain / Loss (PHP)</h2>
        <p className="text-gray-400 text-xs mb-4">
          Positive = revenue from charging credits &gt; electricity cost. Negative = subsidizing users.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={days} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} />
            <Tooltip formatter={(v: number) => [`₱${v.toFixed(2)}`, "Gain/Loss"]} />
            <Legend />
            <Line
              type="monotone" dataKey="gain_loss_php" name="₱ Gain/Loss"
              stroke="#D97706" strokeWidth={2} dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
