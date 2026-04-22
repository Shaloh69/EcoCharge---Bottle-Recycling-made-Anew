import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { requireDeviceKey } from '../middleware/deviceAuth'
import { getPendingCommands, ackCommand, queueCommand } from '../services/commandService'
import { broadcastToAdmin, broadcastToKiosk } from '../services/sseService'
import { getPortStatus } from './kiosk'
import { awardCredits } from '../services/creditService'
import { log } from '../logger'
import { DeviceRequest } from '../types'

const router = Router()
router.use(requireDeviceKey)

async function touchKiosk(kioskId: number) {
  return prisma.kiosk.update({
    where: { id: kioskId },
    data: { status: 'online', lastSeenAt: new Date() },
  })
}

// GET /commands
router.get('/commands', async (req: DeviceRequest, res: Response, next: NextFunction) => {
  try {
    const kioskId = req.kiosk!.id

    await touchKiosk(kioskId)

    const commands = await getPendingCommands(kioskId)
    if (commands.length > 0) {
      log.device(`kiosk #${kioskId} poll — ${commands.length} pending command(s): ${commands.map(c => c.commandType).join(', ')}`)
    }

    res.json({
      commands: commands.map(c => ({
        id:           c.id,
        command_type: c.commandType,
        payload:      c.payload ? (() => { try { return JSON.parse(c.payload!) } catch { return {} } })() : {},
        status:       c.status,
        created_at:   c.createdAt,
        acked_at:     c.ackedAt,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// POST /commands/:id/ack
router.post('/commands/:id/ack', async (req: DeviceRequest, res: Response, next: NextFunction) => {
  try {
    const commandId = parseInt(req.params.id)
    const kioskId   = req.kiosk!.id
    log.device(`kiosk #${kioskId} ACK command #${commandId}`)
    await ackCommand(commandId, kioskId)
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
  kiosk_id:           z.number().int().positive().optional(),
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
      ports     = [],
      bin_level,
      ultrasonic,
      bottle_at_entrance,
      bottle_in_bin,
      fsm_state,
    } = body
    const kioskId = req.kiosk!.id

    await touchKiosk(kioskId)

    await prisma.deviceTelemetry.create({
      data: {
        kioskId,
        portData: JSON.stringify(ports),
        binLevel: bin_level ?? null,
      },
    })

    const activePorts = ports.filter(p => p.relay_on).length
    log.device(
      `kiosk #${kioskId} telemetry — ` +
      `fsm=${fsm_state ?? 'idle'} ` +
      `bin=${bin_level ?? '?'}% ` +
      `ports=${activePorts} active ` +
      `entrance=${bottle_at_entrance ?? false} ` +
      `inBin=${bottle_in_bin ?? false}`,
    )

    // Auto-complete expired charging sessions
    const activeSessions = await prisma.chargingSession.findMany({
      where: { kioskId, status: 'active' },
    })

    for (const session of activeSessions) {
      const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
      if (elapsed >= session.durationSeconds) {
        log.charging(`kiosk #${kioskId} — session #${session.id} expired (port ${session.portNumber}), auto-completing`)
        await prisma.chargingSession.update({
          where: { id: session.id },
          data:  { status: 'completed', endedAt: new Date() },
        })
        await queueCommand(kioskId, 'deactivate_port', { port: session.portNumber })
        log.charging(`kiosk #${kioskId} — queued deactivate_port for port ${session.portNumber}`)
      }
    }

    // ── Bin confirmation — award credits when bottle lands ────────────────────
    if (bottle_in_bin === true) {
      log.device(`[Stage 5] bottle_in_bin=true received from ESP32 — kiosk #${kioskId}, looking for pending deposit`)

      const pendingDeposit = await prisma.bottleDeposit.findFirst({
        where:   { status: 'pending_bin', session: { kioskId } },
        include: { session: true },
        orderBy: { timestamp: 'desc' },
      })

      if (pendingDeposit) {
        log.device(`[Stage 5] Confirming deposit #${pendingDeposit.id} — ${pendingDeposit.creditsAwarded} credits → user #${pendingDeposit.session.userId}`)

        await prisma.bottleDeposit.update({
          where: { id: pendingDeposit.id },
          data:  { status: 'confirmed' },
        })

        if (pendingDeposit.creditsAwarded > 0) {
          await awardCredits(
            pendingDeposit.session.userId,
            pendingDeposit.creditsAwarded,
            'bottle_deposit',
            pendingDeposit.id,
          )
          log.device(`kiosk #${kioskId} — awarded ${pendingDeposit.creditsAwarded} credits to user #${pendingDeposit.session.userId}`)
        }

        broadcastToKiosk(String(kioskId), {
          type:            'bottleInBin',
          confirmed:       true,
          deposit_id:      pendingDeposit.id,
          credits_awarded: pendingDeposit.creditsAwarded,
        })
      } else {
        log.deviceWarn(`kiosk #${kioskId} — bottle_in_bin=true but no pending deposit found`)
      }
    } else if (bottle_in_bin === false && fsm_state === 'confirming') {
      log.device(`kiosk #${kioskId} — bin timeout (fsm=confirming), rejecting pending deposit`)

      const pendingDeposit = await prisma.bottleDeposit.findFirst({
        where:   { status: 'pending_bin', session: { kioskId } },
        orderBy: { timestamp: 'desc' },
      })

      if (pendingDeposit) {
        await prisma.bottleDeposit.update({
          where: { id: pendingDeposit.id },
          data:  { status: 'rejected', creditsAwarded: 0 },
        })
        log.deviceWarn(`kiosk #${kioskId} — deposit #${pendingDeposit.id} rejected (bin timeout)`)
      }

      broadcastToKiosk(String(kioskId), {
        type:            'bottleInBin',
        confirmed:       false,
        credits_awarded: 0,
      })
    }

    // Broadcast telemetry to admin SSE
    broadcastToAdmin({
      type:              'telemetry',
      kioskId,
      ports,
      binLevel:          bin_level ?? null,
      ultrasonic:        ultrasonic ?? null,
      bottleAtEntrance:  bottle_at_entrance ?? false,
      bottleInBin:       bottle_in_bin ?? false,
      fsmState:          fsm_state ?? 'idle',
      timestamp:         new Date(),
    })

    // Broadcast port + FSM state to kiosk SSE clients
    const portStatus = await getPortStatus(kioskId)
    broadcastToKiosk(String(kioskId), {
      type:             'ports',
      ports:            portStatus,
      bottleAtEntrance: bottle_at_entrance ?? false,
      fsmState:         fsm_state ?? 'idle',
    })

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

export default router
