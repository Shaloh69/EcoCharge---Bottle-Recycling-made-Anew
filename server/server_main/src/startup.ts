import { execSync } from 'child_process'
import crypto from 'crypto'

import bcrypt from 'bcryptjs'

import prisma from './prisma'
import { SETTING_DEFAULTS } from './services/settingsService'

// ── Auto-migrate ───────────────────────────────────────────────────────────────
export function runMigrations() {
  console.log('[Startup] Running prisma migrate deploy…')
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    console.log('[Startup] Migrations applied.')
  } catch (err) {
    console.error('[Startup] Migration failed — aborting startup.', err)
    process.exit(1)
  }
}

// ── Auto-seed (idempotent upserts — safe on every boot) ───────────────────────
export async function autoSeed() {
  // Admin user
  const email    = process.env.ADMIN_EMAIL    ?? 'admin@ecocharge.ph'
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    console.warn('[Seed] ADMIN_PASSWORD not set — skipping admin user seed')
  } else {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      console.log(`[Seed] Admin already exists: ${email}`)
    } else {
      const hash = await bcrypt.hash(password, 12)
      await prisma.user.create({
        data: {
          name:         process.env.ADMIN_NAME ?? 'EcoCharge Admin',
          email,
          passwordHash: hash,
          qrCode:       crypto.randomBytes(16).toString('hex'),
          isAdmin:      true,
        },
      })
      console.log(`[Seed] Admin created: ${email}`)
    }
  }

  // Default kiosk
  const apiKey = process.env.DEVICE_API_KEY ?? 'esp32-device-secret'
  await prisma.kiosk.upsert({
    where:  { apiKey },
    update: {},
    create: {
      name:     process.env.KIOSK_NAME     ?? 'Kiosk-001',
      location: process.env.KIOSK_LOCATION ?? 'Main Building Lobby',
      apiKey,
    },
  })
  console.log(`[Seed] Kiosk ready: ${process.env.KIOSK_NAME ?? 'Kiosk-001'}`)

  // System settings
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.systemSetting.upsert({
      where:  { key },
      update: {},
      create: { key, value },
    })
  }
  console.log('[Seed] System settings ready.')
}
