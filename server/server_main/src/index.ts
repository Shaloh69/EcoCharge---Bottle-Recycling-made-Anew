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

const app = express()

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = config.ALLOWED_ORIGINS
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`)
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))

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
app.listen(config.PORT, () => {
  console.log('─────────────────────────────────────────')
  console.log(`  EcoCharge API  •  port ${config.PORT}`)
  console.log(`  ENV            •  ${config.NODE_ENV}`)
  console.log(`  Allowed origins: ${allowedOrigins.join(', ')}`)
  console.log('─────────────────────────────────────────')
})

export default app
