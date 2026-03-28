import express from 'express'
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
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

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
