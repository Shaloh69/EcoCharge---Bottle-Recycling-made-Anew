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
import { ChartColumnBig } from "lucide-react";

import { addToast } from "@/lib/toast";
import { admin, type Analytics } from "@/lib/api";

/**
 * A chart card that degrades to a real, labelled empty state.
 *
 * Real gap found 2026-08-11 on a live screenshot: with no rows in the window,
 * every chart on this page rendered as a blank card with a faint grid line and
 * nothing else — indistinguishable from a chart that failed to load.
 * docs/planning/02-design-mandate.md SS0 draws this line explicitly ("an
 * empty-state table row is fine; a missing chart entirely is not"), so an empty
 * range now says so in words instead of showing an empty box.
 */
function ChartCard({
  title,
  subtitle,
  isEmpty,
  children,
}: {
  title: string;
  subtitle?: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card withBorder p="lg" radius="sm">
      <Text c="dimmed" fw={600} size="sm">
        {title}
      </Text>
      {subtitle && (
        <Text c="dimmed" mt={2} size="xs">
          {subtitle}
        </Text>
      )}
      <div style={{ marginTop: 16 }}>
        {isEmpty ? (
          <div
            style={{
              height: 240,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              border: "1px dashed #1A2420",
              borderRadius: 4,
            }}
          >
            <ChartColumnBig color="#3F5249" size={22} />
            <Text size="sm" style={{ color: "#8FA69B" }}>
              No activity recorded in this period
            </Text>
            <Text size="xs" style={{ color: "#5C7268" }}>
              Charts populate once kiosks report real telemetry.
            </Text>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

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
  // "No rows at all" and "rows that are all zero" both read as an empty chart
  // to a viewer, so treat them the same way.
  const isEmpty =
    days.length === 0 ||
    days.every(
      (d) => d.kwh_consumed === 0 && d.credits_issued === 0 && d.gain_loss_php === 0,
    );

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
          {/* Totals wear the primary text token. Only Net Gain/Loss carries a
              hue, because there the sign genuinely is the meaning — the other
              two were green purely for decoration, which SS2 forbids (a 0.00
              kWh total is not a "healthy" reading). */}
          {[
            {
              label: "Total kWh Consumed",
              value: totalKwh.toFixed(2),
              sub: "kWh over 30 days",
              color: "#E7F0EB",
            },
            {
              label: "Credits Issued",
              value: String(totalCredits),
              sub: "total credits awarded",
              color: "#E7F0EB",
            },
            {
              label: "Net Gain / Loss",
              value: `${totalGainLoss >= 0 ? "+" : ""}₱${totalGainLoss.toFixed(2)}`,
              sub: "PHP over 30 days",
              color:
                totalGainLoss > 0
                  ? "#4ADE80"
                  : totalGainLoss < 0
                    ? "#F87171"
                    : "#E7F0EB",
            },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} withBorder p="lg" radius="sm">
              <Text
                c="dimmed"
                fw={600}
                size="10px"
                style={{ letterSpacing: "0.16em" }}
                tt="uppercase"
              >
                {label}
              </Text>
              <Text
                ff="var(--font-mono)"
                fw={700}
                mt={6}
                size="1.75rem"
                style={{ color, letterSpacing: "-0.02em" }}
              >
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
        <ChartCard isEmpty={isEmpty} title="Daily Energy Consumption (kWh)">
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
        </ChartCard>
      </Skeleton>

      <Skeleton radius="md" visible={loading}>
        <ChartCard isEmpty={isEmpty} title="Daily Credits Issued">
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
        </ChartCard>
      </Skeleton>

      <Skeleton radius="md" visible={loading}>
        <ChartCard
          isEmpty={isEmpty}
          subtitle="Positive = revenue from charging credits > electricity cost. Negative = subsidizing users."
          title="Daily Gain / Loss (PHP)"
        >
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
        </ChartCard>
      </Skeleton>
    </Stack>
  );
}
