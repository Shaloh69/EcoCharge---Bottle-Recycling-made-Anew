import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { SETTING_DEFAULTS } from '../src/services/settingsService'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@ecocharge.ph'
  const password = process.env.ADMIN_PASSWORD ?? ''
  if (!password) throw new Error('ADMIN_PASSWORD not set')

  const hash = await bcrypt.hash(password, 12)
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: process.env.ADMIN_NAME ?? 'EcoCharge Admin',
      email,
      passwordHash: hash,
      qrCode: crypto.randomBytes(16).toString('hex'),
      isAdmin: true,
    },
  })
  console.log(`Admin: ${admin.email}`)

  const kiosk = await prisma.kiosk.upsert({
    where: { apiKey: process.env.DEVICE_API_KEY ?? 'esp32-device-secret' },
    update: {},
    create: {
      name: process.env.KIOSK_NAME ?? 'Kiosk-001',
      location: process.env.KIOSK_LOCATION ?? 'Main Building Lobby',
      apiKey: process.env.DEVICE_API_KEY ?? crypto.randomBytes(32).toString('hex'),
    },
  })
  console.log(`Kiosk: ${kiosk.name} | API key: ${kiosk.apiKey}`)

  // Seed settings defaults
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }
  console.log('Settings seeded.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
