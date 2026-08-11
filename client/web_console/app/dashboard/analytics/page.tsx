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
import { Card, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";

import { addToast } from "@/lib/toast";
import { admin, type Analytics } from "@/lib/api";

// Mono axis numerals per docs/planning/02-design-mandate.md SS3 - was the
// browser default sans-serif before 2026-08-11, not the theme's IBM Plex
// Mono family used everywhere else numbers appear on this surface.
const monoTick = {
  fontSize: 11,
  fill: "var(--mantine-color-dimmed)",
  fontFamily: "var(--mantine-font-family-monospace)",
};

const tooltipStyle = {
  background: "var(--mantine-color-body)",
  border: "1px solid var(--mantine-color-default-border)",
  borderRadius: 12,
  fontSize: 12,
} as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin
      .analytics()
      .then(setData)
      .catch(() =>
        addToast({ title: "Failed to load analytics", color: "danger" }),
      )
      .finally(() => setLoading(false));
  }, []);

  const days = data?.days ?? [];
  const totalKwh = days.reduce((s, d) => s + d.kwh_consumed, 0);
  const totalCredits = days.reduce((s, d) => s + d.credits_issued, 0);
  const totalGainLoss = days.reduce((s, d) => s + d.gain_loss_php, 0);

  return (
    <Stack gap="lg" p={{ base: "md", md: "xl" }}>
      <div>
        <Title order={2}>Analytics</Title>
        <Text c="dimmed" size="sm">
          Last 30 days · system-wide
        </Text>
      </div>

      <Skeleton radius="md" visible={loading}>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {[
            {
              label: "Total kWh Consumed",
              value: totalKwh.toFixed(2),
              sub: "kWh over 30 days",
              color: "ecoGreen",
            },
            {
              label: "Credits Issued",
              value: String(totalCredits),
              sub: "total credits awarded",
              color: "successLime",
            },
            {
              label: "Net Gain / Loss",
              value: `${totalGainLoss >= 0 ? "+" : ""}₱${totalGainLoss.toFixed(2)}`,
              sub: "PHP over 30 days",
              color: totalGainLoss >= 0 ? "successLime" : "dangerRed",
            },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} withBorder p="lg" radius="md">
              <Text
                c="dimmed"
                fw={600}
                size="10px"
                style={{ letterSpacing: "0.08em" }}
                tt="uppercase"
              >
                {label}
              </Text>
              <Text c={color} ff="monospace" fw={800} mt={4} size="1.75rem">
                {value}
              </Text>
              <Text c="dimmed" mt={2} size="xs">
                {sub}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Skeleton>

      <Skeleton radius="md" visible={loading}>
        <Card withBorder p="lg" radius="md">
          <Text c="dimmed" fw={600} mb="md" size="sm">
            Daily Energy Consumption (kWh)
          </Text>
          <ResponsiveContainer height={240} width="100%">
            <BarChart
              data={days}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--mantine-color-default-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={monoTick}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={monoTick} width={40} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v.toFixed(3)} kWh`, "Energy"]}
              />
              <Bar
                dataKey="kwh_consumed"
                fill="var(--mantine-color-ecoGreen-6)"
                name="kWh"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Skeleton>

      <Skeleton radius="md" visible={loading}>
        <Card withBorder p="lg" radius="md">
          <Text c="dimmed" fw={600} mb="md" size="sm">
            Daily Credits Issued
          </Text>
          <ResponsiveContainer height={240} width="100%">
            <BarChart
              data={days}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--mantine-color-default-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={monoTick}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={monoTick} width={40} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [v, "Credits"]}
              />
              <Bar
                dataKey="credits_issued"
                fill="var(--mantine-color-successLime-6)"
                name="Credits"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Skeleton>

      <Skeleton radius="md" visible={loading}>
        <Card withBorder p="lg" radius="md">
          <Text c="dimmed" fw={600} size="sm">
            Daily Gain / Loss (PHP)
          </Text>
          <Text c="dimmed" mb="md" size="xs">
            Positive = revenue from charging credits &gt; electricity cost.
            Negative = subsidizing users.
          </Text>
          <ResponsiveContainer height={240} width="100%">
            <LineChart
              data={days}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--mantine-color-default-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={monoTick}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={monoTick} width={40} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`₱${v.toFixed(2)}`, "Gain/Loss"]}
              />
              <Legend
                wrapperStyle={{
                  color: "var(--mantine-color-dimmed)",
                  fontSize: 12,
                }}
              />
              <Line
                dataKey="gain_loss_php"
                dot={false}
                name="₱ Gain/Loss"
                stroke="var(--mantine-color-warningAmber-5)"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Skeleton>
    </Stack>
  );
}
