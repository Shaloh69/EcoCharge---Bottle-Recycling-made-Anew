"use client";
import { useEffect, useState } from "react";
import { Skeleton, Stack, Text, Title } from "@mantine/core";

import { addToast } from "@/lib/toast";
import { admin, type ChargingSession } from "@/lib/api";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";

const columns: DataTableColumn<ChargingSession>[] = [
  { key: "id", label: "ID", mono: true, render: (s) => `#${s.id}` },
  { key: "kiosk", label: "Kiosk", render: (s) => `Kiosk #${s.kiosk_id}` },
  { key: "port", label: "Port", render: (s) => `Port ${s.port_number}` },
  {
    key: "credits",
    label: "Credits",
    mono: true,
    render: (s) => (
      <Text c="warningAmber" fw={700} size="xs">
        {s.credits_used} min
      </Text>
    ),
  },
  {
    key: "duration",
    label: "Duration",
    mono: true,
    render: (s) => `${Math.round(s.duration_seconds / 60)} min`,
  },
  {
    key: "status",
    label: "Status",
    render: (s) => (
      <StatusBadge
        label={s.status}
        status={s.status === "active" ? "active" : "idle"}
      />
    ),
  },
  {
    key: "started",
    label: "Started",
    render: (s) => new Date(s.started_at).toLocaleString(),
  },
];

export default function ChargingPage() {
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin
      .charging()
      .then((r) => setSessions(r.items))
      .catch(() =>
        addToast({
          title: "Failed to load charging sessions",
          color: "danger",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack gap="lg" p={{ base: "md", md: "xl" }}>
      <div>
        <Title order={2}>Charging Sessions</Title>
        <Text c="dimmed" size="sm">
          All charging sessions across kiosks
        </Text>
      </div>

      <Skeleton radius="md" visible={loading}>
        <DataTable
          columns={columns}
          data={sessions}
          emptyMessage="No sessions yet"
          getRowKey={(s) => s.id}
        />
      </Skeleton>
    </Stack>
  );
}
