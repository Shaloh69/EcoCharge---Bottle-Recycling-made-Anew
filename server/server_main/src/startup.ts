import { exec } from 'child_process'
import crypto from 'crypto'
import { promisify } from 'util'

import bcrypt from 'bcryptjs'

import { log } from './logger'
import prisma from './prisma'
import { SETTING_DEFAULTS } from './services/settingsService'

const execAsync = promisify(exec)

// ── Auto-migrate ───────────────────────────────────────────────────────────────
export async function runMigrations() {
  log.migration('Connecting to database…')

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
      if (stdout) process.stdout.write(stdout)
      if (stderr) process.stderr.write(stderr)
      log.migration('All migrations applied ✔')
      return
    } catch (err: unknown) {
      const e       = err as { stdout?: string; stderr?: string; message?: string }
      const combined = (e.stdout ?? '') + (e.stderr ?? '') + (e.message ?? '')

      // P3009 — previous deploy left a failed migration record.
      // Roll it back first (clears the failure), then mark it applied.
      if (combined.includes('P3009')) {
        const match = combined.match(/The `(\S+)` migration started at .+ failed/)
        if (match) {
          const name = match[1]
          log.migration(`Failed record found: "${name}" (P3009)`)
          log.migration('Clearing failure → rolling back then marking applied…')
          await execAsync(`npx prisma migrate resolve --rolled-back ${name}`)
          await execAsync(`npx prisma migrate resolve --applied ${name}`)
          log.migration(`Resolved "${name}" — retrying… (attempt ${attempt + 1})`)
          continue
        }
      }

      // P3018 — column/table already exists from a prior db push.
      if (combined.includes('P3018')) {
        const match = combined.match(/Migration name:\s*(\S+)/)
        if (match) {
          const name = match[1]
          log.migration(`Schema drift on "${name}" (P3018) — marking as applied…`)
          await execAsync(`npx prisma migrate resolve --applied ${name}`)
          log.migration(`Resolved "${name}" — retrying… (attempt ${attempt + 1})`)
          continue
        }
      }

      log.error('Migration', combined || String(err))
      throw new Error('migrate deploy failed')
    }
  }

  throw new Error('Migration loop exceeded max attempts')
}

// ── AI Server health check ─────────────────────────────────────────────────────
export async function pingAIServer() {
  const url = process.env.AI_SERVER_URL
  if (!url) {
    log.aiWarn('AI_SERVER_URL not set — AI classification disabled')
    return
  }

  log.ai(`Connecting to AI server: ${url}`)
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      log.ai(`AI server reachable ✔  (${url})`)
    } else {
      log.aiWarn(`AI server responded ${res.status} — may be degraded`)
    }
  } catch {
    log.aiError(`AI server unreachable at ${url} — bottle classification will fail`)
  }
}

// ── Auto-seed (idempotent — safe on every boot) ────────────────────────────────
export async function autoSeed() {
  log.seed('Running seed checks…')

  // Admin user
  const email    = process.env.ADMIN_EMAIL    ?? 'admin@ecocharge.ph'
  const password = process.env.ADMIN_PASSWORD

  log.seed(`Admin email target: ${email} (set ADMIN_EMAIL env var to change)`)

  if (!password) {
    log.warn('Seed', 'ADMIN_PASSWORD not set — skipping admin user seed')
  } else {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      log.seed(`Admin already exists: ${email}`)
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
      log.seed(`Admin created: ${email} ✔`)
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
  log.seed(`Kiosk ready: ${process.env.KIOSK_NAME ?? 'Kiosk-001'} ✔`)

  // System settings
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.systemSetting.upsert({
      where:  { key },
      update: {},
      create: { key, value },
    })
  }
  log.seed('System settings ready ✔')

  // Check AI server after DB is ready
  await pingAIServer()
}
