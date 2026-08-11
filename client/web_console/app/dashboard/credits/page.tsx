"use client";
import { useEffect, useState } from "react";
import { Skeleton, Stack, Text, Title } from "@mantine/core";

import { addToast } from "@/lib/toast";
import { admin, type Transaction } from "@/lib/api";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";

const columns: DataTableColumn<Transaction>[] = [
  { key: "id", label: "ID", mono: true, render: (t) => `#${t.id}` },
  { key: "user", label: "User", render: (t) => `User #${t.user_id}` },
  {
    key: "type",
    label: "Type",
    render: (t) => (
      <StatusBadge status={t.type === "EARN" ? "earn" : "spend"} />
    ),
  },
  {
    key: "amount",
    label: "Amount",
    mono: true,
    render: (t) => (
      <Text
        c={t.type === "EARN" ? "successLime" : "dangerRed"}
        fw={700}
        size="xs"
      >
        {t.type === "EARN" ? "+" : "-"}
        {t.amount} min
      </Text>
    ),
  },
  {
    key: "balance",
    label: "Balance After",
    mono: true,
    render: (t) => (
      <Text c="warningAmber" fw={600} size="xs">
        {t.balance_after} min
      </Text>
    ),
  },
  {
    key: "time",
    label: "Time",
    render: (t) => new Date(t.timestamp).toLocaleString(),
  },
];

export default function CreditsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin
      .transactions()
      .then((r) => setTxns(r.transactions ?? []))
      .catch(() =>
        addToast({ title: "Failed to load transactions", color: "danger" }),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack gap="lg" p={{ base: "md", md: "xl" }}>
      <div>
        <Title order={2}>Credit Ledger</Title>
        <Text c="dimmed" size="sm">
          All credit earn and spend transactions
        </Text>
      </div>

      <Skeleton radius="md" visible={loading}>
        <DataTable
          columns={columns}
          data={txns}
          emptyMessage="No transactions yet"
          getRowKey={(t) => t.id}
        />
      </Skeleton>
    </Stack>
  );
}
