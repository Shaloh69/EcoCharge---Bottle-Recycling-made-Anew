"use client";

import { useEffect, useState } from "react";
import { Alert, Group, Text } from "@mantine/core";
import { AlertTriangle } from "lucide-react";

import { admin, type Alert as AlertRecord } from "@/lib/api";

/**
 * Sticky alert strip — docs/planning/02-design-mandate.md SS3: shown when
 * any kiosk is offline or a bin is >= 95%, red, does not auto-dismiss.
 * Polls the same /admin/alerts endpoint the alerts page uses, on a 30s
 * interval — cheap enough to run globally without needing a dedicated SSE
 * channel just for this banner.
 */
export function StickyAlertStrip() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      admin
        .alerts()
        .then((data) => {
          if (!cancelled) setAlerts(data);
        })
        .catch(() => {
          /* best-effort - a failed alert fetch shouldn't itself alarm the UI */
        });
    };

    poll();
    const id = setInterval(poll, 30000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // "critical" = bin >= 95%, "high" = kiosk offline — exactly the two
  // conditions docs/planning/02-design-mandate.md §3 specifies for this
  // strip. "error"/"warning" never occur in the real payload (fixed
  // 2026-08-11 — this filter matched nothing, so the strip never fired,
  // even for the real offline kiosk it exists to flag).
  const critical = alerts.filter(
    (a) => a.severity === "critical" || a.severity === "high",
  );

  if (critical.length === 0) return null;

  const summary =
    critical.length === 1
      ? critical[0].message
      : `${critical.length} critical alerts — ${critical[0].message}`;

  return (
    <Alert
      color="dangerRed"
      icon={<AlertTriangle size={18} />}
      radius={0}
      styles={{ root: { position: "sticky", top: 0, zIndex: 100 } }}
      variant="filled"
    >
      <Group justify="space-between" wrap="nowrap">
        <Text fw={600} size="sm">
          {summary}
        </Text>
        <Text opacity={0.8} size="xs">
          {critical.length > 1 ? `+${critical.length - 1} more` : ""}
        </Text>
      </Group>
    </Alert>
  );
}
