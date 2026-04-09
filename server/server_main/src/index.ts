import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'

import { config } from './config'
import { errorHandler } from './middleware/errorHandler'
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

// Log exact value at startup so we can diagnose mismatches from Render logs
console.log(`[CORS] Raw ALLOWED_ORIGINS env: "${process.env.ALLOWED_ORIGINS ?? '(not set)'}"`)
console.log(`[CORS] Parsed allowlist (${allowedOrigins.length}): ${allowedOrigins.join(' | ')}`)

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // No origin = same-origin request, curl, or mobile app — always allow
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    // IMPORTANT: use callback(null, false) NOT callback(new Error(...))
    // Throwing an error routes through the Express error handler which responds
    // with a 500 that has NO CORS headers — the browser then misreports this
    // as a CORS error, hiding the real cause.
    console.warn(`[CORS] Rejected: "${origin}" not in [${allowedOrigins.join(', ')}]`)
    return callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}

// Handle OPTIONS preflight for ALL routes BEFORE other middleware
// Without this explicit handler, preflight on some routes can fall through
app.options('*', cors(corsOptions))
app.use(cors(corsOptions))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  const ts = new Date().toISOString()
  console.log(`[${ts}] ${req.method} ${req.path}`)
  next()
})

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  console.log('[Health] ping')
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRouter)
app.use('/api/users',   usersRouter)
app.use('/api/kiosk',   kioskRouter)
app.use('/api/charging', chargingRouter)
app.use('/api/devices', devicesRouter)
app.use('/api/admin',   adminRouter)

app.use(errorHandler)

// ── Start ─────────────────────────────────────────────────────────────────────
runMigrations()

autoSeed()
  .then(() => {
    app.listen(config.PORT, () => {
      console.log('─────────────────────────────────────────')
      console.log(`  EcoCharge API  •  port ${config.PORT}`)
      console.log(`  ENV            •  ${config.NODE_ENV}`)
      console.log(`  Allowed origins: ${allowedOrigins.join(', ')}`)
      console.log('─────────────────────────────────────────')
    })
  })
  .catch((err) => {
    console.error('[Startup] Seed failed — aborting.', err)
    process.exit(1)
  })

export default app
