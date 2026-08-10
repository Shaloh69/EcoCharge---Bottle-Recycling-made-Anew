"use client";
import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";

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

const glass = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(20,184,166,0.18)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

const dimText = (op: number) => ({ color: `rgba(255,255,255,${op})` });

function Btn({
  label,
  color = "teal",
  onClick,
  disabled,
  small,
}: {
  label: string;
  color?: "teal" | "red" | "amber" | "gray";
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  const bg: Record<string, string> = {
    teal: "rgba(20,184,166,0.18)",
    red: "rgba(239,68,68,0.18)",
    amber: "rgba(245,158,11,0.18)",
    gray: "rgba(255,255,255,0.08)",
  };
  const border: Record<string, string> = {
    teal: "rgba(20,184,166,0.45)",
    red: "rgba(239,68,68,0.45)",
    amber: "rgba(245,158,11,0.45)",
    gray: "rgba(255,255,255,0.15)",
  };

  return (
    <button
      disabled={disabled}
      style={{
        background: disabled ? "rgba(255,255,255,0.04)" : bg[color],
        border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : border[color]}`,
        color: disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.85)",
        borderRadius: 10,
        padding: small ? "5px 12px" : "8px 16px",
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
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
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: on ? "rgba(20,184,166,0.10)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${on ? "rgba(20,184,166,0.40)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-sm" style={dimText(0.85)}>
            Port {port}
          </p>
          <p className="text-[10px] mt-0.5" style={dimText(0.38)}>
            {on ? "CHARGING" : "IDLE"}
          </p>
        </div>
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: on ? "#14b8a6" : "rgba(255,255,255,0.18)" }}
        />
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-2 text-center">
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
            <div
              key={label}
              className="rounded-lg p-2"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <p className="text-xs font-bold" style={dimText(0.75)}>
                {value}
              </p>
              <p className="text-[9px]" style={dimText(0.3)}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          disabled={on || busy}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.65)",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 11,
            flex: 1,
          }}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        >
          {[15, 30, 60, 120, 300, 600, 900, 1800, 3600].map((s) => (
            <option key={s} style={{ background: "#1a1a2e" }} value={s}>
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </option>
          ))}
        </select>
        {on ? (
          <Btn
            small
            color="red"
            disabled={busy}
            label="Stop"
            onClick={() => onDeactivate(port)}
          />
        ) : (
          <Btn
            small
            color="teal"
            disabled={busy}
            label="Activate"
            onClick={() => onActivate(port, duration)}
          />
        )}
      </div>
    </div>
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
      <div
        className="p-8 flex items-center justify-center"
        style={dimText(0.35)}
      >
        Loading…
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            className="text-xs mb-2 flex items-center gap-1"
            style={dimText(0.38)}
            type="button"
            onClick={() => router.push("/dashboard/kiosks")}
          >
            ← Back to kiosks
          </button>
          {editing ? (
            <div className="space-y-2">
              <input
                placeholder="Kiosk name"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.85)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontSize: 16,
                  fontWeight: 700,
                  width: "100%",
                }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <input
                placeholder="Location"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.65)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontSize: 13,
                  width: "100%",
                }}
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
              <div className="flex gap-2">
                <Btn color="teal" label="Save" onClick={saveEdit} />
                <Btn
                  color="gray"
                  label="Cancel"
                  onClick={() => setEditing(false)}
                />
              </div>
            </div>
          ) : (
            <>
              <h1
                className="text-2xl font-extrabold tracking-tight"
                style={dimText(0.92)}
              >
                {kiosk.name}
              </h1>
              <p className="text-sm mt-0.5" style={dimText(0.42)}>
                📍 {kiosk.location}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={kiosk.status} />
          {!editing && (
            <>
              <Btn
                small
                color="gray"
                label="Edit"
                onClick={() => setEditing(true)}
              />
              <Btn
                small
                color="red"
                label="Delete"
                onClick={() => setShowDeleteConfirm(true)}
              />
            </>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between gap-4"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.35)",
          }}
        >
          <p className="text-sm" style={dimText(0.8)}>
            Delete <strong>{kiosk.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Btn small color="red" label="Yes, delete" onClick={deleteKiosk} />
            <Btn
              small
              color="gray"
              label="Cancel"
              onClick={() => setShowDeleteConfirm(false)}
            />
          </div>
        </div>
      )}

      {/* Live status row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div key={label} className="rounded-xl p-3" style={glass}>
            <p
              className="text-[10px] uppercase tracking-widest font-semibold mb-1"
              style={dimText(0.32)}
            >
              {label}
            </p>
            <p className="text-sm font-bold" style={dimText(0.8)}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Bin level */}
      <div className="rounded-2xl p-5" style={glass}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold" style={dimText(0.75)}>
            Bin Level
          </p>
          <p
            className="text-xs font-bold"
            style={{ color: binLevel >= 80 ? "#ef4444" : "#14b8a6" }}
          >
            {binLevel}%
          </p>
        </div>
        <BinGauge level={binLevel} />
      </div>

      {/* Port controls */}
      <div>
        <p className="text-sm font-semibold mb-3" style={dimText(0.6)}>
          Charging Ports
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        </div>
      </div>

      {/* Conveyor & bottle controls */}
      <div className="rounded-2xl p-5 space-y-4" style={glass}>
        <p className="text-sm font-semibold" style={dimText(0.6)}>
          Conveyor & Bottle Controls
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn
            color="teal"
            disabled={busy}
            label="▶ Conveyor Forward"
            onClick={() => send("open_conveyor")}
          />
          <Btn
            color="amber"
            disabled={busy}
            label="■ Conveyor Stop"
            onClick={() => send("close_conveyor")}
          />
          <Btn
            color="gray"
            disabled={busy}
            label="◀ Conveyor Reverse"
            onClick={() => send("reverse_conveyor")}
          />
        </div>
        <div
          className="flex flex-wrap gap-2 pt-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Btn
            color="teal"
            disabled={busy}
            label="✓ Approve Bottle"
            onClick={() => send("approve_bottle")}
          />
          <Btn
            color="red"
            disabled={busy}
            label="✕ Reject Bottle"
            onClick={() => send("reject_bottle")}
          />
          <Btn
            color="gray"
            disabled={busy}
            label="⟳ Ping"
            onClick={() => send("ping")}
          />
        </div>
      </div>

      {/* API Key */}
      <div className="rounded-2xl p-5" style={glass}>
        <p className="text-sm font-semibold mb-2" style={dimText(0.6)}>
          Device API Key
        </p>
        <p
          className="text-xs font-mono break-all"
          style={{
            color: "rgba(20,184,166,0.80)",
            background: "rgba(20,184,166,0.06)",
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          {(kiosk as Kiosk & { api_key?: string }).api_key ??
            "Hidden — reload to see"}
        </p>
        <p className="text-[10px] mt-2" style={dimText(0.28)}>
          Flash this key as DEVICE_API_KEY in the ESP firmware.
        </p>
      </div>

      {/* Command history */}
      <div className="rounded-2xl p-5" style={glass}>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-semibold" style={dimText(0.6)}>
            Command Log
          </p>
          <button
            style={{ fontSize: 11, ...dimText(0.38) }}
            type="button"
            onClick={refresh}
          >
            ⟳ Refresh
          </button>
        </div>
        {commands.length === 0 ? (
          <p className="text-xs text-center py-4" style={dimText(0.25)}>
            No commands sent yet
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {commands.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={dimText(0.75)}>
                    {cmd.command_type}
                  </p>
                  {Object.keys(cmd.payload ?? {}).length > 0 && (
                    <p
                      className="text-[10px] truncate mt-0.5"
                      style={dimText(0.35)}
                    >
                      {JSON.stringify(cmd.payload)}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        cmd.status === "ACKED"
                          ? "rgba(20,184,166,0.15)"
                          : "rgba(245,158,11,0.15)",
                      color:
                        cmd.status === "ACKED"
                          ? "rgba(20,184,166,0.85)"
                          : "rgba(245,158,11,0.85)",
                    }}
                  >
                    {cmd.status}
                  </span>
                  <p className="text-[9px] mt-1" style={dimText(0.28)}>
                    {new Date(cmd.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
