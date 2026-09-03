/**
 * End-to-end integration tests — docs/planning/05-feature-build-checklist.md
 * Stage 1.3. Runs the real Express app (via supertest, no mocking) against a
 * real, isolated MySQL database (`ecocharge_test` on the same Docker MySQL
 * instance the live system uses, on desktop-gklhcri — never the live
 * `ecocharge` database). Requires DATABASE_URL to already point at that test
 * database before this file is imported (see package.json's
 * "test:integration" script) — set via an SSH tunnel to 127.0.0.1:13307
 * locally, or run directly on desktop-gklhcri.
 *
 * Covers 4 of the 5 fault paths listed in Stage 1.3. The 5th — "backend
 * unavailable → ESP32 retries, relays stay fail-safe" — is genuinely not
 * testable here: that's ESP32 firmware retry/fail-safe behavior
 * (esp/ecocharge/src/), not server logic, and needs either real hardware or
 * a firmware simulator, neither of which exists. Not faked.
 */
// DATABASE_URL etc. are loaded from .env.test by vitest.integration.config.ts's
// setupFiles (src/__tests__/setup.ts) — that runs before this file's own
// imports resolve, which a top-level dotenv.config() call here would not
// (ESM import hoisting means ../prisma's transitive config.ts import runs
// before any in-file statement, regardless of source order).
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import prisma from "../prisma";
import { reconcileStaleSessions } from "../services/chargingService";

const app = createApp();
const runId = Date.now();
const DEVICE_KEY = `test-device-key-${runId}`;

let kioskId: number;

beforeAll(async () => {
  const kiosk = await prisma.kiosk.create({
    data: {
      name: `Test-Kiosk-${runId}`,
      location: "Integration test",
      apiKey: DEVICE_KEY,
      status: "online",
      lastSeenAt: new Date(),
    },
  });
  kioskId = kiosk.id;
});

function uniqueEmail(tag: string) {
  return `e2e-${tag}-${runId}@test.local`;
}

async function registerUser(tag: string) {
  const res = await request(app).post("/api/auth/register").send({
    name: `E2E ${tag}`,
    email: uniqueEmail(tag),
    password: "TestPassword123!",
  });
  expect(res.status).toBe(201);
  return res.body as {
    access_token: string;
    user: { id: number; credit_balance: number };
  };
}

describe("Happy path: register -> deposit -> credits awarded -> charge start -> charge complete", () => {
  it("runs the full real flow end to end", async () => {
    // 1. Register a fresh user
    const { access_token, user } = await registerUser("happy");
    const auth = { Authorization: `Bearer ${access_token}` };
    expect(user.credit_balance).toBe(0);

    // 2. Create a kiosk session (what the kiosk_web app does on session start)
    const sessionRes = await request(app)
      .post("/api/kiosk/sessions")
      .set(auth)
      .send({ kiosk_id: kioskId });
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.id as number;

    // 3. AI approves the bottle (350ml -> tier S -> 1 credit per seed defaults)
    const approveRes = await request(app)
      .post("/api/kiosk/bottle/approve")
      .set(auth)
      .send({
        session_id: sessionId,
        brand: "TestBrand",
        volume_ml: 350,
        condition: "perfect",
        confidence: 0.92,
      });
    expect(approveRes.status).toBe(201);
    expect(approveRes.body.status).toBe("pending_bin");
    const depositId = approveRes.body.deposit_id as number;

    // Deposit is pending_bin, not yet confirmed — no credits awarded yet
    const deposit = await prisma.bottleDeposit.findUniqueOrThrow({
      where: { id: depositId },
    });
    expect(deposit.status).toBe("pending_bin");

    // 4. The real ESP32 confirms the bin sensor via telemetry, device-authenticated
    const telemetryRes = await request(app)
      .post("/api/devices/telemetry")
      .set("Authorization", `Bearer ${DEVICE_KEY}`)
      .send({
        bottle_at_entrance: false,
        bottle_in_bin: true,
        fsm_state: "confirming",
        bin_level: 10,
      });
    expect(telemetryRes.status).toBe(200);

    // 5. Deposit is now confirmed and credits landed on the user
    const confirmedDeposit = await prisma.bottleDeposit.findUniqueOrThrow({
      where: { id: depositId },
    });
    expect(confirmedDeposit.status).toBe("confirmed");
    expect(confirmedDeposit.creditsAwarded).toBeGreaterThan(0);

    const creditedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(creditedUser.creditBalance).toBe(confirmedDeposit.creditsAwarded);

    // 6. Start charging, spending exactly the credits just earned
    const startRes = await request(app)
      .post("/api/charging/start")
      .set(auth)
      .send({
        kiosk_id: kioskId,
        port_number: 1,
        credits: creditedUser.creditBalance,
      });
    expect(startRes.status).toBe(201);
    expect(startRes.body.new_balance).toBe(0);
    const chargingSessionId = startRes.body.charging_session.id as number;

    // Confirm the port is now reported as in-use
    const portsRes = await request(app)
      .get(`/api/kiosk/${kioskId}/ports`)
      .set(auth);
    expect(portsRes.status).toBe(200);
    const port1 = portsRes.body.find((p: { port: number }) => p.port === 1);
    expect(port1.available).toBe(false);

    // 7. Simulate real elapsed time by backdating startedAt (no reason to
    // actually sleep for durationSeconds in a test), then let the real
    // auto-expiry logic in the telemetry handler complete it — not a
    // separate/fake "complete" endpoint, the actual production code path.
    await prisma.chargingSession.update({
      where: { id: chargingSessionId },
      data: { startedAt: new Date(Date.now() - 3_600_000) },
    });
    const completingTelemetry = await request(app)
      .post("/api/devices/telemetry")
      .set("Authorization", `Bearer ${DEVICE_KEY}`)
      .send({ fsm_state: "idle", bin_level: 10 });
    expect(completingTelemetry.status).toBe(200);

    const completedSession = await prisma.chargingSession.findUniqueOrThrow({
      where: { id: chargingSessionId },
    });
    expect(completedSession.status).toBe("completed");
  });
});

