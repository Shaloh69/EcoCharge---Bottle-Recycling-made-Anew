"use client";
import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Center,
  Group,
  Loader,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { addToast } from "@/lib/toast";
import {
  admin,
  type Kiosk,
  type KioskCommand,
  type TelemetryPort,
} from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BinGauge } from "@/components/admin/BinGauge";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// Real command status -> StatusBadge mapping, per docs/planning/02-design-mandate.md
// SS3: "command PENDING (amber) / ACKED (green) / FAILED/EXPIRED (red)".
// This never existed before 2026-08-11 - the prior version of this page
// only distinguished ACKED (teal) from "anything else" (amber), so FAILED
// and EXPIRED commands rendered as if they were still pending.
function commandStatus(status: KioskCommand["status"]) {
  switch (status) {
    case "ACKED":
      return "acked" as const;
    case "FAILED":
      return "failed" as const;
    case "EXPIRED":
      return "expired" as const;
    default:
      return "pending" as const;
  }
}

function PortCard({
  port,
  data,
  onActivate,
  onDeactivate,
  busy,
}: {
  port: number;
  data?: TelemetryPort;
  onActivate: (port: number, duration: number) => void;
  onDeactivate: (port: number) => void;
  busy: boolean;
}) {
  const [duration, setDuration] = useState(30);
  const on = data?.relay_on ?? false;

  return (
    <Card
      withBorder
      bg={on ? "var(--mantine-color-voltTeal-light)" : undefined}
      p="md"
      radius="md"
    >
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={700} size="sm">
            Port {port}
          </Text>
          <Text c={on ? "voltTeal" : "dimmed"} mt={2} size="10px">
            {on ? "CHARGING" : "IDLE"}
          </Text>
        </div>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: on
              ? "var(--mantine-color-voltTeal-6)"
              : "var(--mantine-color-default-border)",
          }}
        />
      </Group>

      {data && (
        <SimpleGrid cols={3} mb="sm" spacing={6}>
          {[
            { label: "V", value: data.voltage_v?.toFixed(1) ?? "—" },
            { label: "A", value: data.current_a?.toFixed(2) ?? "—" },
            {
              label: "W",
              value:
                data.voltage_v && data.current_a
                  ? (data.voltage_v * data.current_a).toFixed(1)
                  : "—",
            },
          ].map(({ label, value }) => (
            <Card
              key={label}
              bg="var(--mantine-color-default)"
              p={6}
              radius="sm"
            >
              <Text ff="var(--font-mono)" fw={700} size="xs" ta="center">
                {value}
              </Text>
              <Text c="dimmed" size="9px" ta="center">
                {label}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Group gap="xs" wrap="nowrap">
        <NativeSelect
          data={[15, 30, 60, 120, 300, 600, 900, 1800, 3600].map((s) => ({
            value: String(s),
            label: s < 60 ? `${s}s` : `${s / 60}m`,
          }))}
          disabled={on || busy}
          size="xs"
          style={{ flex: 1 }}
          value={duration}
          onChange={(e) => setDuration(Number(e.currentTarget.value))}
        />
        {on ? (
          <Button
            color="dangerRed"
            disabled={busy}
            size="xs"
            onClick={() => onDeactivate(port)}
          >
            Stop
          </Button>
        ) : (
          <Button
            color="voltTeal"
            disabled={busy}
            size="xs"
            onClick={() => onActivate(port, duration)}
          >
            Activate
          </Button>
        )}
      </Group>
    </Card>
  );
}

export default function KioskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const kioskId = parseInt(idStr);
  const router = useRouter();

  const [kiosk, setKiosk] = useState<(Kiosk & { api_key?: string }) | null>(
    null,
  );
  const [ports, setPorts] = useState<TelemetryPort[]>([]);
  const [binLevel, setBinLevel] = useState(0);
  const [fsmState, setFsmState] = useState<string>("—");
  const [bottleAtEntrance, setBottleAtEntrance] = useState(false);
  const [commands, setCommands] = useState<KioskCommand[]>([]);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [kiosks, hist] = await Promise.all([
        admin.kiosks(),
        admin.commandHistory(kioskId, 30),
      ]);
      const found = kiosks.find((k) => k.id === kioskId);

      if (found) {
        setKiosk(found as Kiosk & { api_key?: string });
        setEditName(found.name);
        setEditLocation(found.location);
      }
      setCommands(hist);
    } catch {
      addToast({ title: "Failed to load kiosk", color: "danger" });
    }
  }, [kioskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem("admin_token")
        : null;
    const es = new EventSource(
      `${API}/api/admin/sse${token ? `?token=${token}` : ""}`,
    );

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);

        if (ev.type === "telemetry" && ev.kioskId === kioskId) {
          if (ev.portData) setPorts(ev.portData);
          if (ev.binLevel !== undefined) setBinLevel(ev.binLevel);
          if (ev.fsmState) setFsmState(ev.fsmState);
          if (ev.bottleAtEntrance !== undefined)
            setBottleAtEntrance(ev.bottleAtEntrance);
        }
      } catch {
        /* ignore */
      }
    };

    return () => es.close();
  }, [kioskId]);

  const send = useCallback(
    async (type: string, payload?: object) => {
      setBusy(true);
      try {
        await admin.sendCommand(kioskId, type, payload);
        addToast({ title: `Command sent: ${type}`, color: "success" });
        setTimeout(refresh, 2500);
      } catch (err) {
        addToast({ title: (err as Error).message, color: "danger" });
      } finally {
        setBusy(false);
      }
    },
    [kioskId, refresh],
  );

  const saveEdit = async () => {
    try {
      await admin.updateKiosk(kioskId, {
        name: editName,
        location: editLocation,
      });
      addToast({ title: "Kiosk updated", color: "success" });
      setEditing(false);
      refresh();
    } catch (err) {
      addToast({ title: (err as Error).message, color: "danger" });
    }
  };

  const deleteKiosk = async () => {
    try {
      await admin.deleteKiosk(kioskId);
      addToast({ title: "Kiosk deleted", color: "success" });
      router.push("/dashboard/kiosks");
    } catch (err) {
      addToast({ title: (err as Error).message, color: "danger" });
    }
  };

  if (!kiosk) {
    return (
      <Center p="xl">
        <Loader color="ecoGreen" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" maw={960} p={{ base: "md", md: "xl" }}>
      <Group align="flex-start" justify="space-between" wrap="nowrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Button
            color="gray"
            leftSection={<ArrowLeft size={14} />}
            mb="xs"
            size="xs"
            variant="subtle"
            onClick={() => router.push("/dashboard/kiosks")}
          >
            Back to kiosks
          </Button>
          {editing ? (
            <Stack gap="xs">
              <TextInput
                placeholder="Kiosk name"
                value={editName}
                onChange={(e) => setEditName(e.currentTarget.value)}
              />
              <TextInput
                placeholder="Location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.currentTarget.value)}
              />
              <Group gap="xs">
                <Button color="voltTeal" size="xs" onClick={saveEdit}>
                  Save
                </Button>
                <Button
                  color="gray"
                  size="xs"
                  variant="default"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          ) : (
            <>
              <Title order={2}>{kiosk.name}</Title>
              <Text c="dimmed" size="sm">
                📍 {kiosk.location}
              </Text>
            </>
          )}
        </div>
        {!editing && (
          <Group gap="xs" wrap="nowrap">
            <StatusBadge status={kiosk.status} />
            <Button
              color="gray"
              size="xs"
              variant="default"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              color="dangerRed"
              size="xs"
              variant="light"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </Group>
        )}
      </Group>

      {showDeleteConfirm && (
        <Alert color="red" title="Confirm delete" variant="light">
          <Group justify="space-between">
            <Text size="sm">
              Delete <strong>{kiosk.name}</strong>? This cannot be undone.
            </Text>
            <Group gap="xs">
              <Button color="dangerRed" size="xs" onClick={deleteKiosk}>
                Yes, delete
              </Button>
              <Button
                color="gray"
                size="xs"
                variant="default"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </Group>
          </Group>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        {[
          { label: "Kiosk ID", value: `#${kiosk.id}` },
          { label: "FSM State", value: fsmState },
          {
            label: "Bottle at Entrance",
            value: bottleAtEntrance ? "YES" : "No",
          },
          {
            label: "Last Seen",
            value: kiosk.last_seen_at
              ? new Date(kiosk.last_seen_at).toLocaleTimeString()
              : "Never",
          },
        ].map(({ label, value }) => (
          <Card key={label} withBorder p="sm" radius="md">
            <Text
              c="dimmed"
              fw={600}
              size="10px"
              style={{ letterSpacing: "0.06em" }}
              tt="uppercase"
            >
              {label}
            </Text>
            <Text ff="var(--font-mono)" fw={700} mt={4} size="sm">
              {value}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Card withBorder p="lg" radius="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600} size="sm">
            Bin Level
          </Text>
          <Text
            c={
              binLevel >= 95
                ? "dangerRed"
                : binLevel >= 80
                  ? "warningAmber"
                  : "successLime"
            }
            ff="var(--font-mono)"
            fw={700}
            size="xs"
          >
            {binLevel}%
          </Text>
        </Group>
        <BinGauge level={binLevel} />
      </Card>

      <div>
        <Text c="dimmed" fw={600} mb="sm" size="sm">
          Charging Ports
        </Text>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
          {[1, 2, 3, 4].map((port) => (
            <PortCard
              key={port}
              busy={busy}
              data={ports.find((p) => p.port === port)}
              port={port}
              onActivate={(p, dur) =>
                send("activate_port", { port: p, duration_seconds: dur })
              }
              onDeactivate={(p) => send("deactivate_port", { port: p })}
            />
          ))}
        </SimpleGrid>
      </div>

      <Card withBorder p="lg" radius="md">
        <Text c="dimmed" fw={600} mb="md" size="sm">
          Conveyor & Bottle Controls
        </Text>
        <Group gap="xs" mb="sm">
          <Button
            color="voltTeal"
            disabled={busy}
            size="xs"
            onClick={() => send("open_conveyor")}
          >
            ▶ Conveyor Forward
          </Button>
          <Button
            color="warningAmber"
            disabled={busy}
            size="xs"
            onClick={() => send("close_conveyor")}
          >
            ■ Conveyor Stop
          </Button>
          <Button
            color="gray"
            disabled={busy}
            size="xs"
            variant="default"
            onClick={() => send("reverse_conveyor")}
          >
            ◀ Conveyor Reverse
          </Button>
        </Group>
        <Group
          gap="xs"
          pt="sm"
          style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
        >
          <Button
            color="voltTeal"
            disabled={busy}
            size="xs"
            onClick={() => send("approve_bottle")}
          >
            ✓ Approve Bottle
          </Button>
          <Button
            color="dangerRed"
            disabled={busy}
            size="xs"
            onClick={() => send("reject_bottle")}
          >
            ✕ Reject Bottle
          </Button>
          <Button
            color="gray"
            disabled={busy}
            size="xs"
            variant="default"
            onClick={() => send("ping")}
          >
            ⟳ Ping
          </Button>
        </Group>
      </Card>

      <Card withBorder p="lg" radius="md">
        <Text fw={600} mb="sm" size="sm">
          Device API Key
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
          {(kiosk as Kiosk & { api_key?: string }).api_key ??
            "Hidden — reload to see"}
        </Text>
        <Text c="dimmed" mt="xs" size="10px">
          Flash this key as DEVICE_API_KEY in the ESP firmware.
        </Text>
      </Card>

      <Card withBorder p="lg" radius="md">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="sm">
            Command Log
          </Text>
          <Button
            color="gray"
            leftSection={<RefreshCw size={12} />}
            size="xs"
            variant="subtle"
            onClick={refresh}
          >
            Refresh
          </Button>
        </Group>
        {commands.length === 0 ? (
          <Text c="dimmed" py="md" size="xs" ta="center">
            No commands sent yet
          </Text>
        ) : (
          <Stack gap={6} mah={300} style={{ overflowY: "auto" }}>
            {commands.map((cmd) => (
              <Group
                key={cmd.id}
                justify="space-between"
                p="xs"
                style={{
                  borderRadius: 10,
                  background: "var(--mantine-color-default)",
                }}
                wrap="nowrap"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600} size="xs">
                    {cmd.command_type}
                  </Text>
                  {Object.keys(cmd.payload ?? {}).length > 0 && (
                    <Text truncate c="dimmed" mt={2} size="10px">
                      {JSON.stringify(cmd.payload)}
                    </Text>
                  )}
                </div>
                <Stack align="flex-end" gap={2}>
                  <StatusBadge
                    label={cmd.status}
                    status={commandStatus(cmd.status)}
                  />
                  <Text c="dimmed" size="9px">
                    {new Date(cmd.created_at).toLocaleTimeString()}
                  </Text>
                </Stack>
              </Group>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
