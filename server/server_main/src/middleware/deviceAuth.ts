import { Response, NextFunction } from 'express'
import { config } from '../config'
import { DeviceRequest } from '../types'

export function requireDeviceKey(req: DeviceRequest, res: Response, next: NextFunction): void {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (token !== config.DEVICE_API_KEY) {
    res.status(401).json({ error: 'unauthorized' }); return
  }
  next()
}