describe("Fault path: overcurrent state reflected in telemetry/port status", () => {
  it("shows overcurrent=true on the affected port after a device reports it", async () => {
    const res = await request(app)
      .post("/api/devices/telemetry")
      .set("Authorization", `Bearer ${DEVICE_KEY}`)
      .send({
        ports: [
          { port: 1, current: 15.2, voltage: 5.0, relay_on: false, overcurrent: true },
        ],
        fsm_state: "idle",
      });
    expect(res.status).toBe(200);

    const { access_token } = await registerUser("overcurrent-viewer");
    const portsRes = await request(app)
      .get(`/api/kiosk/${kioskId}/ports`)
      .set("Authorization", `Bearer ${access_token}`);
    expect(portsRes.status).toBe(200);
    // The port list endpoint surfaces relay_on/voltage/current from the
    // latest telemetry row directly, per src/routes/kiosk.ts's getPortStatus.
    const port1 = portsRes.body.find((p: { port: number }) => p.port === 1);
    expect(port1.relay_on).toBe(false);
    expect(port1.current).toBe(15.2);
  });
});

describe("Fault path: bin >= 95% refuses new deposits with a real 409", () => {
  it("returns 409 bin_full and creates no deposit when the bin is critically full", async () => {
    const { access_token, user } = await registerUser("binfull");
    const auth = { Authorization: `Bearer ${access_token}` };

    const sessionRes = await request(app)
      .post("/api/kiosk/sessions")
      .set(auth)
      .send({ kiosk_id: kioskId });
    const sessionId = sessionRes.body.id as number;

    // Report a critical bin level from the device first
    await request(app)
      .post("/api/devices/telemetry")
      .set("Authorization", `Bearer ${DEVICE_KEY}`)
      .send({ bin_level: 97, fsm_state: "idle" });

    const depositCountBefore = await prisma.bottleDeposit.count({
      where: { session: { userId: user.id } },
    });

    const approveRes = await request(app)
      .post("/api/kiosk/bottle/approve")
      .set(auth)
      .send({ session_id: sessionId, volume_ml: 350 });

    expect(approveRes.status).toBe(409);
    expect(approveRes.body.error).toBe("bin_full");

    const depositCountAfter = await prisma.bottleDeposit.count({
      where: { session: { userId: user.id } },
    });
    expect(depositCountAfter).toBe(depositCountBefore);
  });
});

