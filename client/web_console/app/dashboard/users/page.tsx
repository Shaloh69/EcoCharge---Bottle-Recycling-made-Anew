"use client";
import { useEffect, useState } from "react";
import { Badge, Skeleton, Stack, Text, Title } from "@mantine/core";

import { addToast } from "@/lib/toast";
import { admin, type User } from "@/lib/api";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";

const columns: DataTableColumn<User>[] = [
  { key: "id", label: "ID", mono: true, render: (u) => `#${u.id}` },
  {
    key: "name",
    label: "Name",
    render: (u) => (
      <Text fw={600} size="sm">
        {u.name}
      </Text>
    ),
  },
  { key: "email", label: "Email", render: (u) => u.email },
  { key: "phone", label: "Phone", render: (u) => u.phone ?? "—" },
  {
    key: "balance",
    label: "Balance",
    mono: true,
    render: (u) => (
      <Text c="bloomViolet" fw={700} size="xs">
        {u.credit_balance} min
      </Text>
    ),
  },
  {
    key: "admin",
    label: "Admin",
    render: (u) =>
      u.is_admin ? (
        <Badge color="bloomViolet" radius="sm" size="sm" variant="light">
          Admin
        </Badge>
      ) : (
        <Text c="dimmed">—</Text>
      ),
  },
  {
    key: "joined",
    label: "Joined",
    render: (u) => new Date(u.created_at).toLocaleDateString(),
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin
      .users()
      .then(setUsers)
      .catch(() => addToast({ title: "Failed to load users", color: "danger" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack gap="lg" p={{ base: "md", md: "xl" }}>
      <div>
        <Title order={2}>Users</Title>
        <Text c="dimmed" size="sm">
          Registered user accounts
        </Text>
      </div>

      <Skeleton radius="md" visible={loading}>
        <DataTable
          columns={columns}
          data={users}
          emptyMessage="No users found"
          getRowKey={(u) => u.id}
        />
      </Skeleton>
    </Stack>
  );
}
