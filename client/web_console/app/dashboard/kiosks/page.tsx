"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { ChevronRight, Plus } from "lucide-react";

import { addToast } from "@/lib/toast";
import { admin, type Kiosk } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BinGauge } from "@/components/admin/BinGauge";

// A card-per-kiosk layout, not the shared DataTable, is deliberate here —
// unlike the flat data pages (deposits/charging/credits/...), a kiosk needs
// room for its bin gauge + status + location together, which a table row
// doesn't showcase well. Real Mantine primitives throughout, no
// glassmorphism/backdrop-blur (the pre-Mantine-rebuild version of this page
// had both).
export default function KiosksPage() {
  const router = useRouter();
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  useEffect(() => {
    admin
      .kiosks()
      .then(setKiosks)
      .catch(() =>
        addToast({ title: "Failed to load kiosks", color: "danger" }),
      )
      .finally(() => setLoading(false));
  }, []);

  const createKiosk = async () => {
    if (!newName.trim() || !newLocation.trim()) {
      addToast({ title: "Name and location are required", color: "warning" });

      return;
    }
    try {
      const k = await admin.createKiosk(newName.trim(), newLocation.trim());

      setNewApiKey((k as Kiosk & { api_key: string }).api_key);
      setKiosks((prev) => [...prev, k]);
      setNewName("");
      setNewLocation("");
    } catch (err) {
      addToast({ title: (err as Error).message, color: "danger" });
    }
  };

  return (
    <Stack gap="lg" p={{ base: "md", md: "xl" }}>
      <Group align="flex-start" justify="space-between">
        <div>
          <Title order={2}>Kiosks</Title>
          <Text c="dimmed" size="sm">
            All registered kiosk units
          </Text>
        </div>
        <Button
          color="voltTeal"
          leftSection={<Plus size={16} />}
          onClick={() => {
            setCreating(true);
            setNewApiKey(null);
          }}
        >
          New Kiosk
        </Button>
      </Group>

      {creating && (
        <Card withBorder p="lg" radius="md">
          <Text fw={600} mb="sm" size="sm">
            Create New Kiosk
          </Text>
          {newApiKey ? (
            <Stack gap="sm">
              <Text c="dimmed" size="xs">
                Kiosk created! Copy this API key and flash it as{" "}
                <Text c="voltTeal" component="code">
                  DEVICE_API_KEY
                </Text>{" "}
                in the ESP firmware. It will not be shown again.
              </Text>
              <Text
                ff="var(--font-mono)"
                p="xs"
                size="xs"
                style={{
                  wordBreak: "break-all",
                  background: "var(--mantine-color-default)",
                  borderRadius: 8,
                }}
              >
                {newApiKey}
              </Text>
              <Button
                color="gray"
                size="xs"
                variant="default"
                onClick={() => {
                  setCreating(false);
                  setNewApiKey(null);
                }}
              >
                Done
              </Button>
            </Stack>
          ) : (
            <Stack gap="sm">
              <TextInput
                placeholder="Kiosk name (e.g. Kiosk-002)"
                value={newName}
                onChange={(e) => setNewName(e.currentTarget.value)}
              />
              <TextInput
                placeholder="Location (e.g. Building B Lobby)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.currentTarget.value)}
              />
              <Group gap="xs">
                <Button color="voltTeal" size="xs" onClick={createKiosk}>
                  Create
                </Button>
                <Button
                  color="gray"
                  size="xs"
                  variant="default"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          )}
        </Card>
      )}

      <Skeleton radius="md" visible={loading}>
        <Stack gap="md">
          {kiosks.length === 0 && !loading && (
            <Card withBorder p="xl" radius="md">
              <Text c="dimmed" size="sm" ta="center">
                No kiosks found. Create one above.
              </Text>
            </Card>
          )}
          {kiosks.map((k) => (
            <Card
              key={k.id}
              withBorder
              component="button"
              p="lg"
              radius="md"
              style={{ cursor: "pointer", textAlign: "left" }}
              onClick={() => router.push(`/dashboard/kiosks/${k.id}`)}
            >
              <Group align="flex-start" justify="space-between" mb="md">
                <div>
                  <Text fw={700} size="md">
                    {k.name}
                  </Text>
                  <Text c="dimmed" mt={2} size="xs">
                    📍 {k.location}
                  </Text>
                  <Text c="dimmed" mt={4} size="10px">
                    Last seen:{" "}
                    {k.last_seen_at
                      ? new Date(k.last_seen_at).toLocaleString()
                      : "Never"}
                  </Text>
                </div>
                <Group gap="xs">
                  <StatusBadge status={k.status} />
                  <ChevronRight color="var(--mantine-color-dimmed)" size={16} />
                </Group>
              </Group>
              <BinGauge level={k.bin_level ?? 0} />
              <Text c="dimmed" mt="xs" size="10px" ta="right">
                Click to manage →
              </Text>
            </Card>
          ))}
        </Stack>
      </Skeleton>
    </Stack>
  );
}
