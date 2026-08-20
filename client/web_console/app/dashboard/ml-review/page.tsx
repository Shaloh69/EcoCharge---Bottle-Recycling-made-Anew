"use client";
import { useEffect, useState } from "react";
import { Skeleton, Stack, Text, Title } from "@mantine/core";

import { addToast } from "@/lib/toast";
import { admin, type Deposit } from "@/lib/api";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";

const columns: DataTableColumn<Deposit>[] = [
  { key: "id", label: "ID", mono: true, render: (d) => `#${d.id}` },
  {
    key: "time",
    label: "Time",
    render: (d) => new Date(d.timestamp).toLocaleString(),
  },
  { key: "brand", label: "Brand", render: (d) => d.brand },
  {
    key: "volume",
    label: "Volume",
    mono: true,
    render: (d) => `${d.volume_ml}ml`,
  },
  {
    key: "condition",
    label: "Condition",
    render: (d) => (
      <StatusBadge
        label={d.condition}
        status={d.condition === "perfect" ? "confirmed" : "warning"}
      />
    ),
  },
  {
    key: "confidence",
    label: "Confidence",
    mono: true,
    render: (d) => (
      <Text c="warningAmber" fw={700} size="xs">
        {Math.round(d.confidence * 100)}%
      </Text>
    ),
  },
  {
    key: "credits",
    label: "Credits",
    mono: true,
    render: (d) => (
      <Text c="successLime" fw={700} size="xs">
        +{d.credits_awarded} min
      </Text>
    ),
  },
];

export default function MLReviewPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin
      .mlReview()
      .then((r) => setDeposits(r.items))
      .catch(() =>
        addToast({ title: "Failed to load ML review queue", color: "danger" }),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack gap="lg" p={{ base: "md", md: "xl" }}>
      <div>
        <Title order={2}>ML Review</Title>
        <Text c="dimmed" size="sm">
          Deposits with confidence below 70% — may need manual verification
        </Text>
      </div>

      <Skeleton radius="md" visible={loading}>
        <DataTable
          columns={columns}
          data={deposits}
          emptyMessage="No low-confidence deposits"
          getRowKey={(d) => d.id}
        />
      </Skeleton>
    </Stack>
  );
}
