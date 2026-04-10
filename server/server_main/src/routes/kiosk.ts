import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../prisma'
import { requireAuth } from '../middleware/auth'
import { config } from '../config'
import { creditsForVolume, awardCredits } from '../services/creditService'
import { queueCommand } from '../services/commandService'
import { addKioskClient, sseHeaders } from '../services/sseService'
import { log } from '../logger'
import { AuthRequest } from '../types'

const router = Router()

// QR pending map: token → { userId, sessionId, user, expiresAt }
const _qrPending = new Map<string, { userId: number; sessionId: number; user: object; expiresAt: number }>()

// Port status helper (reused by SSE and REST)
async function getPortStatus(kioskId: number) {
  const latest = await prisma.deviceTelemetry.findFirst({
    where:   { kioskId },
    orderBy: { timestamp: 'desc' },
  })

  let ports: Array<{ voltage?: number; current?: number; relay_on?: boolean }> = []
  if (latest?.portData) {
    try { ports = JSON.parse(latest.portData) } catch { ports = [] }
  }

  const results = []
  for (let portNumber = 1; portNumber <= 4; portNumber++) {
    const portData     = ports[portNumber - 1] ?? {}
    const activeSession = await prisma.chargingSession.findFirst({
      where: { kioskId, portNumber, status: 'active' },
    })

    let remainingSeconds: number | null = null
    if (activeSession) {
      const elapsed = Math.floor((Date.now() - activeSession.startedAt.getTime()) / 1000)
      remainingSeconds = Math.max(0, activeSession.durationSeconds - elapsed)
    }

    results.push({
      port:              portNumber,
      available:         !activeSession,
      relay_on:          portData.relay_on ?? false,
      voltage:           portData.voltage  ?? 0,
      current:           portData.current  ?? 0,
      watts:             (portData.voltage ?? 0) * (portData.current ?? 0),
      remaining_seconds: remainingSeconds,
    })
  }
  return results
}

// POST /sessions
const createSessionSchema = z.object({
  kiosk_id: z.number().int().positive(),
})

router.post('/sessions', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = createSessionSchema.parse(req.body)
    log.kiosk(`Session CREATE — user #${req.userId} → kiosk #${body.kiosk_id}`)

    const session = await prisma.kioskSession.create({
      data: { userId: req.userId!, kioskId: body.kiosk_id },
    })
    log.kiosk(`Session #${session.id} created — user #${req.userId} kiosk #${body.kiosk_id}`)

    res.status(201).json({
      id:         session.id,
      user_id:    session.userId,
      kiosk_id:   session.kioskId,
      started_at: session.startedAt,
      ended_at:   session.endedAt,
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /sessions/:id
router.delete('/sessions/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id)
    log.kiosk(`Session END #${id} — user #${req.userId}`)

    const session = await prisma.kioskSession.findFirst({
      where: { id, userId: req.userId! },
    })
    if (!session) {
      log.kioskWarn(`Session #${id} not found for user #${req.userId}`)
      res.status(404).json({ error: 'session not found' }); return
    }

    const updated = await prisma.kioskSession.update({
      where: { id },
      data:  { endedAt: new Date() },
    })
    log.kiosk(`Session #${id} ended`)

    res.json({
      id:         updated.id,
      user_id:    updated.userId,
      kiosk_id:   updated.kioskId,
      started_at: updated.startedAt,
      ended_at:   updated.endedAt,
    })
  } catch (err) {
    next(err)
  }
})

// POST /deposits  (legacy — kept for backward compatibility)
const depositSchema = z.object({
  session_id: z.number().int().positive(),
  brand:      z.string().optional(),
  volume_ml:  z.number().int().positive().optional(),
  condition:  z.enum(['perfect', 'imperfect']).optional(),
  confidence: z.number().optional(),
})

router.post('/deposits', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = depositSchema.parse(req.body)
    log.kiosk(`Deposit (legacy) — user #${req.userId} session #${body.session_id} brand=${body.brand ?? '?'} vol=${body.volume_ml ?? '?'}mL`)

    const session = await prisma.kioskSession.findFirst({
      where: { id: body.session_id, userId: req.userId! },
    })
    if (!session) {
      log.kioskWarn(`Deposit failed — session #${body.session_id} not found for user #${req.userId}`)
      res.status(404).json({ error: 'session not found' }); return
    }

    const creditsAwarded = body.volume_ml ? await creditsForVolume(body.volume_ml) : 0
    log.kiosk(`Deposit — creditsAwarded=${creditsAwarded} for ${body.volume_ml ?? '?'}mL`)

    const deposit = await prisma.bottleDeposit.create({
      data: {
        sessionId:      body.session_id,
        brand:          body.brand     ?? null,
        volumeMl:       body.volume_ml ?? null,
        condition:      body.condition ?? null,
        confidence:     body.confidence ?? null,
        creditsAwarded,
        status:         'confirmed',
      },
    })

    const transaction  = creditsAwarded > 0
      ? await awardCredits(req.userId!, creditsAwarded, 'bottle_deposit', deposit.id)
      : null
    const updatedUser  = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } })
    await queueCommand(session.kioskId, 'open_conveyor', { deposit_id: deposit.id })
    log.kiosk(`Deposit #${deposit.id} confirmed — open_conveyor queued for kiosk #${session.kioskId}, credits=${creditsAwarded}`)

    res.status(201).json({
      deposit: {
        id:              deposit.id,
        session_id:      deposit.sessionId,
        brand:           deposit.brand,
        volume_ml:       deposit.volumeMl,
        condition:       deposit.condition,
        confidence:      deposit.confidence,
        credits_awarded: deposit.creditsAwarded,
        status:          deposit.status,
        timestamp:       deposit.timestamp,
      },
      credits_awarded: creditsAwarded,
      new_balance:     updatedUser.creditBalance,
      transaction,
    })
  } catch (err) {
    next(err)
  }
})

