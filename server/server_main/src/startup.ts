import { exec } from 'child_process'
import crypto from 'crypto'
import { promisify } from 'util'

import bcrypt from 'bcryptjs'

import prisma from './prisma'
import { SETTING_DEFAULTS } from './services/settingsService'

const execAsync = promisify(exec)

// ── Auto-migrate ───────────────────────────────────────────────────────────────
// Uses async exec so the event loop stays unblocked (port is already bound by
// the time this runs). Handles P3018 drift errors by auto-resolving the stuck
// migration and retrying — up to 10 times for multiple stuck migrations.
export async function runMigrations() {
  console.log('[Startup] Running prisma migrate deploy…')

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
      if (stdout) process.stdout.write(stdout)
      if (stderr) process.stderr.write(stderr)
      console.log('[Startup] Migrations applied.')
      return
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string }
      const combined = (e.stdout ?? '') + (e.stderr ?? '') + (e.message ?? '')

      // P3009 = Prisma's migration table has a *failed* record from a previous
      // attempt (e.g. the last deploy crashed mid-migration). We must first
      // mark it as rolled-back (clears the failure), then mark it as applied
      // (since the column already exists in the DB), then retry.
      if (combined.includes('P3009')) {
        const match = combined.match(/The `(\S+)` migration started at .+ failed/)
        if (match) {
          const name = match[1]
          console.warn(`[Startup] Failed migration record found: "${name}" (P3009)`)
          console.warn(`[Startup] Clearing failure → rolling back then marking applied…`)
          await execAsync(`npx prisma migrate resolve --rolled-back ${name}`)
          await execAsync(`npx prisma migrate resolve --applied ${name}`)
          console.log(`[Startup] Resolved "${name}". Retrying deploy…`)
          continue
        }
      }

      // P3018 = migration ran but failed due to schema drift (column/table
      // already exists from a prior db push). Mark as applied and retry.
      if (combined.includes('P3018')) {
        const match = combined.match(/Migration name:\s*(\S+)/)
        if (match) {
          const name = match[1]
          console.warn(`[Startup] Schema drift on "${name}" (P3018) — marking as applied…`)
          await execAsync(`npx prisma migrate resolve --applied ${name}`)
          console.log(`[Startup] Resolved "${name}". Retrying deploy…`)
          continue
        }
      }

      console.error('[Startup] Migration failed:\n', combined)
      throw new Error('migrate deploy failed')
    }
  }

  throw new Error('Migration loop exceeded max attempts')
}

// ── Auto-seed (idempotent — safe on every boot) ───────────────────────────────
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
