import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { requireDeviceKey } from '../middleware/deviceAuth'
import { getPendingCommands, ackCommand, queueCommand } from '../services/commandService'
import { broadcastToAdmin, broadcastToKiosk } from '../services/sseService'
import { getPortStatus } from './kiosk'
import { awardCredits } from '../services/creditService'
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

const ultrasonicSchema = z.object({
  entrance_cm: z.number().optional(),
  bin_top_cm:  z.number().optional(),
  bin_bot_cm:  z.number().optional(),
}).optional()

const telemetrySchema = z.object({
  kiosk_id:           z.number().int().positive(),
  ports:              z.array(z.object({
    voltage:   z.number().optional(),
    current:   z.number().optional(),
    relay_on:  z.boolean().optional(),
  })).optional(),
  bin_level:          z.number().int().optional(),
  ultrasonic:         ultrasonicSchema,
  bottle_at_entrance: z.boolean().optional(),
  bottle_in_bin:      z.boolean().optional(),
  fsm_state:          z.string().optional(),
})

// POST /telemetry
router.post('/telemetry', async (req: DeviceRequest, res: Response, next: NextFunction) => {
  try {
    const body = telemetrySchema.parse(req.body)
    const {
      kiosk_id: kioskId,
      ports = [],
      bin_level,
      ultrasonic,
      bottle_at_entrance,
      bottle_in_bin,
      fsm_state,
    } = body

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

    // ── Bin confirmation — award credits when bottle lands ────────────────
    if (bottle_in_bin === true) {
      // Find the most recent pending deposit for this kiosk
      const pendingDeposit = await prisma.bottleDeposit.findFirst({
        where: {
          status: 'pending_bin',
          session: { kioskId },
        },
        include: { session: true },
        orderBy: { timestamp: 'desc' },
      })

      if (pendingDeposit) {
        // Confirm deposit and award credits
        await prisma.bottleDeposit.update({
          where: { id: pendingDeposit.id },
          data: { status: 'confirmed' },
        })

        if (pendingDeposit.creditsAwarded > 0) {
          await awardCredits(
            pendingDeposit.session.userId,
            pendingDeposit.creditsAwarded,
            'bottle_deposit',
            pendingDeposit.id,
          )
        }

        // Notify kiosk UI — bottle confirmed in bin, credits awarded
        broadcastToKiosk(String(kioskId), {
          type: 'bottleInBin',
          confirmed: true,
          deposit_id: pendingDeposit.id,
          credits_awarded: pendingDeposit.creditsAwarded,
        })
      }
    } else if (bottle_in_bin === false && fsm_state === 'confirming') {
      // Timeout — bin sensors never fired. Mark deposit as rejected.
      const pendingDeposit = await prisma.bottleDeposit.findFirst({
        where: {
          status: 'pending_bin',
          session: { kioskId },
        },
        orderBy: { timestamp: 'desc' },
      })

      if (pendingDeposit) {
        await prisma.bottleDeposit.update({
          where: { id: pendingDeposit.id },
          data: { status: 'rejected', creditsAwarded: 0 },
        })
      }

      broadcastToKiosk(String(kioskId), {
        type: 'bottleInBin',
        confirmed: false,
        credits_awarded: 0,
      })
    }

    const timestamp = new Date()

    // Broadcast to admin SSE
    broadcastToAdmin({
      type: 'telemetry',
      kioskId,
      ports,
      binLevel: bin_level ?? null,
      ultrasonic: ultrasonic ?? null,
      bottleAtEntrance: bottle_at_entrance ?? false,
      bottleInBin: bottle_in_bin ?? false,
      fsmState: fsm_state ?? 'idle',
      timestamp,
    })

    // Broadcast bottle FSM state + port status to kiosk SSE clients
    const portStatus = await getPortStatus(kioskId)
    broadcastToKiosk(String(kioskId), {
      type: 'ports',
      ports: portStatus,
      bottleAtEntrance: bottle_at_entrance ?? false,
      fsmState: fsm_state ?? 'idle',
    })

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

export default router
