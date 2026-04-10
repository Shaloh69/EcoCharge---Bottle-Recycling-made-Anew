import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'

import { config } from './config'
import { errorHandler } from './middleware/errorHandler'
import { log, printBanner } from './logger'
import authRouter from './routes/auth'
import usersRouter from './routes/users'
import kioskRouter from './routes/kiosk'
import chargingRouter from './routes/charging'
import devicesRouter from './routes/devices'
import adminRouter from './routes/admin'
import { runMigrations, autoSeed } from './startup'

const app = express()

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = config.ALLOWED_ORIGINS
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

log.cors(`Raw ALLOWED_ORIGINS: "${process.env.ALLOWED_ORIGINS ?? '(not set)'}"`)
log.cors(`Parsed allowlist (${allowedOrigins.length}): ${allowedOrigins.join(' | ')}`)

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    log.warn('CORS', `Rejected origin: "${origin}"`)
    return callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}

app.options('*', cors(corsOptions))
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => log.request(req.method, req.path, res.statusCode, Date.now() - start))
  next()
})

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  log.health('ping')
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRouter)
app.use('/api/users',    usersRouter)
app.use('/api/kiosk',    kioskRouter)
app.use('/api/charging', chargingRouter)
app.use('/api/devices',  devicesRouter)
app.use('/api/admin',    adminRouter)

app.use(errorHandler)

// ── Start — bind port first so Render detects it, then migrate + seed ─────────
app.listen(config.PORT, () => {
  printBanner(config.PORT, config.NODE_ENV, allowedOrigins)
})

runMigrations()
  .then(() => autoSeed())
  .then(() => log.startup('Ready ✔'))
  .catch((err) => {
    log.error('Startup', `Fatal error: ${err}`)
    process.exit(1)
  })
