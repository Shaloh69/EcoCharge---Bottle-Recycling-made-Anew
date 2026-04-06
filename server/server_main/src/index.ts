import express, { Request, Response } from 'express'
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
// Parse the comma-separated allowlist from env.
// origin: '*' + credentials: true is rejected by all modern browsers, so we
// use an explicit allowlist instead.
const allowedOrigins = config.ALLOWED_ORIGINS
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin (no Origin header) and any listed origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,           // cache preflight for 24 h
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }))

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/kiosk', kioskRouter)
app.use('/api/charging', chargingRouter)
app.use('/api/devices', devicesRouter)
app.use('/api/admin', adminRouter)

app.use(errorHandler)

app.listen(config.PORT, () => {
  console.log(`EcoCharge server running on port ${config.PORT}`)
})

export default app
