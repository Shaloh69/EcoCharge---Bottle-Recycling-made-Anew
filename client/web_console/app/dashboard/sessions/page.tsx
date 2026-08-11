"use client";
import { useEffect, useState } from "react";
import { Skeleton, Stack, Text, Title } from "@mantine/core";

import { addToast } from "@/lib/toast";
import { admin, type KioskSession } from "@/lib/api";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";

// Real gap found and fixed 2026-08-11: this page rendered entirely
// hardcoded mock rows ("Taylor S.", "S001", fixed 10:30 AM timestamps) and
// never called the real admin.sessions() endpoint that already existed in
// lib/api.ts. KioskSession only tracks id/user_id/kiosk_id/started_at/
// ended_at (a session is just "a user's visit," separate from
// BottleDeposit/ChargingSession) - the mock's bottles/credits/port columns
// don't correspond to real fields on this model, so they're dropped rather
// than faked.
const columns: DataTableColumn<KioskSession>[] = [
  { key: "id", label: "ID", mono: true, render: (s) => `#${s.id}` },
  { key: "user", label: "User", render: (s) => `User #${s.user_id}` },
  { key: "kiosk", label: "Kiosk", render: (s) => `Kiosk #${s.kiosk_id}` },
  {
    key: "started",
    label: "Started",
    render: (s) => new Date(s.started_at).toLocaleString(),
  },
  {
    key: "ended",
    label: "Ended",
    render: (s) => (s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"),
  },
  {
    key: "status",
    label: "Status",
    render: (s) => <StatusBadge status={s.ended_at ? "completed" : "active"} />,
  },
];

export default function SessionsPage() {
  const [sessions, setSessions] = useState<KioskSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin
      .sessions()
      .then((r) => setSessions(r.sessions ?? []))
      .catch(() =>
        addToast({ title: "Failed to load sessions", color: "danger" }),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack gap="lg" p={{ base: "md", md: "xl" }}>
      <div>
        <Title order={2}>Sessions</Title>
        <Text c="dimmed" size="sm">
          Kiosk interaction sessions
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
