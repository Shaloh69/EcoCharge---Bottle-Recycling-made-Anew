"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { addToast } from "@/lib/toast";
import { admin, type Analytics } from "@/lib/api";

const GLASS = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
} as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin
      .analytics()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        addToast({ title: "Failed to load analytics", color: "danger" });
      });
  }, []);

  const days = data?.days ?? [];
  const totalKwh = days.reduce((s, d) => s + d.kwh_consumed, 0);
  const totalCredits = days.reduce((s, d) => s + d.credits_issued, 0);
  const totalGainLoss = days.reduce((s, d) => s + d.gain_loss_php, 0);

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            Analytics
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Last 30 days · system-wide
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Analytics
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          Last 30 days · system-wide
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total kWh Consumed",
            value: `${totalKwh.toFixed(2)}`,
            sub: "kWh over 30 days",
            accent: "#10B981",
          },
          {
            label: "Credits Issued",
            value: `${totalCredits}`,
            sub: "total credits awarded",
            accent: "#84CC16",
          },
          {
            label: "Net Gain / Loss",
            value: `${totalGainLoss >= 0 ? "+" : ""}₱${totalGainLoss.toFixed(2)}`,
            sub: "PHP over 30 days",
            accent: totalGainLoss >= 0 ? "#4ADE80" : "#F87171",
          },
        ].map(({ label, value, sub, accent }) => (
          <div
            key={label}
            className="rounded-2xl p-5"
            style={{
              ...GLASS,
              border: `1px solid ${accent}22`,
              boxShadow: `0 4px 24px ${accent}10`,
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {label}
            </p>
            <p className="text-3xl font-extrabold" style={{ color: accent }}>
              {value}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* Energy chart */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          Daily Energy Consumption (kWh)
        </h2>
        <ResponsiveContainer height={240} width="100%">
          <BarChart
            data={days}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.30)" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.30)" }} />
            <Tooltip
              contentStyle={{
                background: "rgba(10,20,15,0.90)",
                border: "1px solid rgba(16,185,129,0.30)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.85)",
              }}
              formatter={(v: number) => [`${v.toFixed(3)} kWh`, "Energy"]}
            />
            <Bar
              dataKey="kwh_consumed"
              fill="#10B981"
              name="kWh"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Credits chart */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          Daily Credits Issued
        </h2>
        <ResponsiveContainer height={240} width="100%">
          <BarChart
            data={days}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.30)" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.30)" }} />
            <Tooltip
              contentStyle={{
                background: "rgba(10,20,15,0.90)",
                border: "1px solid rgba(132,204,22,0.30)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.85)",
              }}
              formatter={(v: number) => [v, "Credits"]}
            />
            <Bar
              dataKey="credits_issued"
              fill="#84CC16"
              name="Credits"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gain/Loss chart */}
      <div className="rounded-2xl p-5" style={GLASS}>
        <h2
          className="text-sm font-semibold mb-1"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          Daily Gain / Loss (PHP)
        </h2>
        <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
          Positive = revenue from charging credits &gt; electricity cost.
          Negative = subsidizing users.
        </p>
        <ResponsiveContainer height={240} width="100%">
          <LineChart
            data={days}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.30)" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.30)" }} />
            <Tooltip
              contentStyle={{
                background: "rgba(10,20,15,0.90)",
                border: "1px solid rgba(245,158,11,0.30)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.85)",
              }}
              formatter={(v: number) => [`₱${v.toFixed(2)}`, "Gain/Loss"]}
            />
            <Legend
              wrapperStyle={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}
            />
            <Line
              dataKey="gain_loss_php"
              dot={false}
              name="₱ Gain/Loss"
              stroke="#F59E0B"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