// ── Bottle FSM routes ──────────────────────────────────────────────────────────

const bottleApproveSchema = z.object({
  session_id: z.number().int().positive(),
  brand:      z.string().optional(),
  volume_ml:  z.number().int().positive().optional(),
  condition:  z.enum(['perfect', 'imperfect']).optional(),
  confidence: z.number().optional(),
})

// POST /bottle/approve — AI approved. Create pending deposit, queue approve_bottle.
router.post('/bottle/approve', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = bottleApproveSchema.parse(req.body)
    log.kiosk(
      `Bottle APPROVE — user #${req.userId} session #${body.session_id} ` +
      `brand=${body.brand ?? '?'} vol=${body.volume_ml ?? '?'}mL ` +
      `cond=${body.condition ?? '?'} conf=${body.confidence ?? '?'}`,
    )

    const session = await prisma.kioskSession.findFirst({
      where: { id: body.session_id, userId: req.userId! },
    })
    if (!session) {
      log.kioskWarn(`Bottle approve failed — session #${body.session_id} not found for user #${req.userId}`)
      res.status(404).json({ error: 'session not found' }); return
    }

    const creditsAwarded = body.volume_ml ? await creditsForVolume(body.volume_ml) : 0
    log.kiosk(`Bottle APPROVE — creditsPending=${creditsAwarded}, queuing approve_bottle for kiosk #${session.kioskId}`)

    const deposit = await prisma.bottleDeposit.create({
      data: {
        sessionId:      body.session_id,
        brand:          body.brand     ?? null,
        volumeMl:       body.volume_ml ?? null,
        condition:      body.condition ?? null,
        confidence:     body.confidence ?? null,
        creditsAwarded,
        status:         'pending_bin',
      },
    })

    await queueCommand(session.kioskId, 'approve_bottle', { deposit_id: deposit.id })
    log.kiosk(`Deposit #${deposit.id} created (pending_bin) — approve_bottle queued for kiosk #${session.kioskId}`)

    res.status(201).json({
      deposit_id:      deposit.id,
      status:          'pending_bin',
      credits_pending: creditsAwarded,
    })
  } catch (err) {
    next(err)
  }
})

// POST /bottle/reject — AI rejected. Queue reject_bottle so ESP32 reverses belt.
router.post('/bottle/reject', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = z.object({ session_id: z.number().int().positive() }).parse(req.body)
    log.kiosk(`Bottle REJECT — user #${req.userId} session #${body.session_id}`)

    const session = await prisma.kioskSession.findFirst({
      where: { id: body.session_id, userId: req.userId! },
    })
    if (!session) {
      log.kioskWarn(`Bottle reject failed — session #${body.session_id} not found for user #${req.userId}`)
      res.status(404).json({ error: 'session not found' }); return
    }

    await queueCommand(session.kioskId, 'reject_bottle', {})
    log.kiosk(`reject_bottle queued for kiosk #${session.kioskId}`)

    res.json({ rejected: true })
  } catch (err) {
    next(err)
  }
})

