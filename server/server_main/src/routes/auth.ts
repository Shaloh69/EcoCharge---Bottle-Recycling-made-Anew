import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../prisma'
import { config } from '../config'
import { User } from '@prisma/client'

const router = Router()

function userToJson(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profile_picture_url: user.profilePictureUrl,
    credit_balance: user.creditBalance,
    is_admin: user.isAdmin,
    created_at: user.createdAt,
  }
}

function signTokens(user: User) {
  const access_token = jwt.sign(
    { sub: user.id.toString(), isAdmin: user.isAdmin },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
  )
  const refresh_token = jwt.sign(
    { sub: user.id.toString(), type: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
  )
  return { access_token, refresh_token }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
})

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body)
    console.log(`[Auth] LOGIN attempt: ${body.email}`)
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) {
      console.warn(`[Auth] LOGIN failed — user not found: ${body.email}`)
      res.status(401).json({ error: 'invalid credentials' }); return
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) {
      console.warn(`[Auth] LOGIN failed — wrong password: ${body.email}`)
      res.status(401).json({ error: 'invalid credentials' }); return
    }
    console.log(`[Auth] LOGIN success — user #${user.id} (${user.email}) admin=${user.isAdmin}`)
    const tokens = signTokens(user)
    res.json({ ...tokens, user: userToJson(user) })
  } catch (err) {
    next(err)
  }
})

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body)
    console.log(`[Auth] REGISTER attempt: ${body.email}`)
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      console.warn(`[Auth] REGISTER failed — email already exists: ${body.email}`)
      res.status(409).json({ error: 'email already registered' }); return
    }
    const passwordHash = await bcrypt.hash(body.password, 12)
    const qrCode = crypto.randomBytes(16).toString('hex')
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, phone: body.phone ?? null, passwordHash, qrCode },
    })
    console.log(`[Auth] REGISTER success — user #${user.id} (${user.email})`)
    const tokens = signTokens(user)
    res.status(201).json({ ...tokens, user: userToJson(user) })
  } catch (err) {
    next(err)
  }
})

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = refreshSchema.parse(req.body)
    let payload: { sub: string; type?: string }
    try {
      payload = jwt.verify(body.refresh_token, config.JWT_SECRET) as { sub: string; type?: string }
    } catch {
      console.warn('[Auth] REFRESH failed — invalid refresh token')
      res.status(401).json({ error: 'invalid refresh token' }); return
    }
    if (payload.type !== 'refresh') {
      console.warn('[Auth] REFRESH failed — wrong token type')
      res.status(401).json({ error: 'invalid token type' }); return
    }
    const user = await prisma.user.findUnique({ where: { id: parseInt(payload.sub) } })
    if (!user) {
      console.warn(`[Auth] REFRESH failed — user #${payload.sub} not found`)
      res.status(401).json({ error: 'user not found' }); return
    }
    console.log(`[Auth] REFRESH success — user #${user.id}`)
    const access_token = jwt.sign(
      { sub: user.id.toString(), isAdmin: user.isAdmin },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
    )
    res.json({ access_token })
  } catch (err) {
    next(err)
  }
})

export default router
