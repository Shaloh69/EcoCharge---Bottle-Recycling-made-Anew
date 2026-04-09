import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { requireAuth } from '../middleware/auth'
import { spendCredits } from '../services/creditService'
import { queueCommand } from '../services/commandService'
import { calcDurationSeconds } from '../services/chargingService'
import { AuthRequest } from '../types'

const router = Router()

function sessionToJson(s: {
  id: number
  userId: number
  kioskId: number
  portNumber: number
  creditsUsed: number
  durationSeconds: number
  wattSnapshot: number | null
  startedAt: Date
  endedAt: Date | null
  status: string
}) {
  return {
    id: s.id,
    user_id: s.userId,
    kiosk_id: s.kioskId,
    port_number: s.portNumber,
    credits_used: s.creditsUsed,
    duration_seconds: s.durationSeconds,
    watt_snapshot: s.wattSnapshot,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    status: s.status,
  }
}

const startSchema = z.object({
  kiosk_id: z.number().int().positive(),
  port_number: z.number().int().min(1).max(4),
  credits: z.number().int().positive(),
})

// POST /start
router.post('/start', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = startSchema.parse(req.body)
    console.log(`[Charging] START — user #${req.userId} kiosk #${body.kiosk_id} port #${body.port_number} credits=${body.credits}`)

    // Check port not already active
    const activeOnPort = await prisma.chargingSession.findFirst({
      where: { kioskId: body.kiosk_id, portNumber: body.port_number, status: 'active' },
    })
    if (activeOnPort) {
      console.warn(`[Charging] START failed — kiosk #${body.kiosk_id} port #${body.port_number} already in use`)
      res.status(409).json({ error: 'port already in use' }); return
    }

    // Check user has enough credits
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } })
    if (user.creditBalance < body.credits) {
      console.warn(`[Charging] START failed — user #${req.userId} insufficient credits (has ${user.creditBalance}, needs ${body.credits})`)
      res.status(400).json({ error: 'insufficient credits' }); return
    }

    // Calculate duration from telemetry
    const { durationSeconds, wattSnapshot } = await calcDurationSeconds(
      body.kiosk_id, body.port_number, body.credits
    )
    console.log(`[Charging] START — duration=${durationSeconds}s watt=${wattSnapshot ?? 0}W`)

    // Create charging session
    const chargingSession = await prisma.chargingSession.create({
      data: {
        userId: req.userId!,
        kioskId: body.kiosk_id,
        portNumber: body.port_number,
        creditsUsed: body.credits,
        durationSeconds,
        wattSnapshot,
        status: 'active',
      },
    })

    // Deduct credits
    const transaction = await spendCredits(req.userId!, body.credits, 'charging_session', chargingSession.id)

    // Queue activate command to ESP32
    await queueCommand(body.kiosk_id, 'activate_port', {
      port: body.port_number,
      duration_seconds: durationSeconds,
    })
    console.log(`[Charging] Session #${chargingSession.id} started — activate_port queued for kiosk #${body.kiosk_id} port #${body.port_number}`)

    res.status(201).json({
      charging_session: sessionToJson(chargingSession),
      new_balance: transaction.balanceAfter,
    })
  } catch (err) {
    next(err)
  }
})

// POST /stop/:id
router.post('/stop/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id)
    console.log(`[Charging] STOP — user #${req.userId} session #${id}`)

    const session = await prisma.chargingSession.findFirst({
      where: { id, userId: req.userId!, status: 'active' },
    })
    if (!session) { console.warn(`[Charging] STOP failed — session #${id} not found or not active for user #${req.userId}`); res.status(404).json({ error: 'active session not found' }); return }

    const updated = await prisma.chargingSession.update({
      where: { id },
      data: { status: 'interrupted', endedAt: new Date() },
    })

    await queueCommand(session.kioskId, 'deactivate_port', { port: session.portNumber })
    console.log(`[Charging] Session #${id} interrupted — deactivate_port queued for kiosk #${session.kioskId} port #${session.portNumber}`)

    res.json(sessionToJson(updated))
  } catch (err) {
    next(err)
  }
})

// GET /active
router.get('/active', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.chargingSession.findMany({
      where: { userId: req.userId!, status: 'active' },
      orderBy: { startedAt: 'desc' },
    })
    res.json(sessions.map(sessionToJson))
  } catch (err) {
    next(err)
  }
})

export default router
