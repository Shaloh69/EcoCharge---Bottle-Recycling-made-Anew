import { Router, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import prisma from '../prisma'
import { requireAuth } from '../middleware/auth'
import { config } from '../config'
import { AuthRequest } from '../types'

const router = Router()

const supabase = config.SUPABASE_URL && config.SUPABASE_SERVICE_KEY
  ? createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
  : null

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5_000_000 },
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } })
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profile_picture_url: user.profilePictureUrl,
      credit_balance: user.creditBalance,
      is_admin: user.isAdmin,
      qr_code: user.qrCode,
      created_at: user.createdAt,
    })
  } catch (err) {
    next(err)
  }
})

router.get('/me/credits', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } })
    res.json({ credit_balance: user.creditBalance })
  } catch (err) {
    next(err)
  }
})

router.get('/me/deposits', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.kioskSession.findMany({
      where: { userId: req.userId! },
      select: { id: true },
    })
    const sessionIds = sessions.map(s => s.id)
    const deposits = await prisma.bottleDeposit.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { timestamp: 'desc' },
    })
    res.json(deposits.map(d => ({
      id: d.id,
      session_id: d.sessionId,
      brand: d.brand,
      volume_ml: d.volumeMl,
      condition: d.condition,
      confidence: d.confidence,
      credits_awarded: d.creditsAwarded,
      timestamp: d.timestamp,
    })))
  } catch (err) {
    next(err)
  }
})

router.get('/me/transactions', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: req.userId! },
      orderBy: { timestamp: 'desc' },
      take: 50,
    })
    res.json(transactions.map(t => ({
      id: t.id,
      user_id: t.userId,
      type: t.type,
      amount: t.amount,
      balance_after: t.balanceAfter,
      ref_type: t.refType,
      ref_id: t.refId,
      timestamp: t.timestamp,
    })))
  } catch (err) {
    next(err)
  }
})

router.post(
  '/me/avatar',
  requireAuth,
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) { res.status(400).json({ error: 'no file uploaded' }); return }
      if (!supabase) { res.status(503).json({ error: 'storage not configured' }); return }

      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'
      const filePath = `avatars/${req.userId!}${ext}`

      const { error: uploadError } = await supabase.storage
        .from(config.SUPABASE_BUCKET)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        })

      if (uploadError) throw new Error(uploadError.message)

      const { data: publicUrlData } = supabase.storage
        .from(config.SUPABASE_BUCKET)
        .getPublicUrl(filePath)

      const profilePictureUrl = publicUrlData.publicUrl

      await prisma.user.update({
        where: { id: req.userId! },
        data: { profilePictureUrl },
      })

      res.json({ profile_picture_url: profilePictureUrl })
    } catch (err) {
      next(err)
    }
  }
)

export default router
