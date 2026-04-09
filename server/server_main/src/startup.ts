import { execSync } from 'child_process'
import crypto from 'crypto'

import bcrypt from 'bcryptjs'

import prisma from './prisma'
import { SETTING_DEFAULTS } from './services/settingsService'

// ── Auto-migrate ───────────────────────────────────────────────────────────────
// Runs `prisma migrate deploy`. If a P3018 drift error is detected (e.g. a
// column that was added via `db push` before the migration file was created),
// we auto-resolve the stuck migration and retry. This loop handles the case
// where multiple migrations are stuck.
export function runMigrations() {
  console.log('[Startup] Running prisma migrate deploy…')

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      execSync('npx prisma migrate deploy', { stdio: 'pipe' })
      console.log('[Startup] Migrations applied.')
      return
    } catch (err: unknown) {
      const out =
        (err as NodeJS.ErrnoException & { stdout?: Buffer; stderr?: Buffer })
          .stdout?.toString() ?? ''
      const errOut =
        (err as NodeJS.ErrnoException & { stdout?: Buffer; stderr?: Buffer })
          .stderr?.toString() ?? ''
      const combined = out + errOut

      // P3018 = migration failed to apply; usually database drift
      // (column/table already exists from a prior db push).
      // Extract the migration name and mark it as already applied, then retry.
      if (combined.includes('P3018')) {
        const match = combined.match(/Migration name:\s*(\S+)/)
        if (match) {
          const name = match[1]
          console.warn(
            `[Startup] Drift detected — migration "${name}" already applied in DB.`,
          )
          console.warn(`[Startup] Resolving: prisma migrate resolve --applied ${name}`)
          execSync(`npx prisma migrate resolve --applied ${name}`, {
            stdio: 'inherit',
          })
          console.log(`[Startup] Resolved "${name}". Retrying deploy… (attempt ${attempt + 1})`)
          continue
        }
      }

      // Any other error — print output and abort
      console.error('[Startup] Migration failed:\n', combined || err)
      process.exit(1)
    }
  }

  console.error('[Startup] Migration loop exceeded max attempts — aborting.')
  process.exit(1)
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
