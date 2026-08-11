"use client";
import { useEffect, useState } from "react";
import {
  Alert as MantineAlert,
  Card,
  Center,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { CheckCircle2, TriangleAlert, Trash2 } from "lucide-react";

import { addToast } from "@/lib/toast";
import { admin, type Alert } from "@/lib/api";

// Real vocabulary the backend emits (src/routes/admin.ts GET /alerts):
// "critical" (bin >= 95%) and "high" (kiosk offline) both map to the
// spec's "red = critical/offline" convention; "medium" (bin 80-94%) maps
// to "amber = degraded/warning". "error"/"warning" never occur - fixed
// 2026-08-11, this previously matched nothing so every real alert fell
// through to the neutral fallback below.
function severityColor(severity: string): string {
  if (severity === "critical" || severity === "high") return "dangerRed";
  if (severity === "medium") return "warningAmber";

  return "gray";
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin
      .alerts()
      .then(setAlerts)
      .catch(() =>
        addToast({ title: "Failed to load alerts", color: "danger" }),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack gap="lg" p={{ base: "md", md: "xl" }}>
      <div>
        <Title order={2}>Alerts &amp; Faults</Title>
        <Text c="dimmed" size="sm">
          Active system alerts and kiosk faults
        </Text>
      </div>

      <Skeleton radius="md" visible={loading}>
        {!loading && alerts.length === 0 && (
          <Card withBorder p="xl" radius="md">
            <Center>
              <Stack align="center" gap={4}>
                <CheckCircle2
                  color="var(--mantine-color-successLime-6)"
                  size={32}
                />
                <Text c="successLime" fw={600} size="sm">
                  All systems nominal
                </Text>
                <Text c="dimmed" size="xs">
                  No active alerts
                </Text>
              </Stack>
            </Center>
          </Card>
        )}

        <Stack gap="sm">
          {alerts.map((a, i) => (
            <MantineAlert
              key={i}
              color={severityColor(a.severity)}
              icon={
                a.type === "offline" ? (
                  <TriangleAlert size={18} />
                ) : (
                  <Trash2 size={18} />
                )
              }
              title={a.message}
              variant="light"
            >
              <Text c="dimmed" size="xs">
                📍 {a.kiosk_name} · {new Date(a.timestamp).toLocaleString()}
              </Text>
            </MantineAlert>
          ))}
        </Stack>
      </Skeleton>
    </Stack>
  );
}
