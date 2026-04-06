import { Response, NextFunction } from 'express'
import crypto from 'crypto'
import { config } from '../config'
import { DeviceRequest } from '../types'

export function requireDeviceKey(req: DeviceRequest, res: Response, next: NextFunction): void {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()

  // Timing-safe comparison prevents brute-force timing attacks
  const valid =
    token.length > 0 &&
    token.length === config.DEVICE_API_KEY.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(config.DEVICE_API_KEY))

  if (!valid) {
    res.status(401).json({ error: 'unauthorized' }); return
  }
  next()
}