// POST /qr-link
const qrLinkSchema = z.object({
  session_token: z.string().min(1),
  kiosk_id:      z.number().int().positive(),
})

router.post('/qr-link', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = qrLinkSchema.parse(req.body)
    log.kiosk(`QR-LINK — user #${req.userId} → kiosk #${body.kiosk_id}`)

    const kiosk = await prisma.kiosk.findUnique({ where: { id: body.kiosk_id } })
    if (!kiosk) {
      log.kioskWarn(`QR-LINK failed — kiosk #${body.kiosk_id} not found`)
      res.status(404).json({ error: 'kiosk not found' }); return
    }

    const session = await prisma.kioskSession.create({
      data: { userId: req.userId!, kioskId: body.kiosk_id },
    })
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } })
    log.kiosk(`QR-LINK — session #${session.id} created, token stored (expires 5m)`)

    _qrPending.set(body.session_token, {
      userId:    req.userId!,
      sessionId: session.id,
      user: {
        id:             user.id,
        name:           user.name,
        email:          user.email,
        credit_balance: user.creditBalance,
        is_admin:       user.isAdmin,
      },
      expiresAt: Date.now() + 5 * 60 * 1000,
    })

    res.json({
      session_id: session.id,
      kiosk: {
        id:       kiosk.id,
        name:     kiosk.name,
        location: kiosk.location,
        status:   kiosk.status,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /qr-status
router.get('/qr-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.query.token as string
    if (!token) { res.status(400).json({ error: 'token required' }); return }

    const now = Date.now()
    for (const [key, val] of _qrPending.entries()) {
      if (val.expiresAt < now) _qrPending.delete(key)
    }

    const entry = _qrPending.get(token)
    if (!entry) {
      log.kiosk('QR-STATUS — token not found or expired')
      res.json({ linked: false }); return
    }

    _qrPending.delete(token)

    const user = await prisma.user.findUnique({ where: { id: entry.userId } })
    if (!user) {
      log.kioskWarn(`QR-STATUS — user #${entry.userId} not found`)
      res.json({ linked: false }); return
    }

    log.kiosk(`QR-STATUS — linked! user #${user.id} (${user.email}) session #${entry.sessionId}`)

    const access_token = jwt.sign(
      { sub: user.id.toString(), isAdmin: user.isAdmin },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions,
    )

    res.json({ linked: true, access_token, session_id: entry.sessionId, user: entry.user })
  } catch (err) {
    next(err)
  }
})

// GET /list
router.get('/list', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const kiosks = await prisma.kiosk.findMany({ orderBy: { name: 'asc' } })
    res.json(kiosks.map(k => ({
      id:           k.id,
      name:         k.name,
      location:     k.location,
      status:       k.status,
      last_seen_at: k.lastSeenAt,
      created_at:   k.createdAt,
    })))
  } catch (err) {
    next(err)
  }
})

// GET /:id/ports
router.get('/:id/ports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const kioskId = parseInt(req.params.id)
    const kiosk   = await prisma.kiosk.findUnique({ where: { id: kioskId } })
    if (!kiosk) { res.status(404).json({ error: 'kiosk not found' }); return }
    res.json(await getPortStatus(kioskId))
  } catch (err) {
    next(err)
  }
})

// GET /:id/sse
router.get('/:id/sse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const kioskId = parseInt(req.params.id)
    const kiosk   = await prisma.kiosk.findUnique({ where: { id: kioskId } })
    if (!kiosk) { res.status(404).json({ error: 'kiosk not found' }); return }

    log.kiosk(`SSE client connected → kiosk #${kioskId} (${kiosk.name})`)
    sseHeaders(res)
    addKioskClient(String(kioskId), res)

    req.on('close', () => log.kiosk(`SSE client disconnected — kiosk #${kioskId}`))

    const portStatus = await getPortStatus(kioskId)
    res.write(`data: ${JSON.stringify({ type: 'ports', ports: portStatus })}\n\n`)
  } catch (err) {
    next(err)
  }
})

export { getPortStatus }
export default router