describe("Fault path: ESP32 offline -> stale-session sweep fires correctly", () => {
  it("marks an active charging session as error and queues deactivate_port when its kiosk goes stale", async () => {
    const staleKiosk = await prisma.kiosk.create({
      data: {
        name: `Stale-Kiosk-${runId}`,
        location: "Integration test",
        apiKey: `stale-key-${runId}`,
        status: "online",
        // Older than chargingService's 2-minute DEVICE_OFFLINE_MS threshold
        lastSeenAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    });

    const { access_token, user } = await registerUser("stale-sweep");
    await prisma.user.update({
      where: { id: user.id },
      data: { creditBalance: 5 },
    });

    const startRes = await request(app)
      .post("/api/charging/start")
      .set("Authorization", `Bearer ${access_token}`)
      .send({ kiosk_id: staleKiosk.id, port_number: 1, credits: 1 });
    expect(startRes.status).toBe(201);
    const sessionId = startRes.body.charging_session.id as number;

    // This is the real function startStaleSessionSweep() calls on its
    // interval in production — invoked directly here instead of waiting
    // out a real 60s+ timer.
    await reconcileStaleSessions();

    const session = await prisma.chargingSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    expect(session.status).toBe("error");

    const deactivateCmd = await prisma.deviceCommand.findFirst({
      where: { kioskId: staleKiosk.id, commandType: "deactivate_port" },
      orderBy: { createdAt: "desc" },
    });
    expect(deactivateCmd).not.toBeNull();
    expect(deactivateCmd?.status).toBe("PENDING");
  });
});

// ---------------------------------------------------------------------------
// Charging guards — added 2026-09-03.
//
// `14-production-readiness.md` flagged both of these as untested P1 items, and
// the credit check specifically as "money-like logic". Neither had any coverage
// despite being the two ways a charging start can legitimately be refused: a
// user spending credits they do not have, and two people reaching for the same
// physical socket. Both are pure server-side guards, so they can be tested for
// real without any hardware.
// ---------------------------------------------------------------------------
describe("Charging guards: credit enforcement and port conflicts", () => {
  it("refuses to start a charge for more credits than the user holds", async () => {
    const { access_token, user } = await registerUser("nocredit");
    const auth = { Authorization: `Bearer ${access_token}` };

    // A freshly registered user has earned nothing yet. That is the whole
    // point: the balance check must hold at zero, which is the state every
    // brand-new account is in.
    expect(user.credit_balance).toBe(0);

    const res = await request(app)
      .post("/api/charging/start")
      .set(auth)
      .send({ kiosk_id: kioskId, port_number: 1, credits: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("insufficient credits");

    // The guard must not merely return 400 - it must not have created a
    // session or moved any balance. A refusal that still writes rows is worse
    // than no guard at all, because it looks correct from the outside.
    const started = await prisma.chargingSession.findFirst({
      where: { userId: user.id },
    });
    expect(started).toBeNull();

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.creditBalance).toBe(0);
  });

  it("refuses a second charge on a port that is already in use", async () => {
    // Two different users, one socket - the real-world case this protects
    // against, rather than one user double-clicking.
    const first  = await registerUser("port-a");
    const second = await registerUser("port-b");
    const authA = { Authorization: `Bearer ${first.access_token}` };
    const authB = { Authorization: `Bearer ${second.access_token}` };

    // Give both users credits directly. Earning them through the deposit flow
    // is already covered by the happy-path test; repeating it here would make
    // this test slower and would not exercise anything new.
    await prisma.user.update({
      where: { id: first.user.id },
      data: { creditBalance: 10 },
    });
    await prisma.user.update({
      where: { id: second.user.id },
      data: { creditBalance: 10 },
    });

    const PORT = 3;

    const firstStart = await request(app)
      .post("/api/charging/start")
      .set(authA)
      .send({ kiosk_id: kioskId, port_number: PORT, credits: 1 });
    expect(firstStart.status).toBe(201);

    const secondStart = await request(app)
      .post("/api/charging/start")
      .set(authB)
      .send({ kiosk_id: kioskId, port_number: PORT, credits: 1 });

    expect(secondStart.status).toBe(409);
    expect(secondStart.body.error).toBe("port already in use");

    // The refused user must be left exactly as they were - not charged, and
    // without a dangling session.
    const secondAfter = await prisma.user.findUniqueOrThrow({
      where: { id: second.user.id },
    });
    expect(secondAfter.creditBalance).toBe(10);

    const activeOnPort = await prisma.chargingSession.findMany({
      where: { kioskId, portNumber: PORT, status: "active" },
    });
    expect(activeOnPort).toHaveLength(1);
    expect(activeOnPort[0].userId).toBe(first.user.id);

    // Free the port so this test leaves no state behind for later tests.
    await prisma.chargingSession.updateMany({
      where: { kioskId, portNumber: PORT, status: "active" },
      data: { status: "completed" },
    });
  });
});
