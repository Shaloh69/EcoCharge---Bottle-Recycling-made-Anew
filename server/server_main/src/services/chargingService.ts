import prisma from "../prisma";
import { getSettings, n } from "./settingsService";
import { queueCommand } from "./commandService";
import { log } from "../logger";

export async function calcDurationSeconds(
  kioskId: number,
  portNumber: number,
  credits: number,
): Promise<{ durationSeconds: number; wattSnapshot: number | null }> {
  const s = await getSettings();
  const latest = await prisma.deviceTelemetry.findFirst({
    where: { kioskId },
    orderBy: { timestamp: "desc" },
  });
  let wattSnapshot: number | null = null;
  let durationSeconds: number;

  if (latest?.portData) {
    const ports: Array<{ voltage?: number; current?: number }> = JSON.parse(
      latest.portData,
    );
    const port = ports[portNumber - 1];
    if (
      port?.voltage &&
      port?.current &&
      port.voltage > 0 &&
      port.current > 0
    ) {
      wattSnapshot = port.voltage * port.current;
      const whBudget = credits * n(s, "energy_budget_wh_per_credit");
      durationSeconds = Math.round((whBudget * 3600) / wattSnapshot);
    } else {
      durationSeconds = credits * n(s, "base_minutes_per_credit") * 60;
    }
  } else {
    durationSeconds = credits * n(s, "base_minutes_per_credit") * 60;
  }

  durationSeconds = Math.min(durationSeconds, n(s, "max_charging_seconds"));
  return { durationSeconds, wattSnapshot };
}

// ── Stale-session reconciliation ──────────────────────────────────────────────
// The ESP32 boots with every relay OFF (fail-safe, relay_control.c). If it
// reboots or drops offline mid-session, nothing is physically charging, but
// the ChargingSession would stay "active" forever — the normal auto-expiry
// only runs on telemetry POSTs, which an offline device can't send. This
// sweep closes those sessions as "error" and queues a deactivate_port so a
// device that lost WiFi without rebooting (relay possibly still on) shuts
// the port off when it reconnects. Command TTL expires it otherwise.

const DEVICE_OFFLINE_MS = 2 * 60 * 1000; // matches the admin offline alert

export async function reconcileStaleSessions(): Promise<void> {
  const cutoff = new Date(Date.now() - DEVICE_OFFLINE_MS);

  const stale = await prisma.chargingSession.findMany({
    where: {
      status: "active",
      kiosk: { OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }] },
    },
    include: { kiosk: { select: { name: true, lastSeenAt: true } } },
  });

  for (const session of stale) {
    log.chargingWarn(
      `Session #${session.id} — kiosk #${session.kioskId} ("${session.kiosk.name}") ` +
        `offline since ${session.kiosk.lastSeenAt?.toISOString() ?? "never"}, ` +
        `marking session error`,
    );
    await prisma.chargingSession.update({
      where: { id: session.id },
      data: { status: "error", endedAt: new Date() },
    });
    await queueCommand(session.kioskId, "deactivate_port", {
      port: session.portNumber,
    });
  }
}

export function startStaleSessionSweep(intervalMs = 60_000): void {
  setInterval(() => {
    reconcileStaleSessions().catch((err) =>
      log.error("Charging", `Stale-session sweep failed: ${err}`),
    );
  }, intervalMs).unref();
  log.startup(
    `Stale-session sweep running every ${intervalMs / 1000}s (offline threshold ${DEVICE_OFFLINE_MS / 1000}s)`,
  );
}
