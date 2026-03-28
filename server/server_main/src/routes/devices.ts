import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { requireDeviceKey } from '../middleware/deviceAuth'
import { getPendingCommands, ackCommand, queueCommand } from '../services/commandService'
import { broadcastToAdmin, broadcastToKiosk } from '../services/sseService'
import { getPortStatus } from './kiosk'
import { DeviceRequest } from '../types'

const router = Router()

// All device routes require device key
router.use(requireDeviceKey)

async function touchKiosk(kioskId: number) {
  return prisma.kiosk.update({
    where: { id: kioskId },
    data: { status: 'online', lastSeenAt: new Date() },
  })
}

const commandsQuerySchema = z.object({
  kiosk_id: z.coerce.number().int().positive(),
})

// GET /commands
router.get('/commands', async (req: DeviceRequest, res: Response, next: NextFunction) => {
  try {
    const query = commandsQuerySchema.parse(req.query)
    const kioskId = query.kiosk_id

    await touchKiosk(kioskId)

    const commands = await getPendingCommands(kioskId)

    res.json({
      commands: commands.map(c => ({
        id: c.id,
        command_type: c.commandType,
        payload: c.payload ? (() => { try { return JSON.parse(c.payload!) } catch { return {} } })() : {},
        status: c.status,
        created_at: c.createdAt,
        acked_at: c.ackedAt,
      })),
    })
  } catch (err) {
    next(err)
  }
})

const ackBodySchema = z.object({
  kiosk_id: z.number().int().positive(),
})

// POST /commands/:id/ack
router.post('/commands/:id/ack', async (req: DeviceRequest, res: Response, next: NextFunction) => {
  try {
    const commandId = parseInt(req.params.id)
    const body = ackBodySchema.parse(req.body)
    await ackCommand(commandId, body.kiosk_id)
    res.json({ acked: commandId })
  } catch (err) {
    next(err)
  }
})

const telemetrySchema = z.object({
  kiosk_id: z.number().int().positive(),
  ports: z.array(z.object({
    voltage: z.number().optional(),
    current: z.number().optional(),
    relay_on: z.boolean().optional(),
  })).optional(),
  bin_level: z.number().int().optional(),
})

// POST /telemetry
router.post('/telemetry', async (req: DeviceRequest, res: Response, next: NextFunction) => {
  try {
    const body = telemetrySchema.parse(req.body)
    const { kiosk_id: kioskId, ports = [], bin_level } = body

    await touchKiosk(kioskId)

    // Save telemetry record
    await prisma.deviceTelemetry.create({
      data: {
        kioskId,
        portData: JSON.stringify(ports),
        binLevel: bin_level ?? null,
      },
    })

    // Auto-complete expired charging sessions
    const activeSessions = await prisma.chargingSession.findMany({
      where: { kioskId, status: 'active' },
    })

    for (const session of activeSessions) {
      const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
      if (elapsed >= session.durationSeconds) {
        await prisma.chargingSession.update({
          where: { id: session.id },
          data: { status: 'completed', endedAt: new Date() },
        })
        await queueCommand(kioskId, 'deactivate_port', { port: session.portNumber })
      }
    }

    const timestamp = new Date()

    // Broadcast to admin SSE
    broadcastToAdmin({
      type: 'telemetry',
      kioskId,
      ports,
      binLevel: bin_level ?? null,
      timestamp,
    })

    // Broadcast updated port status to kiosk SSE clients
    const portStatus = await getPortStatus(kioskId)
    broadcastToKiosk(String(kioskId), { type: 'ports', ports: portStatus })

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

export default router
