"use client";
import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { CreditCard, MapPin, Recycle, Server, Zap } from "lucide-react";

import { addToast } from "@/lib/toast";
import { StatsCard } from "@/components/admin/StatsCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BinGauge } from "@/components/admin/BinGauge";
import { PulseValue } from "@/components/admin/PulseValue";
import {
  admin,
  openAdminSSE,
  type Overview,
  type Kiosk,
  type SseEvent,
  type TelemetryPort,
} from "@/lib/api";

interface KioskTelemetry {
  portData: TelemetryPort[];
  binLevel: number;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<Record<number, KioskTelemetry>>(
    {},
  );
  const [live, setLive] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);
  const totalKiosks = kiosks.length;

  useEffect(() => {
    Promise.all([
      admin.overview().then(setOverview),
      admin.kiosks().then(setKiosks),
    ])
      .catch(() =>
        addToast({ title: "Failed to load overview", color: "danger" }),
      )
      .finally(() => setLoading(false));

    closeRef.current = openAdminSSE(
      (event: SseEvent) => {
        setLive(true);
        if (event.type === "telemetry" && event.kioskId != null) {
          setTelemetry((prev) => ({
            ...prev,
            [event.kioskId!]: {
              portData: event.portData ?? [],
              binLevel: event.binLevel ?? 0,
            },
          }));
        }
        if (event.type === "overview") {
          setOverview((prev) =>
            prev
              ? {
                  ...prev,
                  kiosks_online: event.kiosks_online ?? prev.kiosks_online,
                  active_charging:
                    event.active_charging ?? prev.active_charging,
                  total_credits_earned:
                    event.total_credits_earned ?? prev.total_credits_earned,
                  total_deposits: event.total_deposits ?? prev.total_deposits,
                  total_users: event.total_users ?? prev.total_users,
                }
              : prev,
          );
        }
      },
      () => {
        setLive(false);
        addToast({
          title: "Live feed disconnected",
          description: "Attempting to reconnect…",
          color: "warning",
        });
      },
      // Connected — independent of whether any telemetry has arrived yet.
      () => setLive(true),
    );

    return () => closeRef.current?.();
  }, []);

  return (
    <Stack gap="xl" p={{ base: "md", md: "xl" }}>
      <Group justify="space-between">
        <div>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">
            EcoCharge system overview
          </Text>
        </div>
        <Badge
          color={live ? "successLime" : "gray"}
          leftSection={
            <span
              className={live ? "pulse-glow" : undefined}
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "currentColor",
              }}
            />
          }
          size="lg"
          variant="light"
        >
          {live ? "Live" : "Connecting…"}
        </Badge>
      </Group>

      <Skeleton radius="md" visible={loading}>
        <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="md">
          <PulseValue value={overview?.kiosks_online ?? "—"}>
            <StatsCard
              icon={<Server size={13} />}
              subtitle={
                totalKiosks > 0 ? `of ${totalKiosks} in fleet` : "active now"
              }
              title="Kiosks Online"
              // Real semantics, not decoration: a fleet with nothing online is
              // a critical condition, not a green one.
              tone={
                overview == null
                  ? "neutral"
                  : overview.kiosks_online === 0
                    ? "critical"
                    : overview.kiosks_online < totalKiosks
                      ? "warning"
                      : "good"
              }
              value={overview?.kiosks_online ?? "—"}
            />
          </PulseValue>
          <PulseValue value={overview?.total_deposits ?? "—"}>
            <StatsCard
              icon={<Recycle size={13} />}
              subtitle="all time"
              title="Total Deposits"
              value={overview?.total_deposits ?? "—"}
            />
          </PulseValue>
          <PulseValue value={overview?.total_credits_earned ?? "—"}>
            <StatsCard
              icon={<CreditCard size={13} />}
              subtitle="minutes earned"
              title="Credits Issued"
              value={overview?.total_credits_earned ?? "—"}
            />
          </PulseValue>
          <PulseValue value={overview?.active_charging ?? "—"}>
            <StatsCard
              icon={<Zap size={13} />}
              subtitle="charging now"
              title="Active Charging"
              // Amber is this product's "live power" accent (SS2) and is
              // genuinely meaningful here: ports are drawing current right now.
              tone={
                overview != null && overview.active_charging > 0
                  ? "warning"
                  : "neutral"
              }
              value={overview?.active_charging ?? "—"}
            />
          </PulseValue>
        </SimpleGrid>
      </Skeleton>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        <Stack gap="md" style={{ gridColumn: "span 2" }}>
          <Group gap="xs">
            <Text c="dimmed" fw={600} size="sm">
              Live Kiosk Telemetry
            </Text>
            {live && (
              <Badge color="successLime" size="xs" variant="light">
                ● streaming
              </Badge>
            )}
          </Group>

          <Skeleton radius="md" visible={loading}>
            {!loading && kiosks.length === 0 && (
              <Card withBorder p="xl" radius="md">
                <Text c="dimmed" size="sm" ta="center">
                  No kiosks found.
                </Text>
              </Card>
            )}
            <Stack gap="md">
              {kiosks.map((k) => {
                const tel = telemetry[k.id];

                return (
                  <Card key={k.id} withBorder p="lg" radius="md">
                    <Group justify="space-between" mb="md">
                      <div>
                        <Text fw={700} size="md">
                          {k.name}
                        </Text>
                        <Group gap={4} mt={3}>
                          <MapPin color="#5C7268" size={11} />
                          <Text c="dimmed" size="xs">
                            {k.location}
                          </Text>
                        </Group>
                      </div>
                      <StatusBadge status={k.status} />
                    </Group>
                    {tel ? (
                      <>
                        <SimpleGrid
                          cols={{ base: 2, sm: 4 }}
                          mb="md"
                          spacing="sm"
                        >
                          {tel.portData.map((p) => (
                            <PulseValue
                              key={p.port}
                              value={`${p.voltage_v}-${p.current_a}`}
                            >
                              <Card
                                bg={
                                  p.relay_on
                                    ? "var(--mantine-color-successLime-light)"
                                    : "var(--mantine-color-default)"
                                }
                                p="sm"
                                radius="md"
                              >
                                <Group justify="space-between" mb={4}>
                                  <Text
                                    c="dimmed"
                                    fw={600}
                                    size="10px"
                                    tt="uppercase"
                                  >
                                    Port {p.port}
                                  </Text>
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      background: p.relay_on
                                        ? "var(--mantine-color-successLime-6)"
                                        : "var(--mantine-color-default-border)",
                                    }}
                                  />
                                </Group>
                                <Text
                                  c={p.relay_on ? "successLime" : "dimmed"}
                                  ff="var(--font-mono)"
                                  fw={700}
                                  size="md"
                                >
                                  {(p.voltage_v * p.current_a).toFixed(1)}W
                                </Text>
                                <Text
                                  c="dimmed"
                                  ff="var(--font-mono)"
                                  mt={2}
                                  size="10px"
                                >
                                  {p.current_a.toFixed(2)}A ·{" "}
                                  {p.voltage_v.toFixed(1)}V
                                </Text>
                              </Card>
                            </PulseValue>
                          ))}
                        </SimpleGrid>
                        <Group justify="space-between" mb={6}>
                          <Text c="dimmed" size="10px">
                            Bin Level
                          </Text>
                          <Text c="dimmed" ff="var(--font-mono)" size="10px">
                            {tel.binLevel}%
                          </Text>
                        </Group>
                        <BinGauge level={tel.binLevel} />
                      </>
                    ) : (
                      <Text c="dimmed" size="sm">
                        Waiting for telemetry…
                      </Text>
                    )}
                  </Card>
                );
              })}
            </Stack>
          </Skeleton>
        </Stack>

        <Stack gap="md">
          <Skeleton radius="md" visible={loading}>
            <Card withBorder p="lg" radius="md">
              <Text c="dimmed" fw={600} mb="md" size="sm">
                Summary
              </Text>
              <Stack gap="sm">
                {/* Values wear the primary *text* token, not a per-row hue.
                    The previous version painted each row a different colour
                    (violet / teal / lime / amber) purely to differentiate rows
                    — decoration wearing the status palette, which SS2 forbids
                    and the `dataviz` skill calls out explicitly ("text wears
                    text tokens, never the series color"). Amber stays on
                    Active Charging only, where it genuinely means live power. */}
                {[
                  {
                    label: "Total Users",
                    value: overview?.total_users ?? "—",
                    live: false,
                  },
                  {
                    label: "Total Deposits",
                    value: overview?.total_deposits ?? "—",
                    live: false,
                  },
                  {
                    label: "Credits Earned",
                    value: overview?.total_credits_earned ?? "—",
                    live: false,
                  },
                  {
                    label: "Active Charging",
                    value: overview?.active_charging ?? "—",
                    live: (overview?.active_charging ?? 0) > 0,
                  },
                ].map(({ label, value, live: isLive }) => (
                  <Group key={label} justify="space-between">
                    <Text c="dimmed" size="xs">
                      {label}
                    </Text>
                    <PulseValue value={value}>
                      <Text
                        ff="var(--font-mono)"
                        fw={700}
                        size="sm"
                        style={{ color: isLive ? "#FBBF24" : "#E7F0EB" }}
                      >
                        {value}
                      </Text>
                    </PulseValue>
                  </Group>
                ))}
              </Stack>
            </Card>
          </Skeleton>

          <Skeleton radius="md" visible={loading}>
            <Card withBorder p="lg" radius="md">
              <Text c="dimmed" fw={600} mb="md" size="sm">
                Kiosk Status
              </Text>
              <Stack gap="sm">
                {kiosks.map((k) => (
                  <Group key={k.id} justify="space-between">
                    <Text size="xs">{k.name}</Text>
                    <StatusBadge status={k.status} />
                  </Group>
                ))}
                {kiosks.length === 0 && (
                  <Text c="dimmed" size="xs">
                    No kiosks
                  </Text>
                )}
              </Stack>
            </Card>
          </Skeleton>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
