/**
 * Manual seed — run with:  npm run seed
 *
 * Wipes ALL data in FK-safe order, then creates:
 *   1. Admin user       (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME)
 *   2. Default kiosk    (KIOSK_NAME / KIOSK_LOCATION / DEVICE_API_KEY)
 *   3. System settings  (hardcoded defaults)
 *
 * Never runs automatically on boot. To run on Render: Shell tab → npm run seed
 */

import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SETTING_DEFAULTS } from "../src/services/settingsService";

const prisma = new PrismaClient();

async function main() {
  console.log("\n════════════════════════════════════════");
  console.log("  EcoCharge — Full DB Reset + Seed");
  console.log("════════════════════════════════════════\n");

  // ── 1. Wipe all data (leaf tables first to satisfy FK constraints) ──────────
  console.log("Wiping all data…");
  await prisma.deviceCommand.deleteMany();
  await prisma.deviceTelemetry.deleteMany();
  await prisma.chargingSession.deleteMany();
  await prisma.creditTransaction.deleteMany();
  await prisma.bottleDeposit.deleteMany();
  await prisma.kioskSession.deleteMany();
  await prisma.kiosk.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();
  console.log("  ✔  All tables cleared\n");

  // ── 2. Admin user ───────────────────────────────────────────────────────────
  const email = process.env.ADMIN_EMAIL ?? "admin@ecocharge.ph";
  const name = process.env.ADMIN_NAME ?? "EcoCharge Admin";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("  ✖  ADMIN_PASSWORD not set — set it in .env and retry");
    process.exit(1);
  }

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      qrCode: crypto.randomBytes(16).toString("hex"),
      isAdmin: true,
    },
  });
  console.log(`  ✔  Admin   — #${admin.id}  ${admin.email}`);

  // ── 3. Default kiosk ────────────────────────────────────────────────────────
  const apiKey =
    process.env.DEVICE_API_KEY ??
    "SET_AT_BUILD_TIME";
  const kioskName = process.env.KIOSK_NAME ?? "Kiosk-001";
  const kioskLocation =
    process.env.KIOSK_LOCATION ?? "UC Lapu-Lapu and Mandaue";

  const kiosk = await prisma.kiosk.create({
    data: { name: kioskName, location: kioskLocation, apiKey },
  });
  console.log(`  ✔  Kiosk   — #${kiosk.id}  "${kiosk.name}"`);
  console.log(`       apiKey = ${kiosk.apiKey}`);
  console.log(
    `       → set NEXT_PUBLIC_KIOSK_ID=${kiosk.id} on kiosk web Render service`,
  );

  // ── 4. System settings ──────────────────────────────────────────────────────
  await prisma.systemSetting.createMany({
    data: Object.entries(SETTING_DEFAULTS).map(([key, value]) => ({
      key,
      value,
    })),
  });
  console.log(
    `  ✔  Settings — ${Object.keys(SETTING_DEFAULTS).length} keys seeded`,
  );

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════");
  console.log("  Seed complete ✔");
  console.log("════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("\n  ✖  Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
